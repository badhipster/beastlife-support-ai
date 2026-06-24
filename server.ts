import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

// Initialize Express
const app = express();
app.use(express.json());
const PORT = 3000;

// Lazy initialization of Gemini client to prevent crash if key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    console.warn('GEMINI_API_KEY is not configured or left as default. Falling back to simulated response mode.');
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// 1. API: Generate Draft Response with Gemini
app.post('/api/generate-draft', async (req, res) => {
  try {
    const { ticketSubject, ticketMessage, senderName } = req.body;
    if (!ticketMessage) {
      return res.status(400).json({ error: 'ticketMessage is required' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      // High-quality pre-programmed offline response
      let mockDraft = `Dear ${senderName || 'Valued Customer'},

Thank you for reaching out to BeastLife Support. We have received your inquiry regarding "${ticketSubject || 'your order'}".

Regarding your concerns:
1. Product Mixability & Texture: For optimal outcomes, we recommend mixing protein scoops in liquid under 45°C. High temperature (such as boiling water) will cause natural protein coagulation and clumping. 
2. Replacement Process: If you suspect a quality defect or shipping spoilage, please provide us with a quick photo or brief video of the unboxing along with the batch number stamp from the bottom of your tub. 

Once verify, our Tier 3 wellness specialists will coordinate a rapid replacement or full reimbursement. 

Best regards,
BeastLife AI Support Agent`;
      return res.json({ draft: mockDraft, simulated: true });
    }

    const systemPrompt = `You are the core AI agent of BeastLife Support, a high-performance sports nutrition and supplements brand. 
Your goal is to draft a helpful, professional, and structured response to a customer support ticket.
Adapt your style to the specific issue (e.g. resolve delivery delays, give mixability advice for whey protein, clarify refunds, ensure safety).

Here are key knowledge notes:
- Protein mixability: BeastLife Whey should be mixed in liquids under 45°C. Mixing in hot/boiling water denatures proteins and causes clumping or visual lumps. Use a shaker bottle with the included blending ball.
- High-purity Whey: Lumping is typical when exposed to high temperature or humidity, but does not impact bioavailability unless there is a bitter, rancid odor.
- Discrepancies/Complaints: Always apologize, request the batch verification number from the bottom of the tub, and offer rapid resolution.
- Keep the tone clean, composed, and encouraging but professional. Always sign off as 'BeastLife Support Agent'.`;

    const promptUser = `Customer Name: ${senderName || 'Valued Customer'}
Ticket Subject: "${ticketSubject}"
Ticket Message:
"${ticketMessage}"

Draft a professional email response. Address them politely, answer their concerns clearly, request evidence (like photo of batch number on bottom of tub) if logical for quality issues, and sign off nicely.`;

    let responseText = '';
    let isSimulated = false;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: promptUser,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        },
      });
      responseText = response.text || '';
    } catch (apiError: any) {
      console.warn('Gemini generateContent call failed. Falling back to local high-quality response simulation.', apiError);
      isSimulated = true;
      responseText = `Dear ${senderName || 'Valued Customer'},

Thank you for reaching out to BeastLife Support. We have received your inquiry regarding "${ticketSubject || 'your order'}".

Regarding your concerns:
1. Product Mixability & Texture: For optimal outcomes, we recommend mixing protein scoops in liquid under 45°C. High temperature (such as boiling water) will cause natural protein coagulation and clumping. 
2. Replacement Process: If you suspect a quality defect or shipping spoilage, please provide us with a quick photo or brief video of the unboxing along with the batch number stamp from the bottom of your tub. 

Once verified, our Tier 3 wellness specialists will coordinate a rapid replacement or full reimbursement. 

Best regards,
BeastLife AI Support Agent (Simulated Fallback due to high model demand)`;
    }

    res.json({ draft: responseText, simulated: isSimulated });
  } catch (error: any) {
    console.error('Gemini Draft generation error:', error);
    res.status(500).json({ error: error.message || 'Error generating AI draft response' });
  }
});

// 2. API: Knowledge Base Semantic Search (RAG simulator)
app.post('/api/retrieve-kb', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Standard list of chunks to retrieve over
    const allChunks = [
      {
        id: 'chunk-1',
        sourceId: 'BL-QA-2024-012',
        title: 'Whey Protein Formulation & Instantization',
        category: 'Protein Q&A / Mixability',
        text: '"...BeastLife Whey uses a multi-stage filtration process that may result in small protein clumps if added to boiling water. We recommend using water or milk under 45°C. To ensure total dissolution, use a shaker bottle with the included blending ball to break mechanical cohesion, as heat denaturation above 55°C triggers immediate coagulation..."'
      },
      {
        id: 'chunk-2',
        sourceId: 'BL-QC-2023-088',
        title: 'Isolate Moisture and Solidification Standards',
        category: 'Product Quality / Standards',
        text: '"...Lumping is a common physical characteristic of high-purity whey protein isolate when not stored in a cool, dry place. While aesthetic, it does not impact the biological nutrient value or safety of the product unless accompanied by a bitter/rancid odor, which signals fat oxidation. Standard batches must remain under 4.5% moisture content to prevent bacterial growth..."'
      },
      {
        id: 'chunk-3',
        sourceId: 'BL-CAT-WHEY-004',
        title: 'Emulsifier Agents & Lecithin Addition',
        category: 'Product Catalogue / Ingredients',
        text: '"Our protein powder includes a small amount of Sunflower Lecithin to aid in instantization. Users with mixability issues should check the expiration date on the bottom of the tub, as clumping naturally increases with age and exposure to high atmospheric humidity, causing the lecithin lipids to lose binding strength."'
      },
      {
        id: 'chunk-4',
        sourceId: 'BL-LAW-2025-002',
        title: 'Dispute Settlement and Mediation Guidelines',
        category: 'Legal / Complaints Policy',
        text: '"Our corporate policy flags any explicit threats of consumer complaint forum filings, Better Business Bureau arbitration, or attorney notification as a formal legal trigger. Upon activation, support representatives must flag the case as high priorities, restrict secondary automated drafts, and escalate immediately to Tier 3 human supervisors for guided legal review."'
      },
      {
        id: 'chunk-5',
        sourceId: 'BL-DEL-2024-055',
        title: 'Proof of Delivery and Courier Verification',
        category: 'Logistics / Non-Receipt',
        text: '"When a cargo tracker indicates successful delivery but the customer claims non-receipt, the primary step is GPS coordinate verification of the scan point from our delivery dispatch partners. Representatives should trace the signature and require packaging desk logs verification before reshipping high-value supplements."'
      }
    ];

    const ai = getGeminiClient();
    if (!ai) {
      // Local keyword matching relevance score calculation
      const hits = allChunks.map((chunk) => {
        const queryTerms = query.toLowerCase().split(/\s+/);
        let matchCount = 0;
        queryTerms.forEach((term: string) => {
          if (term.length > 2 && (chunk.text.toLowerCase().includes(term) || chunk.category.toLowerCase().includes(term) || chunk.title.toLowerCase().includes(term))) {
            matchCount += 1;
          }
        });
        // Normalize relevance score between 0.4 and 0.96
        const rawScore = 0.4 + (matchCount / (queryTerms.length || 1)) * 0.65;
        const relevanceScore = Math.min(0.96, Math.max(0.4, Number(rawScore.toFixed(2))));
        return { ...chunk, relevanceScore };
      }).sort((a, b) => b.relevanceScore - a.relevanceScore);

      return res.json({ chunks: hits.slice(0, 3), simulated: true });
    }

    // Double-loop: Let Gemini analyze semantic similarity and generate dynamic relevance scores!
    const promptRAG = `You are a RAG retrieval system. Evaluate the relevance of the following 5 Knowledge Base document chunks against the user support query: "${query}"

Knowledge Base Chunks:
${JSON.stringify(allChunks, null, 2)}

Respond with a JSON array return format containing the top 3 relevant chunks sorted by evaluation score descending. Include a "relevanceScore" property between 0.1 and 0.99 indicating evaluated semantic match, and the other standard chunk keys like "id", "sourceId", "title", "text", "category". Do not wrap in markdown quotes except valid JSON array.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: promptRAG,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      try {
        const parsed = JSON.parse(response.text || '[]');
        res.json({ chunks: parsed, simulated: false });
      } catch {
        // Fallback in case of parse issues
        res.json({ chunks: allChunks.slice(0, 3).map((c, i) => ({ ...c, relevanceScore: 0.95 - (i * 0.1) })), simulated: true });
      }
    } catch (apiError: any) {
      console.warn('Gemini RAG generateContent call failed. Falling back to local keyword search simulator:', apiError);
      
      // Local keyword matching relevance score calculation
      const hits = allChunks.map((chunk) => {
        const queryTerms = query.toLowerCase().split(/\s+/);
        let matchCount = 0;
        queryTerms.forEach((term: string) => {
          if (term.length > 2 && (chunk.text.toLowerCase().includes(term) || chunk.category.toLowerCase().includes(term) || chunk.title.toLowerCase().includes(term))) {
            matchCount += 1;
          }
        });
        // Normalize relevance score between 0.4 and 0.96
        const rawScore = 0.4 + (matchCount / (queryTerms.length || 1)) * 0.65;
        const relevanceScore = Math.min(0.96, Math.max(0.4, Number(rawScore.toFixed(2))));
        return { ...chunk, relevanceScore };
      }).sort((a, b) => b.relevanceScore - a.relevanceScore);

      res.json({ chunks: hits.slice(0, 3), simulated: true });
    }
  } catch (error: any) {
    console.error('Gemini RAG retrieval error:', error);
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
