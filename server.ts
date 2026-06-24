import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { generateText } from './server/llm';
import { retrieveKB, RetrievedChunk } from './server/kb';
import { evaluateEscalation } from './server/escalation';

dotenv.config();

// Initialize Express
const app = express();
app.use(express.json());
const PORT = 3000;

// A retrieved chunk must clear this similarity bar to be treated as grounding
// for a draft. Below it, the model is told to ask for clarification instead of
// inventing an answer (PRD 7: grounded only).
const DRAFT_RELEVANCE_THRESHOLD = 0.6;

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
  if (chunks.length === 0) {
    return 'No relevant knowledge base excerpts were found for this email.';
  }
  return chunks
    .map((c, i) => `[${i + 1}] ${c.title} (${c.sourceId}) — ${c.category}\n${c.text}`)
    .join('\n\n');
}

function buildDraftUserPrompt(args: {
  senderName?: string;
  subject?: string;
  message: string;
  chunks: RetrievedChunk[];
}): string {
  const { senderName, subject, message, chunks } = args;
  return `Customer name: ${senderName || 'Valued Customer'}
Email subject: "${subject || '(no subject)'}"
Email body:
"${message}"

Knowledge base excerpts:
${formatChunks(chunks)}

Draft the reply now. If no relevant excerpts were found, ask a clarifying question or hand off to a human rather than guessing.`;
}

// Honest offline fallback: never asserts policy we did not retrieve.
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

// 1. API: Generate a KB-grounded draft reply
app.post('/api/generate-draft', async (req, res) => {
  try {
    const { subject, message, senderName, category, sentiment } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    // RAG: retrieve KB context first, then ground the draft in it.
    const retrieval = await retrieveKB(`${subject || ''} ${message}`.trim(), 4);
    const relevantChunks = retrieval.chunks.filter((c) => c.relevanceScore >= DRAFT_RELEVANCE_THRESHOLD);
    const grounded = relevantChunks.length > 0;
    const kbRefs = relevantChunks.map((c) => ({
      id: c.id,
      sourceId: c.sourceId,
      title: c.title,
      relevanceScore: c.relevanceScore,
    }));

    const system = buildDraftSystemPrompt({ category, sentiment });
    const userPrompt = buildDraftUserPrompt({ senderName, subject, message, chunks: relevantChunks });

    try {
      const draft = await generateText({ system, prompt: userPrompt, temperature: 0.7 });
      return res.json({ draft, simulated: false, grounded, kbRefs });
    } catch (apiError) {
      console.warn('Draft generation failed. Falling back to offline simulated draft.', apiError);
      const draft = simulatedDraft({ senderName, subject, grounded });
      return res.json({ draft, simulated: true, grounded, kbRefs });
    }
  } catch (error: any) {
    console.error('Draft generation error:', error);
    res.status(500).json({ error: error.message || 'Error generating AI draft response' });
  }
});

// 2. API: Knowledge Base semantic retrieval
app.post('/api/retrieve-kb', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    const result = await retrieveKB(query, 4);
    res.json(result);
  } catch (error: any) {
    console.error('KB retrieval error:', error);
    res.status(500).json({ error: error.message || 'Error doing RAG retrieval' });
  }
});

// 3. API: Triage an email — classify (category + sentiment + intent) then run
// the deterministic escalation engine. One Gemini call + pure rules.
const CATEGORIES = ['Legal', 'Product Issue', 'Delivery', 'Return/Refund', 'Billing', 'General', 'Feedback', 'Spam'];
const SENTIMENTS = ['Angry', 'Frustrated', 'Sad', 'Neutral', 'Happy'];

interface Classification {
  categories: string[];
  sentiment: string;
  intent: string;
}

// Deterministic fallback when the LLM is unavailable (no key / quota).
function keywordClassify(subject: string, message: string): Classification {
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

app.post('/api/triage', async (req, res) => {
  try {
    const { subject, message, contactCount, vip, hasAttachment } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const system = `You classify inbound customer support emails for an Indian sports-nutrition brand. Return ONLY JSON.
- categories: array of one or more from exactly this set: ${JSON.stringify(CATEGORIES)}. Use multiple only when genuinely ambiguous.
- sentiment: exactly one of ${JSON.stringify(SENTIMENTS)}.
- intent: a short phrase (max 6 words) for what the customer wants, e.g. "request replacement", "track order", "report adverse reaction".`;
    const prompt = `Subject: "${subject || ''}"
Body: "${message}"
Return JSON: { "categories": [...], "sentiment": "...", "intent": "..." }`;

    let classification: Classification;
    let simulated = false;
    try {
      const raw = await generateText({ system, prompt, temperature: 0.1, responseMimeType: 'application/json' });
      classification = parseClassification(raw);
    } catch (apiError) {
      console.warn('Classification failed. Falling back to keyword classifier.', apiError);
      classification = keywordClassify(subject || '', message);
      simulated = true;
    }

    const escalation = evaluateEscalation({
      subject,
      message,
      categories: classification.categories,
      sentiment: classification.sentiment,
      contactCount,
      vip,
      hasAttachment,
    });

    res.json({ ...classification, escalation, simulated });
  } catch (error: any) {
    console.error('Triage error:', error);
    res.status(500).json({ error: error.message || 'Error triaging email' });
  }
});

// Configure Vite or Static Asset delivery
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static assets compiled into dist
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BeastLife Support Server running at http://localhost:${PORT}`);
  });
}

startServer();
