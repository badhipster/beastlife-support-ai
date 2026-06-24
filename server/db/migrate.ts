// Apply server/db/schema.sql to the configured Postgres. Run: npm run db:migrate
import { readFileSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { getPool, isDbConfigured } from './pool';

dotenv.config();

async function main() {
  if (!isDbConfigured()) {
    console.error('DATABASE_URL is not set. Add your Supabase connection string to .env first.');
    process.exit(1);
  }
  const sql = readFileSync(path.resolve(process.cwd(), 'server', 'db', 'schema.sql'), 'utf-8');
  await getPool().query(sql);
  console.log('Schema applied.');
  await getPool().end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
