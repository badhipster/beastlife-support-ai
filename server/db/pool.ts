import { Pool } from 'pg';

// Single Postgres pool for the app. When DATABASE_URL is unset the app keeps
// working against mock data (the repository layer falls back), so the demo
// runs before Supabase is connected.
//
// DATABASE_URL is read lazily (not at module load) because ESM evaluates this
// module before server.ts runs dotenv.config().
export function isDbConfigured(): boolean {
  const c = process.env.DATABASE_URL;
  return Boolean(c && c.trim() !== '');
}

let pool: Pool | null = null;
export function getPool(): Pool {
  if (!isDbConfigured()) {
    throw new Error('DATABASE_URL is not configured');
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Supabase requires SSL; the pooler presents a cert pg cannot always chain.
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

export async function query<T = any>(text: string, params?: unknown[]): Promise<T[]> {
  const res = await getPool().query(text, params);
  return res.rows as T[];
}
