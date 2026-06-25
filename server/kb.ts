import { readFileSync } from 'node:fs';
import path from 'node:path';
import { embedText } from './llm';
import { searchKbChunks, kbChunkCount, kbCategoryCounts, kbChunkBySourceId } from './db/repo';

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

interface IndexEntry {
  sourceId: string;
  title: string;
  category: string;
  text: string;
  embedding: number[];
}

// Load the embedded KB index produced by `npm run ingest-kb`. Resolved from the
// project root (the cwd for `tsx server.ts` and the production start command).
const INDEX_PATH = path.resolve(process.cwd(), 'server', 'kb_index.json');
let INDEX: IndexEntry[] = [];
try {
  const raw = JSON.parse(readFileSync(INDEX_PATH, 'utf-8'));
  INDEX = Array.isArray(raw.chunks) ? raw.chunks : [];
  console.log(`Loaded ${INDEX.length} KB chunks from ${path.relative(process.cwd(), INDEX_PATH)}`);
} catch {
  console.warn(`KB index not found at ${INDEX_PATH}. Run "npm run ingest-kb". Retrieval will use keyword fallback.`);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Deterministic keyword overlap, used when embeddings are unavailable.
function keywordScore(query: string, entry: IndexEntry): number {
  const queryTerms = query.toLowerCase().split(/\s+/);
  let matchCount = 0;
  queryTerms.forEach((term) => {
    if (
      term.length > 2 &&
      (entry.text.toLowerCase().includes(term) ||
        entry.category.toLowerCase().includes(term) ||
        entry.title.toLowerCase().includes(term))
    ) {
      matchCount += 1;
    }
  });
  const rawScore = 0.4 + (matchCount / (queryTerms.length || 1)) * 0.5;
  return Math.min(0.9, Math.max(0.4, Number(rawScore.toFixed(2))));
}

function toRetrieved(entry: IndexEntry, score: number): RetrievedChunk {
  return {
    id: entry.sourceId,
    sourceId: entry.sourceId,
    title: entry.title,
    text: entry.text,
    category: entry.category,
    relevanceScore: Number(score.toFixed(4)),
  };
}

function keywordRetrieve(query: string, k: number): RetrievedChunk[] {
  return INDEX.map((e) => toRetrieved(e, keywordScore(query, e)))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, k);
}

/**
 * Retrieve the most relevant KB chunks for a query by embedding the query and
 * ranking the index by cosine similarity. Falls back to keyword overlap (and
 * sets simulated:true) when embeddings are unavailable (no key / quota).
 */
// Has the KB been loaded into Postgres? Checked once and cached.
let pgvectorReady: boolean | null = null;
async function usePgvector(): Promise<boolean> {
  if (pgvectorReady === null) {
    try {
      pgvectorReady = (await kbChunkCount()) > 0;
    } catch {
      pgvectorReady = false;
    }
  }
  return pgvectorReady;
}

export interface KbStats {
  totalChunks: number;
  sections: { category: string; count: number }[];
}

// Real KB stats for the Knowledge Base tab: from pgvector when seeded, else the
// in-memory index.
export async function kbStats(): Promise<KbStats> {
  if (await usePgvector()) {
    const sections = await kbCategoryCounts();
    return { totalChunks: sections.reduce((n, s) => n + s.count, 0), sections };
  }
  const map = new Map<string, number>();
  INDEX.forEach((e) => map.set(e.category, (map.get(e.category) || 0) + 1));
  const sections = [...map.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
  return { totalChunks: INDEX.length, sections };
}

// Fetch a single KB passage by its source_id so the dashboard can link a
// draft's cited sources to the exact text. Prefers Postgres, falls back to the
// in-memory index (same source the retriever uses).
export async function getKbSource(sourceId: string): Promise<KBChunk | null> {
  if (await usePgvector()) {
    const row = await kbChunkBySourceId(sourceId);
    if (row) return row;
  }
  const e = INDEX.find((x) => x.sourceId === sourceId);
  return e ? { id: e.sourceId, sourceId: e.sourceId, title: e.title, text: e.text, category: e.category } : null;
}

export async function retrieveKB(query: string, k = 4): Promise<RetrieveResult> {
  try {
    const qvec = await embedText(query);
    // Prefer pgvector when the KB is seeded into Postgres; else use the
    // in-memory index. Same cosine ranking either way.
    if (await usePgvector()) {
      const chunks = await searchKbChunks(qvec, k);
      if (chunks.length > 0) return { chunks, simulated: false };
    }
    if (INDEX.length === 0) return { chunks: [], simulated: true };
    const scored = INDEX.map((e) => toRetrieved(e, cosine(qvec, e.embedding))).sort(
      (a, b) => b.relevanceScore - a.relevanceScore
    );
    return { chunks: scored.slice(0, k), simulated: false };
  } catch (err) {
    console.warn('KB embedding retrieval failed. Falling back to keyword search:', err);
    return { chunks: keywordRetrieve(query, k), simulated: true };
  }
}
