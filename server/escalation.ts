// Deterministic escalation engine (System Design section 6, PRD 6.5).
// Pure functions, no LLM calls. Evaluated BEFORE drafting so a legal/health/
// evidence case never gets an auto-draft path. Never auto-acts: it only marks
// a case Escalated with a reason. Keyword lists live here in Phase 2; they move
// to editable Settings in Phase 5.

export type EscalationReason =
  | 'legal'
  | 'angry_repeat'
  | 'vip'
  | 'attachment'
  | 'needs_evidence'
  | 'health';

export interface EscalationInput {
  subject?: string;
  message?: string;
  categories?: string[];
  sentiment?: string;
  contactCount?: number;
  vip?: boolean;
  hasAttachment?: boolean;
  // Optional explicit overrides; when omitted these are inferred from text.
  qualityComplaint?: boolean;
  evidenceProvided?: boolean;
}

export interface EscalationResult {
  escalated: boolean;
  reasons: EscalationReason[];
  summary: string;
}

const LEGAL_KEYWORDS = [
  'lawsuit', 'sue', 'legal action', 'consumer complaint', 'consumer court', 'consumer forum',
  'attorney', 'solicitor', 'lawyer', 'gdpr', 'regulatory', 'chargeback', 'defamation',
  'legal notice', 'court',
];

const HEALTH_KEYWORDS = [
  'allergic', 'allergy', 'rash', 'hives', 'itching', 'itchy', 'swelling', 'breathing',
  'vomit', 'nausea', 'side effect', 'adverse', 'reaction', 'hospital', 'kidney', 'creatinine',
  'liver', 'medication', 'pre-existing', 'diabetic', 'pregnant', 'sick after',
];

const QUALITY_KEYWORDS = [
  'damaged', 'leaking', 'leaked', 'spilled', 'wrong item', 'wrong product',
  'missing', 'expired', 'expiry', 'spoiled', 'sour', 'rancid', 'seal broken', 'seal was broken',
  'tampered', 'foul smell', 'bad smell',
];

const EVIDENCE_KEYWORDS = ['video', 'photo', 'picture', 'image', 'unboxing', 'attached', 'screenshot'];

const REASON_LABELS: Record<EscalationReason, string> = {
  legal: 'Legal/regulatory keyword detected',
  angry_repeat: 'Angry sentiment + repeat contact (3rd+)',
  vip: 'VIP / priority account',
  attachment: 'Attachment needs human review',
  needs_evidence: 'Quality complaint missing required evidence',
  health: 'Health / adverse reaction reported',
};

// Word-boundary match so e.g. "liver" does not fire inside "delivered".
function hasKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`).test(text);
  });
}

export function evaluateEscalation(input: EscalationInput): EscalationResult {
  const text = `${input.subject || ''} ${input.message || ''}`.toLowerCase();
  const categories = (input.categories || []).map((c) => c.toLowerCase());
  const reasons: EscalationReason[] = [];

  // 1. Legal / regulatory
  if (categories.includes('legal') || hasKeyword(text, LEGAL_KEYWORDS)) {
    reasons.push('legal');
  }

  // 2. Health / adverse reaction
  const healthDetected = hasKeyword(text, HEALTH_KEYWORDS);
  if (healthDetected) {
    reasons.push('health');
  }

  // 3. Angry AND 3rd+ contact in the thread
  if ((input.sentiment || '').toLowerCase() === 'angry' && (input.contactCount || 0) >= 3) {
    reasons.push('angry_repeat');
  }

  // 4. VIP / priority account (manual flag in v1)
  if (input.vip) {
    reasons.push('vip');
  }

  // 5. Attachment needing human review
  if (input.hasAttachment) {
    reasons.push('attachment');
  }

  // 6. Quality complaint missing required evidence (KB section 7 rule).
  // A health/adverse-reaction email routes to the health flow (stop use + consult
  // a professional), not an evidence request, so health suppresses this reason.
  const isQualityComplaint = input.qualityComplaint ?? hasKeyword(text, QUALITY_KEYWORDS);
  const evidenceProvided = input.evidenceProvided ?? (hasKeyword(text, EVIDENCE_KEYWORDS) || !!input.hasAttachment);
  if (isQualityComplaint && !evidenceProvided && !healthDetected) {
    reasons.push('needs_evidence');
  }

  return {
    escalated: reasons.length > 0,
    reasons,
    summary: reasons.map((r) => REASON_LABELS[r]).join('; '),
  };
}
