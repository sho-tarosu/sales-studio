/**
 * /api/sync/staff — スタッフ情報シート → DB 同期
 *
 * GASから毎日6時にPOSTされる。全件洗い替え。
 * { rows: string[][] }  ← スタッフ情報シートの生データ（ヘッダー行含む）
 *
 * 列インデックス（0始まり）:
 *   B列(1)=拠点, E列(4)=生年月日, H列(7)=都道府県, I列(8)=血液型,
 *   K列(10)=動物占い, T列(19)=名前, W列(22)=ロール, X列(23)=在籍,
 *   AB列(27)=性別
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { staffProfiles } from '@/lib/schema';

export const dynamic = 'force-dynamic';

function checkAuth(request: NextRequest): boolean {
  const secret = process.env.SYNC_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  let body: { rows: unknown[][] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSONパースエラー' }, { status: 400 });
  }

  const rows = body.rows;
  if (!Array.isArray(rows) || rows.length < 2) {
    return NextResponse.json({ error: 'rows が不正です' }, { status: 400 });
  }

  const records = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const name   = String(row[19] ?? '').trim();
    const active = String(row[23] ?? '').trim().toUpperCase();
    if (!name || active !== 'TRUE') continue;

    const rawBlood = String(row[8] ?? '').trim();
    const bloodType = rawBlood ? (rawBlood.endsWith('型') ? rawBlood : rawBlood + '型') : '';

    records.push({
      name,
      base:       String(row[1]  ?? '').trim(),
      birthday:   String(row[4]  ?? '').trim(),
      prefecture: String(row[7]  ?? '').trim().replace(/[都道府県]$/, ''),
      bloodType,
      animal:     String(row[10] ?? '').trim(),
      role:       String(row[22] ?? '').trim(),
      gender:     String(row[27] ?? '').trim(),
    });
  }

  // 全件洗い替え
  await db.delete(staffProfiles);
  if (records.length > 0) {
    await db.insert(staffProfiles).values(records);
  }

  return NextResponse.json({ ok: true, inserted: records.length });
}
