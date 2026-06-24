// Shared AI pipeline: classification and KB-grounded drafting. Used by both the
// HTTP endpoints (server.ts) and the Gmail ingest poller (poller.ts) so the
// logic and guardrails live in exactly one place.
import { generateText } from './llm';
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
  return { categories: [category], sentiment, intent: 'Unclassified (offline)' };
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
  };
}

export async function classifyEmail(subject: string, message: string): Promise<{ classification: Classification; simulated: boolean }> {
  const system = `You classify inbound customer support emails for an Indian sports-nutrition brand. Return ONLY JSON.
- categories: array of one or more from exactly this set: ${JSON.stringify(CATEGORIES)}. Use multiple only when genuinely ambiguous.
- sentiment: exactly one of ${JSON.stringify(SENTIMENTS)}.
- intent: a short phrase (max 6 words) for what the customer wants, e.g. "request replacement", "track order", "report adverse reaction".`;
  const prompt = `Subject: "${subject || ''}"
Body: "${message}"
Return JSON: { "categories": [...], "sentiment": "...", "intent": "..." }`;
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

function buildDraftSystemPrompt(args: { category?: string; sentiment?: string }): string {
  const { category, sentiment } = args;
  return `You are BeastLife Support AI. You draft replies that a human agent reviews and approves before sending; nothing is ever auto-sent.

Grounding rules (non-negotiable):
- Answer using ONLY the knowledge base excerpts provided in the user message.
- If the excerpts do not contain what you need, do NOT invent policy, prices, order status, tracking, or any facts. Instead, ask the customer a brief clarifying question or tell them you are passing this to a human specialist.
- Never fabricate order data (order IDs, tracking numbers, dates, amounts). Only repeat such details if the customer stated them.

Safety guardrails (apply whenever the email matches, regardless of any label):
- QUALITY COMPLAINT (damaged, wrong item, missing item, expired, leaking, or a product defect): you MUST request the specific evidence BeastLife requires before promising any replacement, refund, or escalation. Evidence by issue type: damaged / wrong item / missing item -> a full unboxing video; expired -> unboxing video plus a clear photo of the expiry date; batch or authentication issue -> a photo of the product showing the batch/authentication label. Do not commit to a resolution until the customer provides it.
- LEGAL or REGULATORY (lawsuit, consumer court or complaint forum, attorney/solicitor, chargeback, GDPR, refund threat): do NOT admit fault or liability, and do NOT offer a settlement, refund, or any legal position. Write a brief, calm holding reply that acknowledges receipt and states the matter is being escalated to a human specialist for review.
- HEALTH or ADVERSE REACTION (allergic reaction, rash, itching, illness, side effects, pre-existing condition, medication): advise the customer to stop using the product and consult a qualified healthcare professional. Give NO medical advice or diagnosis. State that the case is flagged for a human specialist.
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
  const relevantChunks = retrieval.chunks.filter((c) => c.relevanceScore >= DRAFT_RELEVANCE_THRESHOLD);
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
