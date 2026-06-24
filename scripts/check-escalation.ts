// Deterministic assertion of the escalation engine against the seeded emails.
// No LLM calls. Run with: npm run check:escalation
import { INITIAL_THREADS } from '../src/data/mockData';
import { evaluateEscalation, EscalationReason } from '../server/escalation';
import type { EmailThread } from '../src/types';

function inputFromThread(t: EmailThread) {
  return {
    subject: t.topic,
    message: t.messages.map((m) => m.content).join('\n'),
    categories: [t.category],
    sentiment: t.sentiment,
    contactCount: t.contactCount,
    vip: t.vip,
    hasAttachment: t.hasAttachment,
  };
}

// Expected reasons each seeded email must produce (exact set).
const EXPECTED: Record<string, EscalationReason[]> = {
  'THR-001': ['needs_evidence'], // Aman: sour/spoiled mass gainer, no evidence yet
  'THR-002': ['legal'], // Priya: consumer complaint + attorney
  'THR-003': [], // Rahul: payment query, no escalation
  'THR-004': ['health'], // Neha: hives/itching after creatine
  'THR-005': [], // Karan: general advice, no escalation
  'THR-006': ['angry_repeat'], // Sana: angry + 3rd contact
  'THR-007': [], // Vikram: happy feedback, no escalation
  'THR-008': ['vip'], // Elizabeth: Platinum VIP account
  'THR-009': ['health', 'attachment'], // Imran: kidney/creatinine + medical PDF attached
};

function sameSet(a: string[], b: string[]): boolean {
  const sa = new Set(a);
  const sb = new Set(b);
  return sa.size === sb.size && [...sa].every((x) => sb.has(x));
}

let failures = 0;
for (const thread of INITIAL_THREADS) {
  const expected = EXPECTED[thread.id];
  if (!expected) {
    console.warn(`! no expectation defined for ${thread.id}`);
    continue;
  }
  const result = evaluateEscalation(inputFromThread(thread));
  const ok = sameSet(result.reasons, expected);
  if (!ok) failures += 1;
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(
    `${mark}  ${thread.id} ${thread.senderName.padEnd(16)} expected=[${expected.join(', ')}] got=[${result.reasons.join(', ')}]`
  );
}

if (failures > 0) {
  console.error(`\n${failures} escalation assertion(s) failed.`);
  process.exit(1);
}
console.log('\nAll escalation assertions passed.');
