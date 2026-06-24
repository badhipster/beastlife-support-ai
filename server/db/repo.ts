// Data access layer. Every function falls back to the seeded mock data when
// DATABASE_URL is unset, so the app runs before Supabase is connected and the
// rest of the server never branches on DB availability.
import { isDbConfigured, query } from './pool';
import { INITIAL_THREADS, INITIAL_RULES } from '../../src/data/mockData';
import type { EmailThread, Message, SettingsRule } from '../../src/types';
import type { RetrievedChunk } from '../kb';

const THREAD_SELECT = `
  select t.id, t.topic, t.brief, t.category, t.sentiment, t.intent, t.status,
         t.draft_status, t.trigger_reason, t.contact_count, t.order_id,
         t.has_attachment, t.waiting_time,
         s.email as sender_email, s.display_name as sender_name, s.vip,
         coalesce(
           json_agg(
             json_build_object('id', m.id, 'sender', m.sender, 'content', m.content,
                               'timestamp', m.display_ts, 'isCustomer', m.is_customer)
             order by m.received_at
           ) filter (where m.id is not null), '[]'
         ) as messages
  from threads t
  left join senders s on s.id = t.sender_id
  left join messages m on m.thread_id = t.id`;

interface ThreadRow {
  id: string;
  topic: string;
  brief: string;
  category: string;
  sentiment: string;
  intent: string | null;
  status: string;
  draft_status: string;
  trigger_reason: string | null;
  contact_count: number;
  order_id: string | null;
  has_attachment: boolean;
  waiting_time: string | null;
  sender_email: string | null;
  sender_name: string | null;
  vip: boolean | null;
  messages: Message[];
}

function rowToThread(r: ThreadRow): EmailThread {
  return {
    id: r.id,
    senderName: r.sender_name || 'Unknown',
    senderEmail: r.sender_email || '',
    topic: r.topic,
    category: r.category || 'General',
    sentiment: (r.sentiment as EmailThread['sentiment']) || 'Neutral',
    brief: r.brief || '',
    draftStatus: (r.draft_status as EmailThread['draftStatus']) || 'Needs action',
    status: (r.status as EmailThread['status']) || 'Open',
    waitingTime: r.waiting_time || '',
    orderId: r.order_id || '',
    contactCount: r.contact_count,
    messages: r.messages || [],
    triggerReason: r.trigger_reason || undefined,
    vip: r.vip || undefined,
    hasAttachment: r.has_attachment || undefined,
    intent: r.intent || undefined,
  };
}

export async function listThreads(): Promise<EmailThread[]> {
  if (!isDbConfigured()) return INITIAL_THREADS;
  const rows = await query<ThreadRow>(`${THREAD_SELECT} group by t.id, s.email, s.display_name, s.vip order by t.created_at`);
  return rows.map(rowToThread);
}

export async function getThread(id: string): Promise<EmailThread | null> {
  if (!isDbConfigured()) return INITIAL_THREADS.find((t) => t.id === id) || null;
  const rows = await query<ThreadRow>(
    `${THREAD_SELECT} where t.id = $1 group by t.id, s.email, s.display_name, s.vip`,
    [id]
  );
  return rows[0] ? rowToThread(rows[0]) : null;
}

export interface ThreadPatch {
  category?: string;
  sentiment?: string;
  intent?: string;
  status?: string;
  draftStatus?: string;
  triggerReason?: string;
}

const PATCH_COLUMNS: Record<keyof ThreadPatch, string> = {
  category: 'category',
  sentiment: 'sentiment',
  intent: 'intent',
  status: 'status',
  draftStatus: 'draft_status',
  triggerReason: 'trigger_reason',
};

// Persist the read-model fields the UI changes (triage result, escalation).
export async function updateThread(id: string, patch: ThreadPatch): Promise<EmailThread | null> {
  if (!isDbConfigured()) return getThread(id);
  const sets: string[] = [];
  const values: unknown[] = [];
  (Object.keys(patch) as (keyof ThreadPatch)[]).forEach((key) => {
    if (patch[key] !== undefined) {
      values.push(patch[key]);
      sets.push(`${PATCH_COLUMNS[key]} = $${values.length}`);
    }
  });
  if (sets.length > 0) {
    values.push(id);
    await query(`update threads set ${sets.join(', ')}, updated_at = now() where id = $${values.length}`, values);
  }
  return getThread(id);
}

export async function listRules(): Promise<SettingsRule[]> {
  if (!isDbConfigured()) return INITIAL_RULES;
  const rows = await query<any>('select id, title, description, enabled, keywords, icon from rules order by id');
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    enabled: r.enabled,
    keywords: r.keywords || undefined,
    icon: r.icon,
  }));
}

export async function logEvent(type: string, threadId?: string): Promise<void> {
  if (!isDbConfigured()) return;
  await query('insert into analytics_events (type, thread_id) values ($1, $2)', [type, threadId || null]);
}

// pgvector cosine search over kb_chunks. Returns [] when the table is empty so
// kb.ts can fall back to the in-memory index.
export async function searchKbChunks(embedding: number[], k: number): Promise<RetrievedChunk[]> {
  if (!isDbConfigured()) return [];
  const vec = `[${embedding.join(',')}]`;
  const rows = await query<any>(
    `select source_id, title, category, content,
            1 - (embedding <=> $1::vector) as score
     from kb_chunks
     where embedding is not null
     order by embedding <=> $1::vector
     limit $2`,
    [vec, k]
  );
  return rows.map((r) => ({
    id: r.source_id,
    sourceId: r.source_id,
    title: r.title,
    text: r.content,
    category: r.category,
    relevanceScore: Number(Number(r.score).toFixed(4)),
  }));
}

export async function kbChunkCount(): Promise<number> {
  if (!isDbConfigured()) return 0;
  const rows = await query<{ count: string }>('select count(*)::text as count from kb_chunks');
  return parseInt(rows[0]?.count || '0', 10);
}
