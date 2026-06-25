// Data access layer. Every function falls back to the seeded mock data when
// DATABASE_URL is unset, so the app runs before Supabase is connected and the
// rest of the server never branches on DB availability.
import { isDbConfigured, query } from './pool';
import { INITIAL_THREADS, INITIAL_RULES } from '../../src/data/mockData';
import type { EmailThread, Message, SettingsRule } from '../../src/types';
import type { RetrievedChunk } from '../kb';

const THREAD_SELECT = `
  select t.id, t.topic, t.brief, t.category, t.sentiment, t.intent, t.status,
         t.draft_status, t.trigger_reason, t.contact_count, t.order_id,
         t.has_attachment, t.waiting_time, t.assigned_to,
         s.email as sender_email, s.display_name as sender_name, s.vip,
         coalesce(
           json_agg(
             json_build_object('id', m.id, 'sender', m.sender, 'content', m.content,
                               'timestamp', m.display_ts, 'isCustomer', m.is_customer)
             order by m.received_at
           ) filter (where m.id is not null), '[]'
         ) as messages
  from threads t
  left join senders s on s.id = t.sender_id
  left join messages m on m.thread_id = t.id`;

interface ThreadRow {
  id: string;
  topic: string;
  brief: string;
  category: string;
  sentiment: string;
  intent: string | null;
  status: string;
  draft_status: string;
  trigger_reason: string | null;
  contact_count: number;
  order_id: string | null;
  has_attachment: boolean;
  waiting_time: string | null;
  sender_email: string | null;
  sender_name: string | null;
  vip: boolean | null;
  assigned_to: string | null;
  messages: Message[];
}

function rowToThread(r: ThreadRow): EmailThread {
  return {
    id: r.id,
    senderName: r.sender_name || 'Unknown',
    senderEmail: r.sender_email || '',
    topic: r.topic,
    category: r.category || 'General',
    sentiment: (r.sentiment as EmailThread['sentiment']) || 'Neutral',
    brief: r.brief || '',
    draftStatus: (r.draft_status as EmailThread['draftStatus']) || 'Needs action',
    status: (r.status as EmailThread['status']) || 'Open',
    waitingTime: r.waiting_time || '',
    orderId: r.order_id || '',
    contactCount: r.contact_count,
    messages: r.messages || [],
    triggerReason: r.trigger_reason || undefined,
    vip: r.vip || undefined,
    hasAttachment: r.has_attachment || undefined,
    intent: r.intent || undefined,
    assignedTo: r.assigned_to || undefined,
  };
}

// Assign a thread to an agent (claim).
export async function claimThread(threadId: string, assignee: string): Promise<EmailThread | null> {
  if (!isDbConfigured()) return getThread(threadId);
  await query('update threads set assigned_to = $2, updated_at = now() where id = $1', [threadId, assignee]);
  await logEvent('claimed', threadId);
  return getThread(threadId);
}

export async function listThreads(): Promise<EmailThread[]> {
  if (!isDbConfigured()) return INITIAL_THREADS;
  const rows = await query<ThreadRow>(`${THREAD_SELECT} group by t.id, s.email, s.display_name, s.vip order by t.created_at`);
  return rows.map(rowToThread);
}

export async function getThread(id: string): Promise<EmailThread | null> {
  if (!isDbConfigured()) return INITIAL_THREADS.find((t) => t.id === id) || null;
  const rows = await query<ThreadRow>(
    `${THREAD_SELECT} where t.id = $1 group by t.id, s.email, s.display_name, s.vip`,
    [id]
  );
  return rows[0] ? rowToThread(rows[0]) : null;
}

export interface ThreadPatch {
  category?: string;
  sentiment?: string;
  intent?: string;
  status?: string;
  draftStatus?: string;
  triggerReason?: string;
}

const PATCH_COLUMNS: Record<keyof ThreadPatch, string> = {
  category: 'category',
  sentiment: 'sentiment',
  intent: 'intent',
  status: 'status',
  draftStatus: 'draft_status',
  triggerReason: 'trigger_reason',
};

// Persist the read-model fields the UI changes (triage result, escalation).
export async function updateThread(id: string, patch: ThreadPatch): Promise<EmailThread | null> {
  if (!isDbConfigured()) return getThread(id);
  const sets: string[] = [];
  const values: unknown[] = [];
  (Object.keys(patch) as (keyof ThreadPatch)[]).forEach((key) => {
    if (patch[key] !== undefined) {
      values.push(patch[key]);
      sets.push(`${PATCH_COLUMNS[key]} = $${values.length}`);
    }
  });
  if (sets.length > 0) {
    values.push(id);
    await query(`update threads set ${sets.join(', ')}, updated_at = now() where id = $${values.length}`, values);
  }
  return getThread(id);
}

export async function listRules(): Promise<SettingsRule[]> {
  if (!isDbConfigured()) return INITIAL_RULES;
  const rows = await query<any>('select id, title, description, enabled, keywords, icon from rules order by id');
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    enabled: r.enabled,
    keywords: r.keywords || undefined,
    icon: r.icon,
  }));
}

export async function logEvent(type: string, threadId?: string): Promise<void> {
  if (!isDbConfigured()) return;
  await query('insert into analytics_events (type, thread_id) values ($1, $2)', [type, threadId || null]);
}

// pgvector cosine search over kb_chunks. Returns [] when the table is empty so
// kb.ts can fall back to the in-memory index.
export async function searchKbChunks(embedding: number[], k: number): Promise<RetrievedChunk[]> {
  if (!isDbConfigured()) return [];
  const vec = `[${embedding.join(',')}]`;
  const rows = await query<any>(
    `select source_id, title, category, content,
            1 - (embedding <=> $1::vector) as score
     from kb_chunks
     where embedding is not null
     order by embedding <=> $1::vector
     limit $2`,
    [vec, k]
  );
  return rows.map((r) => ({
    id: r.source_id,
    sourceId: r.source_id,
    title: r.title,
    text: r.content,
    category: r.category,
    relevanceScore: Number(Number(r.score).toFixed(4)),
  }));
}

export async function kbChunkCount(): Promise<number> {
  if (!isDbConfigured()) return 0;
  const rows = await query<{ count: string }>('select count(*)::text as count from kb_chunks');
  return parseInt(rows[0]?.count || '0', 10);
}

export async function kbCategoryCounts(): Promise<{ category: string; count: number }[]> {
  if (!isDbConfigured()) return [];
  const rows = await query<{ category: string; count: string }>(
    'select coalesce(category, \'Uncategorized\') as category, count(*)::text as count from kb_chunks group by category order by count desc'
  );
  return rows.map((r) => ({ category: r.category, count: parseInt(r.count, 10) }));
}

// --- Gmail account (single connected inbox in v1) ---

export interface Account {
  email: string;
  refresh_token: string | null;
}

export async function saveAccount(email: string, refreshToken: string | null): Promise<void> {
  if (!isDbConfigured()) return;
  await query(
    `insert into accounts (email, refresh_token) values ($1, $2)
     on conflict (email) do update set
       refresh_token = coalesce(excluded.refresh_token, accounts.refresh_token),
       updated_at = now()`,
    [email, refreshToken]
  );
}

export async function getAccount(): Promise<Account | null> {
  if (!isDbConfigured()) return null;
  // Most recently connected inbox wins, so reconnecting a new account switches to it.
  const rows = await query<Account>('select email, refresh_token from accounts order by updated_at desc, id desc limit 1');
  return rows[0] || null;
}

// --- App users (Google Sign-In) ---

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  picture: string;
  role: string | null;
}

export async function upsertUser(args: { googleSub: string; email: string; name: string; picture: string }): Promise<SessionUser> {
  const rows = await query<SessionUser>(
    `insert into users (google_sub, email, name, picture) values ($1, $2, $3, $4)
     on conflict (google_sub) do update set email = excluded.email, name = excluded.name, picture = excluded.picture, updated_at = now()
     returning id, email, name, picture, role`,
    [args.googleSub, args.email, args.name, args.picture]
  );
  return rows[0];
}

export async function setUserSession(id: number, token: string): Promise<void> {
  await query('update users set session_token = $2, updated_at = now() where id = $1', [id, token]);
}

export async function getUserBySession(token: string): Promise<SessionUser | null> {
  if (!isDbConfigured()) return null;
  const rows = await query<SessionUser>('select id, email, name, picture, role from users where session_token = $1', [token]);
  return rows[0] || null;
}

export async function clearUserSession(token: string): Promise<void> {
  if (!isDbConfigured()) return;
  await query('update users set session_token = null where session_token = $1', [token]);
}

export async function setUserRole(id: number, role: string): Promise<void> {
  await query('update users set role = $2, updated_at = now() where id = $1', [id, role]);
}

// --- Ingest write path (Gmail poller) ---

export interface IngestThread {
  id: string;
  gmailThreadId: string;
  senderEmail: string;
  senderName: string;
  topic: string;
  brief: string;
  contactCount: number;
  hasAttachment: boolean;
}

export interface IngestMessage {
  id: string;
  gmailMessageId: string;
  sender: string;
  content: string;
  displayTs: string;
}

// True if we have already ingested this Gmail message (dedup).
export async function gmailMessageSeen(gmailMessageId: string): Promise<boolean> {
  if (!isDbConfigured()) return false;
  const rows = await query<{ id: string }>('select id from messages where gmail_message_id = $1 limit 1', [gmailMessageId]);
  return rows.length > 0;
}

export async function findThreadByGmailId(gmailThreadId: string): Promise<string | null> {
  if (!isDbConfigured()) return null;
  const rows = await query<{ id: string }>('select id from threads where gmail_thread_id = $1 limit 1', [gmailThreadId]);
  return rows[0]?.id || null;
}

// Insert (or reuse) a thread for an ingested Gmail message and append the message.
export async function ingestInbound(thread: IngestThread, message: IngestMessage): Promise<void> {
  if (!isDbConfigured()) return;
  const sender = await query<{ id: number }>(
    `insert into senders (email, display_name) values ($1, $2)
     on conflict (email) do update set display_name = excluded.display_name
     returning id`,
    [thread.senderEmail, thread.senderName]
  );
  const senderId = sender[0].id;

  await query(
    `insert into threads (id, gmail_thread_id, sender_id, topic, brief, status, draft_status,
                          contact_count, has_attachment, waiting_time)
     values ($1,$2,$3,$4,$5,'Open','Needs action',$6,$7,'just now')
     on conflict (id) do update set contact_count = excluded.contact_count, updated_at = now()`,
    [thread.id, thread.gmailThreadId, senderId, thread.topic, thread.brief, thread.contactCount, thread.hasAttachment]
  );

  await query(
    `insert into messages (id, thread_id, gmail_message_id, sender, direction, content, is_customer, display_ts)
     values ($1,$2,$3,$4,'inbound',$5,true,$6)
     on conflict (gmail_message_id) do nothing`,
    [message.id, thread.id, message.gmailMessageId, message.sender, message.content, message.displayTs]
  );
  await logEvent('received', thread.id);
}

export async function saveClassification(
  threadId: string,
  categories: string[],
  sentiment: string,
  intent: string,
  model: string
): Promise<void> {
  if (!isDbConfigured()) return;
  await query(
    `update threads set category = $2, sentiment = $3, intent = $4, updated_at = now() where id = $1`,
    [threadId, categories[0] || 'General', sentiment, intent]
  );
  await query(
    `insert into classifications (thread_id, categories, sentiment, intent, model) values ($1,$2,$3,$4,$5)`,
    [threadId, categories, sentiment, intent, model]
  );
}

export async function saveEscalation(threadId: string, reasons: string[], summary: string): Promise<void> {
  if (!isDbConfigured()) return;
  await query(`update threads set status = 'Escalated', trigger_reason = $2, updated_at = now() where id = $1`, [threadId, summary]);
  await query(`insert into escalations (thread_id, reasons, summary) values ($1,$2,$3)`, [threadId, reasons, summary]);
  await logEvent('escalated', threadId);
}

export async function saveDraft(threadId: string, body: string, kbRefs: unknown, grounded: boolean): Promise<void> {
  if (!isDbConfigured()) return;
  await query(
    `insert into drafts (thread_id, body, kb_refs, grounded, status) values ($1,$2,$3,$4,'pending')`,
    [threadId, body, JSON.stringify(kbRefs ?? []), grounded]
  );
  await query(`update threads set draft_status = 'Draft ready', updated_at = now() where id = $1`, [threadId]);
  await logEvent('drafted', threadId);
}

// Latest pending draft body for a thread (used by approve-and-send).
export async function latestDraft(threadId: string): Promise<{ id: number; body: string } | null> {
  if (!isDbConfigured()) return null;
  const rows = await query<{ id: number; body: string }>(
    `select id, body from drafts where thread_id = $1 and status <> 'sent' order by created_at desc limit 1`,
    [threadId]
  );
  return rows[0] || null;
}

// Latest pending draft with its grounding refs, for loading into the editor
// when an agent opens a "draft ready" email.
export async function latestDraftFull(
  threadId: string
): Promise<{ body: string; kbRefs: unknown; grounded: boolean } | null> {
  if (!isDbConfigured()) return null;
  const rows = await query<any>(
    `select body, kb_refs, grounded from drafts where thread_id = $1 and status <> 'sent' order by created_at desc limit 1`,
    [threadId]
  );
  const r = rows[0];
  return r ? { body: r.body, kbRefs: r.kb_refs ?? [], grounded: r.grounded } : null;
}

export async function markReplied(threadId: string, draftId: number | null): Promise<void> {
  if (!isDbConfigured()) return;
  await query(`update threads set status = 'Replied', draft_status = 'Sent', updated_at = now() where id = $1`, [threadId]);
  if (draftId) await query(`update drafts set status = 'sent', sent_at = now() where id = $1`, [draftId]);
  await logEvent('sent', threadId);
}

// Count inbound (customer) messages already stored for a Gmail thread — drives
// the "Angry AND 3rd+ contact" escalation rule during ingest.
export async function countInboundForGmailThread(gmailThreadId: string): Promise<number> {
  if (!isDbConfigured()) return 0;
  const rows = await query<{ count: string }>(
    `select count(*)::text as count from messages m join threads t on t.id = m.thread_id
     where t.gmail_thread_id = $1 and m.is_customer = true`,
    [gmailThreadId]
  );
  return parseInt(rows[0]?.count || '0', 10);
}

export interface SendContext {
  gmailThreadId: string | null;
  to: string;
  subject: string;
  inReplyTo: string | null;
}

// Everything needed to send a threaded Gmail reply for a thread.
export async function getSendContext(threadId: string): Promise<SendContext | null> {
  if (!isDbConfigured()) {
    const t = INITIAL_THREADS.find((x) => x.id === threadId);
    return t ? { gmailThreadId: null, to: t.senderEmail, subject: t.topic, inReplyTo: null } : null;
  }
  const rows = await query<any>(
    `select t.gmail_thread_id, t.topic, s.email as sender_email,
            (select m.gmail_message_id from messages m
             where m.thread_id = t.id and m.is_customer = true
             order by m.received_at desc limit 1) as in_reply_to
     from threads t left join senders s on s.id = t.sender_id
     where t.id = $1`,
    [threadId]
  );
  const r = rows[0];
  if (!r) return null;
  return { gmailThreadId: r.gmail_thread_id, to: r.sender_email || '', subject: r.topic, inReplyTo: r.in_reply_to };
}
