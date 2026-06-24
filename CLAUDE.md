# BeastLife Support AI — Project Memory (read first)

Context for any agent (Claude Code, Antigravity) working in this repo. We are turning the AI Studio prototype into the product described in the PRD, following SDLC phases with PM rigor.

## What we are building
An internal tool that connects to a Gmail support inbox, triages incoming customer emails (category + sentiment), drafts replies grounded in the BeastLife knowledge base (RAG), flags high-risk emails for human review, and shows an analytics dashboard. Every reply is approved by a human before sending. BeastLife is an Indian sports-nutrition / supplements brand.

Source docs live in the parent folder `../`:
- `../BeastLife_PRD_AI_Email_Automation.md` (v0.3, the requirements, guardrails, trade-offs)
- `../BeastLife_System_Design.md` (architecture, data model, RAG + Gmail flow, API)
- `../DESIGN.md` (visual design tokens)
- `../BeastLife Knowledge Base.pdf` (the real KB to ingest for RAG)
- `BUILD_PLAN.md` (the phased backlog, work from this)

## Current state (honest baseline)
- Vite + React 19 + TypeScript + Tailwind 4 frontend; Express server in `server.ts`; `@google/genai`.
- `server.ts` exposes `/api/generate-draft` and `/api/retrieve-kb`. Both call Gemini with model string `gemini-3.5-flash`, which does not exist, so live calls fail and fall back to simulated/keyword stubs.
- `/api/retrieve-kb` searches 5 hardcoded chunks, not the real KB. No embeddings, no vector store.
- `/api/generate-draft` does NOT use retrieved chunks, so replies are not actually grounded.
- All ticket data is mock (`src/data/mockData.ts`). No persistence, no Gmail, no real classification, "send" only updates local state.
- UI uses "ticket" vocabulary; header shows "Gemini 3.5 Flash"; onboarding claims SOC2/HIPAA.

## Guardrails (non-negotiable, from PRD section 7)
- **Grounded only.** Replies must use retrieved KB content. If nothing relevant is retrieved, ask a clarifying question or hand to a human. Never invent policy, prices, or facts.
- **Human approval gate.** No reply sends without an agent approving it. No auto-send in v1.
- **Never auto-act on Legal.** Legal/regulatory emails are flagged for human review only; the draft never admits liability.
- **Health and safety.** Adverse-reaction / medical emails advise stopping use and consulting a professional, give no medical advice, and are flagged.
- **Evidence before escalation.** Quality complaints (damaged, wrong, missing, expired) must request photo/video evidence before escalating or resolving.
- **No overpromising, no fabricated order data, no replies to spam, scope limited to the connected inbox, everything auditable.**

## Conventions
- TypeScript everywhere, functional React components, Tailwind tokens per `../DESIGN.md`.
- Use model `gemini-2.5-flash`. Never `gemini-3.5-flash`.
- Vocabulary: "email" / "thread" / "case", never "ticket". (Rename the `Ticket` type to `EmailThread` when touched.)
- No fabricated compliance claims (no SOC2, no HIPAA). Use "OAuth 2.0, encrypted in transit."
- Secrets via env only (`GEMINI_API_KEY`, Gmail OAuth creds). Never commit secrets.

## How we work (SDLC + PM)
- Plan before code. For any non-trivial task, write the approach and acceptance criteria first (Claude Code: use plan mode).
- Work task-by-task from `BUILD_PLAN.md`, smallest vertical slice first.
- Every task ends with a check: it builds (`npm run lint`), runs, and meets its acceptance criteria. Add a test or a manual verification note.
- Small, focused commits. One task per branch where practical.

## Definition of done (per task)
Builds clean, meets the acceptance criteria in BUILD_PLAN.md, respects every guardrail above, and does not regress another screen.
