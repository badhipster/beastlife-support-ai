import { GoogleGenAI } from '@google/genai';

// Single provider seam for the app. Swap this module to change LLM vendor.
export const GEN_MODEL = 'gemini-2.5-flash';
// gemini-embedding-001 is what this API key/version exposes for embedContent
// (text-embedding-004 returns 404 on v1beta here). 768 dims keeps the index
// small and cosine fast; query and chunk embeddings must share this dim.
export const EMBED_MODEL = 'gemini-embedding-001';
export const EMBED_DIM = 768;

// Lazy init so a missing/placeholder key never crashes the server; callers
// fall back to simulated output when this returns null.
let aiClient: GoogleGenAI | null = null;
export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    console.warn('GEMINI_API_KEY is not configured or left as default. Falling back to simulated response mode.');
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export function isLlmConfigured(): boolean {
  return getGeminiClient() !== null;
}

interface GenerateTextArgs {
  system?: string;
  prompt: string;
  temperature?: number;
  responseMimeType?: string;
}

/**
 * Generate text with Gemini. Throws if the client is unconfigured or the API
 * call fails, so callers decide their own fallback behavior.
 */
export async function generateText({ system, prompt, temperature = 0.7, responseMimeType }: GenerateTextArgs): Promise<string> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('LLM not configured');
  }
  const response = await ai.models.generateContent({
    model: GEN_MODEL,
    contents: prompt,
    config: {
      ...(system ? { systemInstruction: system } : {}),
      temperature,
      ...(responseMimeType ? { responseMimeType } : {}),
    },
  });
  return response.text || '';
}

/**
 * Embed a single piece of text. Throws if the client is unconfigured or the
 * API call fails. Used for KB ingestion (build time) and query retrieval.
 */
export async function embedText(text: string): Promise<number[]> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('LLM not configured');
  }
  const response = await ai.models.embedContent({
    model: EMBED_MODEL,
    contents: text,
    config: { outputDimensionality: EMBED_DIM },
  });
  const values = response.embeddings?.[0]?.values;
  if (!values || values.length === 0) {
    throw new Error('No embedding returned');
  }
  return values;
}
