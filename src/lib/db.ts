import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

// モジュールロード時ではなく、実際のリクエスト時に初期化する（ビルド時エラー回避）
let _db: DrizzleDb | null = null;

export function getDb(): DrizzleDb {
  if (!_db) {
    const url = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL が設定されていません');
    }
    const client = postgres(url, { ssl: 'require' });
    _db = drizzle(client, { schema });
  }
  return _db;
}

export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getDb() as any)[prop];
  },
});
