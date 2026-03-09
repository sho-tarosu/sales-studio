import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let _dbSupabase: DrizzleDb | null = null;

export function getDbSupabase(): DrizzleDb {
  if (!_dbSupabase) {
    if (!process.env.SUPABASE_DATABASE_URL) {
      throw new Error('SUPABASE_DATABASE_URL が設定されていません');
    }
    const client = postgres(process.env.SUPABASE_DATABASE_URL, { ssl: 'require' });
    _dbSupabase = drizzle(client, { schema });
  }
  return _dbSupabase;
}

export const dbSupabase: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getDbSupabase() as any)[prop];
  },
});
