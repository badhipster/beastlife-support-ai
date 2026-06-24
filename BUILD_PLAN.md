# BUILD_PLAN — BeastLife Support AI

Phased backlog to take the AI Studio prototype to the PRD. Work top to bottom; each task is a small vertical slice with an acceptance check. Phases 1 and 2 are the demo-critical path. Tags like (PRD 6.4) map to the PRD requirement.

---

## Phase 0 — Repo setup
- [ ] `git init`, confirm `.gitignore` excludes `node_modules`, `dist`, `.env`. Commit the AI Studio baseline as the first commit.
- [ ] `npm install`, then `npm run dev` and confirm it runs locally on port 3000.
- [ ] Add `GEMINI_API_KEY` to a local `.env` (never commit). Confirm a live draft call works after Phase 1.1.
- **Done when:** clean clone builds and runs, baseline committed.

## Phase 1 — Alignment fixes (fast, high signal)
These close the gaps found in the live scan and make the AI actually fire.

- [ ] **1.1 Fix model name.** In `server.ts`, change both `model: 'gemini-3.5-flash'` to `gemini-2.5-flash`. *Accept:* a live draft and KB call return real Gemini output (`simulated: false`), not the fallback.
- [ ] **1.2 Fix the broken seed draft.** In `src/components/DetailView.tsx` (the `useEffect` around lines 34-45), remove the hardcoded draft that injects `${ticket.topic}` into a sentence. Leave the draft empty until "Generate AI Draft" runs. *Accept:* opening an email shows an empty draft, no broken "experience with {subject}." sentence.
- [ ] **1.3 Model label.** In `Header.tsx`, change "Gemini 3.5 Flash" to "Gemini 2.5 Flash".
- [ ] **1.4 Vocabulary.** Replace "ticket(s)" with "email"/"thread"/"case" across UI and rename the `Ticket` type to `EmailThread` in `src/types.ts` (and usages). *Accept:* no "ticket" string remains in rendered UI.
- [ ] **1.5 Remove fake compliance claims.** In `OnboardingTab.tsx`, drop "SOC2 Type II Certified" and "HIPAA compliant"; replace with "OAuth 2.0, encrypted in transit. You approve every reply before it sends."
- [ ] **1.6 Settings alignment.** In `SettingsTab.tsx`, add the global toggle "Quality complaint requires evidence before escalation" (on by default) and remove the "OCR confidence below 60%" wording from the attachment rule (the confidence trigger was dropped). *Accept:* Settings matches PRD 6.5 + guardrails.

## Phase 2 — Make the AI real (P0 core loop)
- [ ] **2.1 Ground the draft in RAG.** (PRD 6.4, guardrails) In `server.ts`, have `/api/generate-draft` first retrieve KB chunks (reuse the retrieve logic) and pass them into the prompt; instruct the model to answer only from those chunks and, if none are relevant, ask a clarifying question instead of inventing. Update `DetailView.generateAIDraft` to send/use the retrieved context. *Accept:* the draft cites/uses retrieved KB content; with an off-topic email, it asks for clarification rather than fabricating policy.
- [ ] **2.2 Enforce guardrails in the prompt.** Quality complaint -> request photo/video evidence before resolving; Legal -> flag for human, no liability, no auto-resolution; Health/adverse reaction -> advise stop use + consult professional. *Accept:* the Aman (quality) draft asks for unboxing video + batch before offering replacement; a legal email produces a human-review note, not a settlement offer.
- [ ] **2.3 Ingest the real KB.** (PRD 6.4) Parse `../BeastLife Knowledge Base.pdf`, chunk per Q&A pair / product / policy section, embed (text-embedding model), store for retrieval. Replace the 5 hardcoded chunks. *Accept:* retrieval returns real BeastLife KB passages with scores.
- [ ] **2.4 Real classification + sentiment + intent.** (PRD 6.2, 6.3) Add an endpoint that classifies an incoming email (category, sentiment, intent) via Gemini; populate these instead of mock fields. *Accept:* a new email is auto-categorized and scored on ingest.
- [ ] **2.5 Escalation engine.** (PRD 6.5) Deterministic rules evaluated before drafting: Legal keyword, Angry AND 3rd+ contact, VIP flag, attachment needs review, quality-complaint-missing-evidence, health/adverse. Mark Escalated + reason, no auto-action. *Accept:* each rule routes a matching email to Escalations with the correct reason tag.

## Phase 3 — Real data + Gmail (P0)
- [ ] **3.1 Persistence.** (System Design section 4) Add Postgres + pgvector (Supabase). Tables: threads, messages, classifications, drafts, escalations, kb_chunks, analytics_events, rules, senders. Replace `mockData.ts` reads with DB queries.
- [ ] **3.2 Gmail OAuth + ingest.** (PRD 6.1) `googleapis` client, OAuth 2.0 (GCP project in Testing mode, your test accounts whitelisted, scopes `gmail.readonly`/`modify`/`send`). Poll every 60s, parse sender/subject/body/thread, dedup via `gmail_message_id` + a `BL/Processed` label. *Accept:* a real email sent to the connected inbox appears in-app within ~60s.
- [ ] **3.3 Approve-and-send via Gmail.** (PRD 6.6) Wire "Approve & Send" to `users.messages.send` in the original thread, then mark replied. *Accept:* approving a draft sends a real reply that threads correctly in Gmail.

## Phase 4 — Analytics from real data (P0 6.7)
- [ ] Compute KPIs and charts (received vs auto-drafted vs escalated, by category, solved/in-queue/escalated, response time, sentiment trend, top escalation reasons) from the DB, not mock. *Accept:* dashboard numbers move as emails are processed.

## Phase 5 — P1
- [ ] KB manager: upload/edit articles, tag by category, retrieval preview (the sandbox already exists, wire it to the real index).
- [ ] Settings: persist escalation keywords/thresholds, tone profiles, working hours, accounts.

## Phase 6 — Testing and eval (SDLC testing)
- [ ] Create a labeled sample set of 25-40 BeastLife emails covering every category, sentiment, and escalation case.
- [ ] Eval: classification accuracy, escalation recall on legal/health (target 100% on the set), percent of replies grounded in KB. Record results in a short `EVAL.md`.
- [ ] Walk each PRD P0 acceptance criterion and confirm it passes.

## Phase 7 — Deployment + demo
- [ ] Env/secrets configured; deploy (Cloud Run, as today). Seed the demo by sending the sample emails from your own accounts / plus-aliases into the connected inbox.
- [ ] Record a short walkthrough for the submission.

---

### Suggested first Claude Code session
Do Phase 1 in one sitting (fast wins, makes the AI fire), then 2.1 and 2.2 (grounded, guarded drafts). That alone turns the demo from "looks right" to "behaves right." Then 2.3-2.5, then Gmail.
