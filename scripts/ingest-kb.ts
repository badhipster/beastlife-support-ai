// Parse the BeastLife KB PDF, chunk it (per Q&A pair, per catalogue subsection,
// per policy section), embed each chunk, and write server/kb_index.json.
// Run: npm run ingest-kb           (parse + embed + write)
//      npm run ingest-kb -- --dry  (parse + chunk only, no embeddings; prints chunks)
import { PDFParse } from 'pdf-parse';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { embedText, EMBED_MODEL } from '../server/llm';

dotenv.config();

const PDF_PATH = path.resolve(process.cwd(), '..', 'BeastLife Knowledge Base.pdf');
const OUT_PATH = path.resolve(process.cwd(), 'server', 'kb_index.json');

interface Chunk {
  sourceId: string;
  title: string;
  category: string;
  text: string;
}

const SECTION_RE = /^(\d+)\.\s+(.+)/;
const SUBSECTION_RE = /^(\d+)\.(\d+)\s+(.+)/;
const QA_RE = /^Q(?:\.\d+)?\s*:\s*(.+)/;
const PAGE_MARKER_RE = /^--\s*\d+\s+of\s+\d+\s*--$/;

function stripNum(s: string): string {
  return s.replace(/^\d+(\.\d+)?\.?\s+/, '').trim();
}

// Group the flat KB text into coherent chunks using the document's own
// structure: top sections (1..9, strictly increasing), subsections (N.M),
// Q&A markers (Q: / Q.N:), and numbered FAQ items inside section 9.
function chunkKB(raw: string): Chunk[] {
  const lines = raw.split('\n').map((l) => l.replace(/\s+$/, ''));
  const chunks: Chunk[] = [];

  let topSection = 0;
  let category = 'General';
  let current: { title: string; category: string; body: string[] } | null = null;

  const flush = () => {
    if (current && current.body.join(' ').trim().length >= 25) {
      chunks.push({
        sourceId: `BL-KB-${String(chunks.length + 1).padStart(3, '0')}`,
        title: current.title,
        category: current.category,
        text: current.body.join('\n').trim(),
      });
    }
    current = null;
  };

  const start = (title: string, cat: string) => {
    flush();
    current = { title, category: cat, body: [] };
  };

  for (const line of lines) {
    if (PAGE_MARKER_RE.test(line)) continue;
    const trimmed = line.trim();

    const sectionMatch = trimmed.match(SECTION_RE);
    const subMatch = trimmed.match(SUBSECTION_RE);
    const qaMatch = trimmed.match(QA_RE);

    // Real top-section heading: number is exactly the next one in sequence.
    // The KB has 9 top sections; once we are in section 9 ("Other FAQs"),
    // numbered lines are FAQ items (numbering resets), not new sections.
    if (sectionMatch && !subMatch && topSection < 9 && parseInt(sectionMatch[1], 10) === topSection + 1) {
      topSection = parseInt(sectionMatch[1], 10);
      category = stripNum(trimmed);
      start(stripNum(trimmed), category);
      continue;
    }

    // Subsection heading (N.M where N is the current top section).
    if (subMatch && parseInt(subMatch[1], 10) === topSection) {
      category = stripNum(trimmed);
      start(stripNum(trimmed), category);
      continue;
    }

    // Numbered FAQ item inside section 9 (numbers reset, so not a top section).
    if (topSection === 9 && sectionMatch && !subMatch) {
      start(stripNum(trimmed), 'Other FAQs');
      continue;
    }

    // Q&A marker.
    if (qaMatch) {
      start(qaMatch[1].trim(), category);
      if (current) current.body.push(trimmed);
      continue;
    }

    if (!current) continue;
    if (trimmed.length === 0 && current.body.length === 0) continue;
    current.body.push(trimmed);
  }
  flush();
  return chunks;
}

function round(values: number[]): number[] {
  return values.map((v) => Number(v.toFixed(6)));
}

async function main() {
  const dry = process.argv.includes('--dry');
  const buf = readFileSync(PDF_PATH);
  const parsed = await new PDFParse({ data: new Uint8Array(buf) }).getText();
  const chunks = chunkKB(parsed.text);

  console.log(`Parsed ${parsed.total} pages -> ${chunks.length} chunks.`);
  if (dry) {
    chunks.forEach((c, i) =>
      console.log(`${String(i + 1).padStart(3, '0')} [${c.category}] ${c.title}  (${c.text.length} chars)`)
    );
    console.log('\nDry run: no embeddings generated, nothing written.');
    return;
  }

  const index: (Chunk & { embedding: number[] })[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    // Embed title + text so the heading terms contribute to the vector.
    const embedding = round(await embedText(`${c.title}\n${c.text}`));
    index.push({ ...c, embedding });
    process.stdout.write(`\rEmbedded ${i + 1}/${chunks.length}`);
  }
  writeFileSync(OUT_PATH, JSON.stringify({ model: EMBED_MODEL, generatedAt: new Date().toISOString(), chunks: index }, null, 2));
  console.log(`\nWrote ${index.length} embedded chunks to ${path.relative(process.cwd(), OUT_PATH)}`);
}

main().catch((err) => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
