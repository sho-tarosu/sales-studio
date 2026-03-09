import { NextRequest, NextResponse } from 'next/server';
import { sql, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { salesRecords, ageRecords, typeRecords } from '@/lib/schema';
import { aggregateMainSheet, aggregateAgeSheet, aggregateTypeSheet } from '@/lib/aggregator';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month');

    let targetYear: number;
    let targetMonthIdx: number;

    if (monthParam) {
      const [y, m] = monthParam.split('-').map(Number);
      targetYear = y;
      targetMonthIdx = m - 1;
    } else {
      const now = new Date();
      targetYear = now.getFullYear();
      targetMonthIdx = now.getMonth();
    }

    const currentMonthStr = `${targetYear}-${String(targetMonthIdx + 1).padStart(2, '0')}`;
    const prevDate = new Date(targetYear, targetMonthIdx - 1, 1);
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    // DB から並列取得
    const [salesRows, ageRows, typeRows] = await Promise.all([
      db.select().from(salesRecords).where(
        or(
          sql`LEFT(${salesRecords.date}, 7) = ${currentMonthStr}`,
          sql`LEFT(${salesRecords.date}, 7) = ${prevMonthStr}`
        )
      ),
      db.select().from(ageRecords).where(
        sql`LEFT(${ageRecords.recordedAt}, 7) = ${currentMonthStr}`
      ),
      db.select().from(typeRecords).where(
        sql`LEFT(${typeRecords.recordedAt}, 7) = ${currentMonthStr}`
      ),
    ]);

    // 既存の aggregator が期待する string[][] 形式に変換
    const mainSheetRows: string[][] = [
      ['', 'date', 'name', '', '', 'site', 'mnp_h', 'mnp_s', 'new', 'change', 'cellup', 'hikari_n', 'hikari_t', 'hikari_c', 'tablet', 'life', 'credit', 'self_close'],
      ...salesRows.map((r) => [
        '', r.date, r.staffName, '', '', r.site ?? '',
        r.mnpH ?? '0', r.mnpS ?? '0', r.newCount ?? '0', r.changeCount ?? '0', r.cellup ?? '0',
        r.hikariN ?? '0', r.hikariT ?? '0', r.hikariC ?? '0',
        r.tablet ?? '0', r.life ?? '0', r.credit ?? '0', r.selfClose ?? '0',
      ]),
    ];

    const ageSheetRows: string[][] = [
      ['timestamp', 'name', 'age_group', 'count'],
      ...ageRows.map((r) => [r.recordedAt, r.staffName, r.ageGroup, r.count ?? '1']),
    ];

    const typeSheetRows: string[][] = [
      ['timestamp', 'name', 'type_group', 'count'],
      ...typeRows.map((r) => [r.recordedAt, r.staffName, r.typeGroup, r.count ?? '1']),
    ];

    // 既存の集計ロジックをそのまま使用
    const data = aggregateMainSheet(mainSheetRows, targetYear, targetMonthIdx);

    const staffMap: Record<string, typeof data.ranking[0]> = {};
    data.ranking.forEach((s) => { staffMap[s.name] = s; });

    if (ageSheetRows.length > 1) {
      aggregateAgeSheet(ageSheetRows, staffMap, targetYear, targetMonthIdx);
    }
    if (typeSheetRows.length > 1) {
      aggregateTypeSheet(typeSheetRows, staffMap, targetYear, targetMonthIdx);
    }

    data.ranking.forEach((p) => {
      Object.entries(p.ages).forEach(([k, v]) => {
        data.globalStats.ages[k] = (data.globalStats.ages[k] || 0) + v;
      });
      Object.entries(p.types).forEach(([k, v]) => {
        data.globalStats.types[k] = (data.globalStats.types[k] || 0) + v;
      });
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
