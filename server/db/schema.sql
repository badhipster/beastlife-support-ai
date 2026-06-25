-- BeastLife Support AI — Postgres schema (Supabase). Idempotent.
-- Data model per System Design section 4. The current classification
-- (category/sentiment/intent) is denormalized onto threads for a simple read
-- model; classifications keeps the audit history.

create extension if not exists vector;

create table if not exists senders (
  id           bigserial primary key,
  email        text unique not null,
  display_name text,
  vip          boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists threads (
  id              text primary key,
  gmail_thread_id text unique,
  sender_id       bigint references senders(id),
  topic           text not null,
  brief           text,
  category        text,
  sentiment       text,
  intent          text,
  status          text not null default 'Open',
  draft_status    text not null default 'Needs action',
  trigger_reason  text,
  contact_count   integer not null default 1,
  order_id        text,
  has_attachment  boolean not null default false,
  waiting_time    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists messages (
  id               text primary key,
  thread_id        text not null references threads(id) on delete cascade,
  gmail_message_id text unique,
  sender           text,
  direction        text not null default 'inbound',
  content          text not null,
  is_customer      boolean not null default true,
  display_ts       text,
  received_at      timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

create table if not exists classifications (
  id         bigserial primary key,
  thread_id  text not null references threads(id) on delete cascade,
  message_id text,
  categories text[],
  sentiment  text,
  intent     text,
  model      text,
  created_at timestamptz not null default now()
);

create table if not exists drafts (
  id         bigserial primary key,
  thread_id  text not null references threads(id) on delete cascade,
  body       text not null,
  kb_refs    jsonb,
  grounded   boolean,
  status     text not null default 'pending', -- pending | edited | sent
  created_at timestamptz not null default now(),
  sent_at    timestamptz
);

create table if not exists escalations (
  id          bigserial primary key,
  thread_id   text not null references threads(id) on delete cascade,
  reasons     text[],
  summary     text,
  resolved_by text,
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists kb_chunks (
  id         bigserial primary key,
  source_id  text unique,
  title      text,
  category   text,
  content    text not null,
  embedding  vector(768)
);

create table if not exists analytics_events (
  id        bigserial primary key,
  type      text not null, -- received | drafted | escalated | sent | resolved
  thread_id text,
  ts        timestamptz not null default now()
);

create table if not exists rules (
  id          text primary key,
  title       text not null,
  description text,
  enabled     boolean not null default true,
  keywords    text[],
  icon        text
);

-- Connected Gmail account + OAuth refresh token (single inbox in v1).
create table if not exists accounts (
  id            bigserial primary key,
  email         text unique not null,
  refresh_token text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- App users authenticated via Google Sign-In. role is null until onboarded.
create table if not exists users (
  id            bigserial primary key,
  google_sub    text unique not null,
  email         text,
  name          text,
  picture       text,
  role          text,            -- 'agent' | 'admin'
  session_token text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists users_session_idx on users (session_token);

-- IVFFlat index for cosine similarity over KB embeddings (created after seed
-- ideally, but safe here; pgvector falls back to a scan when the index is empty).
create index if not exists kb_chunks_embedding_idx
  on kb_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 10);
