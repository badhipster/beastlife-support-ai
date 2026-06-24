import { getGeminiClient, GEN_MODEL } from './llm';

export interface KBChunk {
  id: string;
  sourceId: string;
  title: string;
  text: string;
  category: string;
}

export interface RetrievedChunk extends KBChunk {
  relevanceScore: number;
}

export interface RetrieveResult {
  chunks: RetrievedChunk[];
  simulated: boolean;
}

// Phase 2.1: a small hardcoded set, retrieved via Gemini relevance scoring with
// a keyword fallback. Phase 2.3 replaces this with the embedded real KB index
// and cosine retrieval; callers of retrieveKB() do not change.
const HARDCODED_CHUNKS: KBChunk[] = [
  {
    id: 'chunk-1',
    sourceId: 'BL-QA-2024-012',
    title: 'Whey Protein Formulation & Instantization',
    category: 'Protein Q&A / Mixability',
    text: '"...BeastLife Whey uses a multi-stage filtration process that may result in small protein clumps if added to boiling water. We recommend using water or milk under 45°C. To ensure total dissolution, use a shaker bottle with the included blending ball to break mechanical cohesion, as heat denaturation above 55°C triggers immediate coagulation..."',
  },
  {
    id: 'chunk-2',
    sourceId: 'BL-QC-2023-088',
    title: 'Isolate Moisture and Solidification Standards',
    category: 'Product Quality / Standards',
    text: '"...Lumping is a common physical characteristic of high-purity whey protein isolate when not stored in a cool, dry place. While aesthetic, it does not impact the biological nutrient value or safety of the product unless accompanied by a bitter/rancid odor, which signals fat oxidation. Standard batches must remain under 4.5% moisture content to prevent bacterial growth..."',
  },
  {
    id: 'chunk-3',
    sourceId: 'BL-CAT-WHEY-004',
    title: 'Emulsifier Agents & Lecithin Addition',
    category: 'Product Catalogue / Ingredients',
    text: '"Our protein powder includes a small amount of Sunflower Lecithin to aid in instantization. Users with mixability issues should check the expiration date on the bottom of the tub, as clumping naturally increases with age and exposure to high atmospheric humidity, causing the lecithin lipids to lose binding strength."',
  },
  {
    id: 'chunk-4',
    sourceId: 'BL-LAW-2025-002',
    title: 'Dispute Settlement and Mediation Guidelines',
    category: 'Legal / Complaints Policy',
    text: '"Our corporate policy flags any explicit threats of consumer complaint forum filings, Better Business Bureau arbitration, or attorney notification as a formal legal trigger. Upon activation, support representatives must flag the case as high priorities, restrict secondary automated drafts, and escalate immediately to Tier 3 human supervisors for guided legal review."',
  },
  {
    id: 'chunk-5',
    sourceId: 'BL-DEL-2024-055',
    title: 'Proof of Delivery and Courier Verification',
    category: 'Logistics / Non-Receipt',
    text: '"When a cargo tracker indicates successful delivery but the customer claims non-receipt, the primary step is GPS coordinate verification of the scan point from our delivery dispatch partners. Representatives should trace the signature and require packaging desk logs verification before reshipping high-value supplements."',
  },
];

// Deterministic keyword overlap score, used when the LLM is unavailable.
function keywordScore(query: string, chunk: KBChunk): number {
  const queryTerms = query.toLowerCase().split(/\s+/);
  let matchCount = 0;
  queryTerms.forEach((term) => {
    if (
      term.length > 2 &&
      (chunk.text.toLowerCase().includes(term) ||
        chunk.category.toLowerCase().includes(term) ||
        chunk.title.toLowerCase().includes(term))
    ) {
      matchCount += 1;
    }
  });
  const rawScore = 0.4 + (matchCount / (queryTerms.length || 1)) * 0.65;
  return Math.min(0.96, Math.max(0.4, Number(rawScore.toFixed(2))));
}

function keywordRetrieve(query: string, k: number): RetrievedChunk[] {
  return HARDCODED_CHUNKS.map((chunk) => ({ ...chunk, relevanceScore: keywordScore(query, chunk) }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, k);
}

/**
 * Retrieve the most relevant KB chunks for a query. Returns chunks ranked by
 * relevanceScore plus a `simulated` flag (true when the deterministic keyword
 * fallback was used instead of the model).
 */
export async function retrieveKB(query: string, k = 4): Promise<RetrieveResult> {
  const ai = getGeminiClient();
  if (!ai) {
    return { chunks: keywordRetrieve(query, k), simulated: true };
  }

  const promptRAG = `You are a RAG retrieval system. Evaluate the relevance of the following Knowledge Base document chunks against the user support query: "${query}"

Knowledge Base Chunks:
${JSON.stringify(HARDCODED_CHUNKS, null, 2)}

Respond with a JSON array containing the top ${k} relevant chunks sorted by evaluation score descending. Include a "relevanceScore" property between 0.1 and 0.99 indicating evaluated semantic match, and the other standard chunk keys: "id", "sourceId", "title", "text", "category". Do not wrap in markdown, return only a valid JSON array.`;

  try {
    const response = await ai.models.generateContent({
      model: GEN_MODEL,
      contents: promptRAG,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });
    try {
      const parsed = JSON.parse(response.text || '[]') as RetrievedChunk[];
      return { chunks: parsed, simulated: false };
    } catch {
      return { chunks: keywordRetrieve(query, k), simulated: true };
    }
  } catch (apiError) {
    console.warn('Gemini RAG retrieval failed. Falling back to keyword search:', apiError);
    return { chunks: keywordRetrieve(query, k), simulated: true };
  }
}
