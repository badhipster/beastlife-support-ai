// Clear all ingested email data (threads, messages, classifications, drafts,
// escalations, analytics events, senders) for a clean inbox — e.g. before a
// live demo. Preserves the KB index, escalation rules, and the connected Gmail
// account. Run: npm run db:clear-inbox
import dotenv from 'dotenv';
dotenv.config();
import { getPool, isDbConfigured } from './pool';

async function main() {
  if (!isDbConfigured()) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }
  await getPool().query(
    `truncate table senders, threads, messages, classifications, drafts, escalations,
     analytics_events restart identity cascade`
  );
  console.log('Inbox cleared. KB chunks, rules, and the connected Gmail account were preserved.');
  await getPool().end();
}

main().catch((err) => {
  console.error('Clear failed:', err);
  process.exit(1);
});
