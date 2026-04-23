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
    // セッションモード(5432)→トランザクションモード(6543)に切り替え
    // トランザクションモードはサーバーレス環境で接続を効率的に多重化する
    const poolerUrl = url.replace(/\.pooler\.supabase\.com:5432/, '.pooler.supabase.com:6543');
    const client = postgres(poolerUrl, {
      ssl: 'require',
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false, // トランザクションモードでは必須
    });
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
