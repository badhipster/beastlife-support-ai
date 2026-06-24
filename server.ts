import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { generateText } from './server/llm';
import { retrieveKB, RetrievedChunk } from './server/kb';

dotenv.config();

// Initialize Express
const app = express();
app.use(express.json());
const PORT = 3000;

// A retrieved chunk must clear this similarity bar to be treated as grounding
// for a draft. Below it, the model is told to ask for clarification instead of
// inventing an answer (PRD 7: grounded only).
const DRAFT_RELEVANCE_THRESHOLD = 0.6;

function buildDraftSystemPrompt(): string {
  return `You are BeastLife Support AI. You draft replies that a human agent reviews and approves before sending; nothing is ever auto-sent.

Grounding rules (non-negotiable):
- Answer using ONLY the knowledge base excerpts provided in the user message.
- If the excerpts do not contain what you need, do NOT invent policy, prices, order status, tracking, or any facts. Instead, ask the customer a brief clarifying question or tell them you are passing this to a human specialist.
- Never fabricate order data (order IDs, tracking numbers, dates, amounts). Only repeat such details if the customer stated them.

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
    const { subject, message, senderName } = req.body;
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

    const system = buildDraftSystemPrompt();
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
