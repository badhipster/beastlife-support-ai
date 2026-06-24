// Gmail ingest poller (PRD 6.1, System Design section 3). Every 60s: pull
// unprocessed inbox mail, dedup, persist, run the pipeline (classify ->
// escalate; draft only when not escalated), then label BL/Processed. Idles
// until a Gmail account is connected.
import { listUnprocessed, getMessage, markProcessed, isGmailConfigured, isConnected } from './gmail';
import {
  gmailMessageSeen, findThreadByGmailId, countInboundForGmailThread,
  ingestInbound, saveClassification, saveEscalation, saveDraft,
} from './db/repo';
import { classifyEmail, generateGroundedDraft } from './pipeline';
import { evaluateEscalation } from './escalation';

let timer: NodeJS.Timeout | null = null;
let running = false;
// Only ingest mail received after the app started watching, so connecting a
// real/personal inbox never vacuums its existing history (and never burns the
// LLM quota on it). New mail sent during a session is picked up normally.
const POLL_SINCE = Math.floor(Date.now() / 1000);

export function startPoller(intervalMs = 60000): void {
  if (timer) return;
  timer = setInterval(() => {
    tick().catch((e) => console.error('Poller tick error:', e));
  }, intervalMs);
  console.log(`Gmail poller armed (every ${intervalMs / 1000}s); only mail after ${new Date(POLL_SINCE * 1000).toISOString()} will be ingested.`);
}

async function tick(): Promise<void> {
  if (running) return; // never overlap ticks
  if (!isGmailConfigured() || !(await isConnected())) return;
  running = true;
  try {
    const ids = await listUnprocessed(10, POLL_SINCE);
    for (const id of ids) {
      try {
        await ingestOne(id);
      } catch (e) {
        console.error(`Failed to ingest ${id}:`, e);
      }
    }
  } finally {
    running = false;
  }
}

async function ingestOne(messageId: string): Promise<void> {
  if (await gmailMessageSeen(messageId)) return; // dedup
  const email = await getMessage(messageId);
  if (!email) return;

  const existingThreadId = await findThreadByGmailId(email.gmailThreadId);
  const threadId = existingThreadId || `THR-G-${email.gmailThreadId.slice(0, 12)}`;
  const contactCount = (await countInboundForGmailThread(email.gmailThreadId)) + 1;

  await ingestInbound(
    {
      id: threadId,
      gmailThreadId: email.gmailThreadId,
      senderEmail: email.fromEmail,
      senderName: email.fromName,
      topic: email.subject,
      brief: email.body.slice(0, 140),
      contactCount,
      hasAttachment: false,
    },
    {
      id: `msg-${messageId}`,
      gmailMessageId: messageId,
      sender: email.fromName,
      content: email.body,
      displayTs: email.date,
    }
  );

  const { classification } = await classifyEmail(email.subject, email.body);
  await saveClassification(threadId, classification.categories, classification.sentiment, classification.intent, 'gemini-2.5-flash');

  const escalation = evaluateEscalation({
    subject: email.subject,
    message: email.body,
    categories: classification.categories,
    sentiment: classification.sentiment,
    contactCount,
    hasAttachment: false,
  });

  if (escalation.escalated) {
    // Escalated mail is flagged for a human, never auto-drafted (guardrail + quota).
    await saveEscalation(threadId, escalation.reasons, escalation.summary);
  } else {
    const draft = await generateGroundedDraft({
      subject: email.subject,
      message: email.body,
      senderName: email.fromName,
      category: classification.categories[0],
      sentiment: classification.sentiment,
    });
    if (!draft.simulated) {
      await saveDraft(threadId, draft.draft, draft.kbRefs, draft.grounded);
    }
  }

  await markProcessed(messageId);
  console.log(`Ingested ${messageId} -> ${threadId} [${classification.categories[0]}/${classification.sentiment}] ${escalation.escalated ? 'ESCALATED: ' + escalation.summary : 'drafted'}`);
}
