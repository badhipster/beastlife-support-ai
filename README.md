# BeastLife Support AI

An internal support tool that connects to a Gmail support inbox, triages incoming
customer emails, drafts knowledge-base-grounded replies, flags high-risk emails for
human review, and shows a live analytics dashboard. Every reply is approved by a
human before it sends. Built for BeastLife, an Indian sports-nutrition brand.

This is a working, persistent application (real Gmail, real Postgres, real Gemini
RAG), not a prototype on mock data.

---

## What it does

1. **Ingests email.** A poller watches the connected Gmail inbox and pulls new
   customer mail every 60 seconds (only mail received after the app started
   watching, so it never vacuums an inbox's history or burns quota on old mail).
2. **Triages each email.** Gemini classifies category (`Legal`, `Product Issue`,
   `Delivery`, `Return/Refund`, `Billing`, `General`, `Feedback`, `Spam`) and
   sentiment (`Angry`, `Frustrated`, `Sad`, `Neutral`, `Happy`), plus a short
   intent phrase.
3. **Decides escalation first.** A deterministic, no-LLM escalation engine runs
   *before* drafting. If an email is legal, a health/adverse-reaction report, a
   quality complaint missing required evidence, an angry repeat contact, a VIP, or
   carries an attachment, it is flagged for a human and **no auto-draft is
   generated**.
4. **Drafts a grounded reply.** For everything else, the app retrieves the most
   relevant BeastLife knowledge-base passages (semantic search over embeddings) and
   asks Gemini to write a reply using *only* that retrieved content. If nothing
   relevant clears the relevance bar, the draft asks a clarifying question or hands
   off to a human instead of inventing an answer.
5. **Human approves and sends.** An agent reviews the draft, edits if needed, and
   approves. Only then does the reply go out, threaded correctly in Gmail. Nothing
   auto-sends.
6. **Reports.** The analytics dashboard is computed live from stored threads, so
   the numbers move as real email is ingested, drafted, escalated, and replied.

---

## Guardrails (non-negotiable)

These are enforced in code (escalation engine + drafting system prompt), not just
documented:

- **Grounded only.** Replies use retrieved KB content. If nothing relevant is
  retrieved, the model asks a clarifying question or hands off. It never invents
  policy, prices, order status, or tracking.
- **Human approval gate.** No reply sends without an agent approving it. No
  auto-send in v1.
- **Never auto-act on Legal.** Legal / regulatory email (lawsuit, consumer court,
  attorney, chargeback, legal notice) is flagged for human review only. The draft
  path is skipped; nothing admits fault or offers a settlement.
- **Health & safety.** Adverse-reaction / medical email advises stopping use and
  consulting a professional, gives no medical advice, and is flagged.
- **Evidence before escalation.** Quality complaints (damaged, wrong, missing,
  expired, leaking) must request the required photo/video evidence before any
  replacement, refund, or resolution is promised.
- **No fabricated order data, no overpromising, no replies to spam.** Scope is
  limited to the connected inbox, and every classification, draft, escalation, and
  send is auditable in the database.

---

## Architecture

```
Gmail inbox ──(poll 60s)──> Poller ──> Pipeline
                                          │
                          ┌───────────────┼────────────────┐
                          ▼               ▼                 ▼
                   Classify (Gemini)  Escalation       RAG retrieval
                   category/sentiment  engine          (pgvector / cosine)
                          │          (deterministic)        │
                          └──────────────┬──────────────────┘
                                         ▼
                           Escalated? ──yes──> flag for human, no draft
                                │no
                                ▼
                       Grounded draft (Gemini, KB-only)
                                ▼
                      Agent reviews → approves → Gmail send
```

**Stack**

- **Frontend:** Vite + React 19 + TypeScript + Tailwind CSS 4.
- **Server:** Express (single process, serves the API and the SPA), TypeScript via `tsx`.
- **AI:** Google Gemini through `@google/genai`.
  - Generation/classification model: `gemini-2.5-flash`
  - Embedding model: `gemini-embedding-001` (768 dimensions)
- **Storage:** Postgres with the `pgvector` extension (KB embeddings + all app data).
- **Email:** Gmail API over OAuth 2.0 (read, modify/label, send scopes), encrypted
  in transit. Refresh token stored server-side for a single connected inbox in v1.
- **Auth:** Google Sign-In for app users (`agent` / `admin` roles), session cookie.

> Security note: this app uses OAuth 2.0 and encrypts data in transit. It makes no
> SOC 2 / HIPAA compliance claims.

---

## Knowledge base & RAG

The real BeastLife knowledge base is ingested into embeddings at build time:

- `npm run ingest-kb` chunks the KB, embeds each chunk with `gemini-embedding-001`,
  and writes `server/kb_index.json` (74 chunks across products, protein/creatine/
  mass-gainer/peanut-butter FAQs, shipping & tracking, order placement, RTO, return
  & refund policy, payments, product quality, evidence-by-issue-type, and
  authentication).
- At request time, the query is embedded and scored against the index by cosine
  similarity. Only chunks at or above the relevance threshold (`0.6`) are passed to
  the model as grounding; the draft cites which KB sources it used.
- For return/refund email, the app additionally pulls the policy passages directly,
  so the reply grounds on actual policy rather than similar-sounding FAQs.

---

## Data model (Postgres)

`senders`, `threads`, `messages`, `classifications` (audit history), `drafts`
(with `kb_refs` and a `grounded` flag), `escalations` (with reasons + summary),
`kb_chunks` (with `vector(768)` embeddings), `analytics_events`, `rules`,
`accounts` (connected Gmail + refresh token), `users` (app sign-in). The current
classification is denormalized onto `threads` for a simple read model; full history
lives in `classifications`. See `server/db/schema.sql`.

---

## Project structure

```
server.ts               Express app: API routes, Vite middleware, starts the poller
server/
  poller.ts             Gmail ingest loop (classify → escalate → draft → label)
  pipeline.ts           Classification + KB-grounded drafting (shared by API + poller)
  escalation.ts         Deterministic escalation engine (no LLM)
  kb.ts                 RAG retrieval over the embedded KB index
  llm.ts                Gemini provider seam (generate + embed)
  gmail.ts              Gmail OAuth + read/label/send
  auth.ts               App sign-in (Google), sessions, roles
  db/                   schema.sql, repo.ts, migrate, seed, pool
  kb_index.json         Embedded knowledge base (produced by ingest-kb)
src/
  App.tsx               App shell + routing between tabs
  components/           Inbox, DetailView, Escalation, Analytics, KnowledgeBase,
                        Settings, Onboarding, Login, Header, Sidebar
  types.ts              Shared front-end types (EmailThread, etc.)
scripts/                ingest-kb, check-escalation
```

---

## Run locally

**Prerequisites:** Node.js 20+, a Postgres database with the `pgvector` extension
(e.g. Supabase or Neon), a Google Gemini API key, and Google OAuth credentials.

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment.** Copy `.env.example` to `.env` and fill in:
   ```bash
   GEMINI_API_KEY=...            # Google Gemini API key
   DATABASE_URL=...              # Postgres connection string (pgvector enabled)
   APP_URL=http://localhost:3000 # used for OAuth callbacks and self links
   GOOGLE_CLIENT_ID=...          # OAuth client (Gmail connect + app sign-in)
   GOOGLE_CLIENT_SECRET=...
   ```
   In Google Cloud, add `http://localhost:3000/api/auth/google/callback` as an
   authorized redirect URI, and enable the Gmail API.

3. **Set up the database**
   ```bash
   npm run db:migrate     # apply schema.sql (idempotent)
   npm run db:seed        # seed rules and reference data
   npm run ingest-kb      # embed the KB into server/kb_index.json
   ```

4. **Run**
   ```bash
   npm run dev            # serves API + SPA at http://localhost:3000
   ```

5. **Connect the support inbox.** Open the app, sign in with Google, finish
   onboarding, and connect the Gmail support inbox. The poller starts automatically
   and ingests new mail that arrives while the app is watching.

**Production build:** `npm run build` then `npm start` (bundles the server to
`dist/server.cjs` and serves the built SPA).

---

## Testing the pipeline

Send a customer email to the connected support inbox from another account. Within
~60 seconds it appears in the Inbox, classified and either escalated or drafted.
The suite of cases worth exercising:

| Scenario | Expected category | Escalates? | Expected behavior |
|---|---|---|---|
| Tracking not updating | Delivery | No | KB-grounded draft using shipping FAQ |
| Return an unopened tub | Return/Refund | No | Draft reflects real return + refund policy |
| Tub arrived with broken seal (no photo) | Product Issue | **needs_evidence** | Draft requests unboxing video before any resolution |
| Rash/itching after product | Product Issue | **health** | Advise stop use + see a professional; no medical advice |
| Threatens consumer court / legal notice | Legal | **legal** | Holding reply, no admission, human review |
| Money deducted, order not confirmed | Billing | No | KB-grounded draft using payment FAQ |
| Praise for a product | Feedback | No | Warm, brief thank-you |
| Promotional spam | Spam | No | No reply drafted |

`npm run check:escalation` runs the escalation engine against fixtures without
touching the LLM or Gmail.

---

## API reference

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/triage` | Classify (category/sentiment/intent) + run escalation |
| `POST` | `/api/generate-draft` | KB-grounded draft for an email |
| `POST` | `/api/retrieve-kb` | Semantic KB retrieval for a query |
| `GET` | `/api/emails` | List threads (filter by `status`, `category`) |
| `GET` | `/api/emails/:id` | Get one thread |
| `GET` | `/api/emails/:id/draft` | Latest pre-generated draft for a thread |
| `PATCH` | `/api/emails/:id` | Persist triage / manual escalate (never sends) |
| `POST` | `/api/emails/:id/approve` | Approve + send the reply via Gmail |
| `POST` | `/api/emails/:id/claim` | Assign a thread to the signed-in agent |
| `GET` | `/api/escalations` | List escalated threads |
| `GET` | `/api/analytics` | Live dashboard metrics from stored threads |
| `GET` | `/api/kb/stats` | KB chunk counts per category |
| `GET` | `/api/gmail/status` | Whether Gmail is configured + connected |

---

## Scope & limitations (v1)

- **One connected inbox.** A single Gmail support account, not multi-mailbox.
- **No auto-send, by design.** Every outgoing reply requires human approval.
- **VIP is a manual flag.** `angry_repeat` requires a 3rd+ contact in one thread.
- **Free-tier Gemini quota applies.** Live classification and drafting share the
  key's daily call budget; on a quota error the app degrades gracefully to a
  deterministic keyword classifier and an offline draft template rather than
  failing.

---

## Definition of done

Builds clean (`npm run lint`), runs, respects every guardrail above, and persists a
full audit trail of every classification, draft, escalation, and send.
