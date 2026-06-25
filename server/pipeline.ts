// Shared AI pipeline: classification and KB-grounded drafting. Used by both the
// HTTP endpoints (server.ts) and the Gmail ingest poller (poller.ts) so the
// logic and guardrails live in exactly one place.
import { generateText, generateTextStream } from './llm';
import { retrieveKB, RetrievedChunk } from './kb';

export const CATEGORIES = ['Legal', 'Product Issue', 'Delivery', 'Return/Refund', 'Billing', 'General', 'Feedback', 'Spam'];
export const SENTIMENTS = ['Angry', 'Frustrated', 'Sad', 'Neutral', 'Happy'];

// A retrieved chunk must clear this cosine bar to ground a draft (PRD 7).
export const DRAFT_RELEVANCE_THRESHOLD = 0.6;

// ---------- Classification ----------

export interface Classification {
  categories: string[];
  sentiment: string;
  intent: string;
  // One-line agent-facing summary (what the customer wants + any urgent flag).
  // Used as the thread's AI Brief instead of a raw body excerpt.
  summary: string;
}

// Deterministic fallback when the LLM is unavailable (no key / quota).
export function keywordClassify(subject: string, message: string): Classification {
  const t = `${subject} ${message}`.toLowerCase();
  const has = (kws: string[]) => kws.some((k) => t.includes(k));
  let category = 'General';
  if (has(['lawsuit', 'consumer complaint', 'attorney', 'legal', 'chargeback'])) category = 'Legal';
  else if (has(['refund', 'return', 'money back'])) category = 'Return/Refund';
  else if (has(['delivered', 'delivery', 'tracking', 'courier', 'shipment'])) category = 'Delivery';
  else if (has(['payment', 'invoice', 'gst', 'emi', 'deducted', 'charged'])) category = 'Billing';
  else if (has(['damaged', 'spoiled', 'sour', 'lumps', 'rash', 'itching', 'reaction', 'expired', 'wrong'])) category = 'Product Issue';
  else if (has(['love', 'loved', 'great', 'awesome', 'thank you', 'delicious'])) category = 'Feedback';
  let sentiment = 'Neutral';
  if (has(['furious', 'unacceptable', 'consumer complaint', 'attorney', 'immediately'])) sentiment = 'Angry';
  else if (has(['frustrated', 'still waiting', 'again', 'disappointed'])) sentiment = 'Frustrated';
  else if (has(['sad', 'worried', 'sick', 'rash', 'itching', 'hives'])) sentiment = 'Sad';
  else if (has(['love', 'loved', 'great', 'awesome', 'delicious', 'kudos'])) sentiment = 'Happy';
  return { categories: [category], sentiment, intent: 'Unclassified (offline)', summary: '' };
}

function parseClassification(raw: string): Classification {
  const parsed = JSON.parse(raw);
  const categories = Array.isArray(parsed.categories)
    ? parsed.categories.filter((c: string) => CATEGORIES.includes(c))
    : [];
  return {
    categories: categories.length > 0 ? categories : ['General'],
    sentiment: SENTIMENTS.includes(parsed.sentiment) ? parsed.sentiment : 'Neutral',
    intent: typeof parsed.intent === 'string' ? parsed.intent : '',
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
  };
}

export async function classifyEmail(subject: string, message: string): Promise<{ classification: Classification; simulated: boolean }> {
  const system = `You classify inbound customer support emails for an Indian sports-nutrition brand. Return ONLY JSON.
- categories: array of one or more from exactly this set: ${JSON.stringify(CATEGORIES)}. Use multiple only when genuinely ambiguous.
- sentiment: exactly one of ${JSON.stringify(SENTIMENTS)}.
- intent: a short phrase (max 6 words) for what the customer wants, e.g. "request replacement", "track order", "report adverse reaction".
- summary: one sentence (max 20 words) written for a support agent skimming the queue. Capture what the customer wants AND flag anything urgent (adverse reaction, legal threat, damaged goods). Do NOT just restate the email's first line.`;
  const prompt = `Subject: "${subject || ''}"
Body: "${message}"
Return JSON: { "categories": [...], "sentiment": "...", "intent": "...", "summary": "..." }`;
  try {
    const raw = await generateText({ system, prompt, temperature: 0.1, responseMimeType: 'application/json' });
    return { classification: parseClassification(raw), simulated: false };
  } catch (err) {
    console.warn('Classification failed. Falling back to keyword classifier.', err);
    return { classification: keywordClassify(subject || '', message), simulated: true };
  }
}

// ---------- KB-grounded drafting ----------

export interface KbRef {
  id: string;
  sourceId: string;
  title: string;
  relevanceScore: number;
}

export interface DraftResult {
  draft: string;
  simulated: boolean;
  grounded: boolean;
  kbRefs: KbRef[];
}

export interface GroundedDraftArgs {
  subject?: string;
  message: string;
  senderName?: string;
  category?: string;
  sentiment?: string;
}

function buildDraftSystemPrompt(args: { category?: string; sentiment?: string }): string {
  const { category, sentiment } = args;
  return `You are BeastLife Support AI. You draft replies that a human agent reviews and approves before sending; nothing is ever auto-sent.

Grounding rules (non-negotiable):
- Answer using ONLY the knowledge base excerpts provided in the user message.
- If the excerpts do not contain what you need, do NOT invent policy, prices, order status, tracking, or any facts. Instead, ask the customer a brief clarifying question or tell them you are passing this to a human specialist.
- Never fabricate order data (order IDs, tracking numbers, dates, amounts). Only repeat such details if the customer stated them.

Safety guardrails (apply whenever the email matches, regardless of any label):
- QUALITY COMPLAINT (damaged, wrong item, missing item, expired, leaking, or a product defect): show empathy first, then request evidence before promising any replacement, refund, or escalation. BeastLife accepts a video OR clear photos. The customer has usually already opened the pack (that is how they noticed the problem), so do NOT insist on a full unboxing video they can no longer record. Ask for an unboxing video only if they happen to have one, and clearly offer clear photos of the damage and the packaging as an accepted alternative. Evidence by issue type: damaged / wrong / missing / leaking -> a short video or clear photos of the item and its packaging; expired -> a clear photo of the expiry/MFG area; batch or authentication issue -> a photo of the product showing the batch/authentication label. Tell the customer they can reply to this email or send the evidence to care@beastlife.in. Do not commit to a resolution until the customer provides it.
- LEGAL or REGULATORY (lawsuit, consumer court or complaint forum, attorney/solicitor, chargeback, GDPR, refund threat): do NOT admit fault or liability, and do NOT offer a settlement, refund, or any legal position. Write a brief, calm holding reply that acknowledges receipt and states the matter is being escalated to a human specialist for review.
- HEALTH or ADVERSE REACTION (allergic reaction, rash, itching, illness, side effects, pre-existing condition, medication): lead with empathy, advise the customer to stop using the product and consult a qualified healthcare professional, and give NO medical advice or diagnosis. State that the case is flagged for a human specialist. After the safety guidance, gently ask for the product name and the batch/lot number printed on the pack so the specialist can investigate which batch is involved, but do NOT make any help, response, or next step conditional on receiving it.
- RETURNS: reflect real BeastLife policy only -- returns are requested by email to care@beastlife.in within 2 days of delivery, with the order ID and an unboxing video. Never invent timelines or exceptions.
- Never overpromise refunds, timelines, or exceptions beyond documented policy.

Detected category: ${category || 'unknown'}. Detected sentiment: ${sentiment || 'unknown'}. Adapt tone to the sentiment: empathetic and de-escalating if angry, frustrated, or sad; warm and brief if neutral or happy.

Style: professional, warm, and concise, on-brand for an Indian sports-nutrition brand. Sign off as "BeastLife Support Agent".`;
}

function formatChunks(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return 'No relevant knowledge base excerpts were found for this email.';
  return chunks.map((c, i) => `[${i + 1}] ${c.title} (${c.sourceId}) — ${c.category}\n${c.text}`).join('\n\n');
}

function buildDraftUserPrompt(args: { senderName?: string; subject?: string; message: string; chunks: RetrievedChunk[] }): string {
  const { senderName, subject, message, chunks } = args;
  return `Customer name: ${senderName || 'Valued Customer'}
Email subject: "${subject || '(no subject)'}"
Email body:
"${message}"

Knowledge base excerpts:
${formatChunks(chunks)}

Draft the reply now. If no relevant excerpts were found, ask a clarifying question or hand off to a human rather than guessing.`;
}

function simulatedDraft(args: { senderName?: string; subject?: string; grounded: boolean }): string {
  const { senderName, subject, grounded } = args;
  const ask = grounded
    ? 'A support specialist will review the details and follow up shortly.'
    : 'To make sure we help you correctly, could you share a little more detail about your issue, along with your order ID if it is related to an order?';
  return `Dear ${senderName || 'Valued Customer'},

Thank you for reaching out to BeastLife Support regarding "${subject || 'your enquiry'}". ${ask}

Warm regards,
BeastLife Support Agent
(Draft generated in offline mode.)`;
}

export async function generateGroundedDraft(args: {
  subject?: string;
  message: string;
  senderName?: string;
  category?: string;
  sentiment?: string;
}): Promise<DraftResult> {
  const { subject, message, senderName, category, sentiment } = args;
  const retrieval = await retrieveKB(`${subject || ''} ${message}`.trim(), 4);
  let chunks = retrieval.chunks;

  // For refund/return emails, also pull the actual policy text so the draft
  // grounds on policy (not just similar-sounding complaint FAQs), then merge
  // and keep the best by score.
  const cat = (category || '').toLowerCase();
  if (cat.includes('refund') || cat.includes('return')) {
    const policy = await retrieveKB('BeastLife returns and refunds policy: return window, refund, replacement, exchange, eligibility', 3);
    const byId = new Map<string, RetrievedChunk>();
    [...chunks, ...policy.chunks].forEach((c) => {
      const existing = byId.get(c.id);
      if (!existing || c.relevanceScore > existing.relevanceScore) byId.set(c.id, c);
    });
    chunks = [...byId.values()].sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 5);
  }

  const relevantChunks = chunks.filter((c) => c.relevanceScore >= DRAFT_RELEVANCE_THRESHOLD);
  const grounded = relevantChunks.length > 0;
  const kbRefs = relevantChunks.map((c) => ({ id: c.id, sourceId: c.sourceId, title: c.title, relevanceScore: c.relevanceScore }));
  const system = buildDraftSystemPrompt({ category, sentiment });
  const userPrompt = buildDraftUserPrompt({ senderName, subject, message, chunks: relevantChunks });
  try {
    const draft = await generateText({ system, prompt: userPrompt, temperature: 0.7 });
    return { draft, simulated: false, grounded, kbRefs };
  } catch (apiError) {
    console.warn('Draft generation failed. Falling back to offline simulated draft.', apiError);
    return { draft: simulatedDraft({ senderName, subject, grounded }), simulated: true, grounded, kbRefs };
  }
}

export async function* generateGroundedDraftStream(args: GroundedDraftArgs): AsyncGenerator<string, void, unknown> {
  const { subject, message, senderName, category, sentiment } = args;
  const retrieval = await retrieveKB(`${subject || ''} ${message}`.trim(), 4);
  let chunks = retrieval.chunks;

  const cat = (category || '').toLowerCase();
  if (cat.includes('refund') || cat.includes('return')) {
    const policy = await retrieveKB('BeastLife returns and refunds policy: return window, refund, replacement, exchange, eligibility', 3);
    const byId = new Map<string, RetrievedChunk>();
    [...chunks, ...policy.chunks].forEach((c) => {
      const existing = byId.get(c.id);
      if (!existing || c.relevanceScore > existing.relevanceScore) byId.set(c.id, c);
    });
    chunks = [...byId.values()].sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 5);
  }

  const relevantChunks = chunks.filter((c) => c.relevanceScore >= DRAFT_RELEVANCE_THRESHOLD);
  const grounded = relevantChunks.length > 0;
  
  const system = buildDraftSystemPrompt({ category, sentiment });
  const userPrompt = buildDraftUserPrompt({ senderName, subject, message, chunks: relevantChunks });
  
  try {
    const stream = generateTextStream({ system, prompt: userPrompt, temperature: 0.7 });
    for await (const chunk of stream) {
      yield chunk;
    }
  } catch (apiError) {
    console.warn('Draft stream generation failed. Falling back to offline simulated draft.', apiError);
    const text = simulatedDraft({ senderName, subject, grounded });
    yield text;
  }
}
