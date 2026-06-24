// Seed Postgres from the existing mock data + the embedded KB index.
// Idempotent (truncates first, preserves the accounts/OAuth table). Run after
// db:migrate with: npm run db:seed
import { readFileSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { getPool, isDbConfigured } from './pool';
import { INITIAL_THREADS, INITIAL_RULES } from '../../src/data/mockData';

dotenv.config();

async function main() {
  if (!isDbConfigured()) {
    console.error('DATABASE_URL is not set. Add your Supabase connection string to .env first.');
    process.exit(1);
  }
  const pool = getPool();

  await pool.query(
    `truncate table senders, threads, messages, classifications, drafts, escalations,
     analytics_events, rules, kb_chunks restart identity cascade`
  );

  // Rules
  for (const r of INITIAL_RULES) {
    await pool.query(
      `insert into rules (id, title, description, enabled, keywords, icon)
       values ($1, $2, $3, $4, $5, $6)`,
      [r.id, r.title, r.description, r.enabled, r.keywords || null, r.icon]
    );
  }

  // Threads + senders + messages
  for (const t of INITIAL_THREADS) {
    const sender = await pool.query(
      `insert into senders (email, display_name, vip) values ($1, $2, $3)
       on conflict (email) do update set display_name = excluded.display_name, vip = senders.vip or excluded.vip
       returning id`,
      [t.senderEmail, t.senderName, !!t.vip]
    );
    const senderId = sender.rows[0].id;

    await pool.query(
      `insert into threads (id, sender_id, topic, brief, category, sentiment, intent, status,
                            draft_status, trigger_reason, contact_count, order_id, has_attachment, waiting_time)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        t.id, senderId, t.topic, t.brief, t.category, t.sentiment, t.intent || null, t.status,
        t.draftStatus, t.triggerReason || null, t.contactCount, t.orderId || null, !!t.hasAttachment, t.waitingTime,
      ]
    );

    for (const m of t.messages) {
      await pool.query(
        `insert into messages (id, thread_id, sender, direction, content, is_customer, display_ts)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [m.id, t.id, m.sender, m.isCustomer ? 'inbound' : 'outbound', m.content, m.isCustomer, m.timestamp]
      );
    }
  }

  // KB chunks (embedded) from the ingest output
  const index = JSON.parse(
    readFileSync(path.resolve(process.cwd(), 'server', 'kb_index.json'), 'utf-8')
  ) as { chunks: { sourceId: string; title: string; category: string; text: string; embedding: number[] }[] };

  for (const c of index.chunks) {
    await pool.query(
      `insert into kb_chunks (source_id, title, category, content, embedding)
       values ($1,$2,$3,$4,$5::vector)
       on conflict (source_id) do update set embedding = excluded.embedding`,
      [c.sourceId, c.title, c.category, c.text, `[${c.embedding.join(',')}]`]
    );
  }

  console.log(`Seeded ${INITIAL_RULES.length} rules, ${INITIAL_THREADS.length} threads, ${index.chunks.length} KB chunks.`);
  await pool.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
