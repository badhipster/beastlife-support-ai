// Gmail integration (PRD 6.1, 6.6). OAuth 2.0 + read/label/send via googleapis.
// Configured lazily from env so the app runs without Gmail connected.
import { google, gmail_v1 } from 'googleapis';
import { getAccount, saveAccount } from './db/repo';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
];

export const PROCESSED_LABEL = 'BL/Processed';

export function isGmailConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function redirectUri(): string {
  const base = process.env.APP_URL || 'http://localhost:3000';
  return `${base}/api/auth/google/callback`;
}

function oauthClient() {
  return new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUri());
}

// Step 1: URL to send the user to for consent. offline + consent so we get a
// refresh token we can reuse across restarts.
export function getAuthUrl(): string {
  return oauthClient().generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: SCOPES });
}

// Step 2: exchange the code, persist the refresh token + connected address.
export async function handleCallback(code: string): Promise<string> {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  const profile = await google.gmail({ version: 'v1', auth: client }).users.getProfile({ userId: 'me' });
  const email = profile.data.emailAddress || 'unknown';
  await saveAccount(email, tokens.refresh_token || null);
  return email;
}

// Authenticated Gmail client built from the stored refresh token.
async function gmailClient(): Promise<gmail_v1.Gmail | null> {
  if (!isGmailConfigured()) return null;
  const account = await getAccount();
  if (!account?.refresh_token) return null;
  const client = oauthClient();
  client.setCredentials({ refresh_token: account.refresh_token });
  return google.gmail({ version: 'v1', auth: client });
}

export async function isConnected(): Promise<boolean> {
  const account = await getAccount();
  return Boolean(account?.refresh_token);
}

async function ensureProcessedLabelId(gmail: gmail_v1.Gmail): Promise<string | undefined> {
  const labels = await gmail.users.labels.list({ userId: 'me' });
  const existing = labels.data.labels?.find((l) => l.name === PROCESSED_LABEL);
  if (existing?.id) return existing.id;
  const created = await gmail.users.labels.create({
    userId: 'me',
    requestBody: { name: PROCESSED_LABEL, labelListVisibility: 'labelShow', messageListVisibility: 'show' },
  });
  return created.data.id || undefined;
}

export interface ParsedEmail {
  gmailMessageId: string;
  gmailThreadId: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  body: string;
  date: string;
}

function header(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
}

function decodePart(data?: string | null): string {
  if (!data) return '';
  // Gmail encodes part bodies as base64url (- and _ instead of + and /).
  return Buffer.from(data, 'base64url').toString('utf-8');
}

// Walk the MIME tree for the best text/plain body, falling back to the snippet.
function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) return decodePart(payload.body.data);
  if (payload.parts) {
    for (const part of payload.parts) {
      const found = extractBody(part);
      if (found) return found;
    }
  }
  if (payload.body?.data) return decodePart(payload.body.data);
  return '';
}

function parseFrom(from: string): { name: string; email: string } {
  const match = from.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>/);
  if (match) return { name: match[1].trim() || match[2].trim(), email: match[2].trim() };
  return { name: from.trim(), email: from.trim() };
}

// List inbox messages not yet labelled BL/Processed (the dedup gate). When
// afterEpoch is given, only mail received after that time is returned, so a
// real/personal inbox's existing history is never ingested — only new mail that
// arrives while the app is watching.
export async function listUnprocessed(max = 10, afterEpoch?: number): Promise<string[]> {
  const gmail = await gmailClient();
  if (!gmail) return [];
  const q = `in:inbox -label:${PROCESSED_LABEL}` + (afterEpoch ? ` after:${afterEpoch}` : ' newer_than:7d');
  const res = await gmail.users.messages.list({ userId: 'me', q, maxResults: max });
  return (res.data.messages || []).map((m) => m.id!).filter(Boolean);
}

export async function getMessage(id: string): Promise<ParsedEmail | null> {
  const gmail = await gmailClient();
  if (!gmail) return null;
  const res = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
  const msg = res.data;
  const headers = msg.payload?.headers;
  const from = parseFrom(header(headers, 'From'));
  const body = extractBody(msg.payload).trim() || msg.snippet || '';
  return {
    gmailMessageId: msg.id!,
    gmailThreadId: msg.threadId!,
    fromName: from.name,
    fromEmail: from.email,
    subject: header(headers, 'Subject') || '(no subject)',
    body,
    date: header(headers, 'Date'),
  };
}

export async function markProcessed(messageId: string): Promise<void> {
  const gmail = await gmailClient();
  if (!gmail) return;
  const labelId = await ensureProcessedLabelId(gmail);
  if (!labelId) return;
  await gmail.users.messages.modify({ userId: 'me', id: messageId, requestBody: { addLabelIds: [labelId] } });
}

// Send a reply in the original thread so it threads correctly in Gmail.
export async function sendReply(args: {
  threadId: string;
  to: string;
  subject: string;
  body: string;
  inReplyToMessageId?: string;
}): Promise<void> {
  const gmail = await gmailClient();
  if (!gmail) throw new Error('Gmail not connected');
  const subject = args.subject.startsWith('Re:') ? args.subject : `Re: ${args.subject}`;
  const headers = [
    `To: ${args.to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
  ];
  if (args.inReplyToMessageId) {
    headers.push(`In-Reply-To: ${args.inReplyToMessageId}`, `References: ${args.inReplyToMessageId}`);
  }
  const raw = Buffer.from(`${headers.join('\r\n')}\r\n\r\n${args.body}`)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  await gmail.users.messages.send({ userId: 'me', requestBody: { raw, threadId: args.threadId } });
}
