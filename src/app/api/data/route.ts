import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheets';
import { aggregateMainSheet, aggregateAgeSheet, aggregateTypeSheet } from '@/lib/aggregator';
import { auth } from '@/lib/auth';

const SHEET_NAME_MAIN = '合算データ';
const SHEET_NAME_AGE = 'グラフ用データ_年代';
const SHEET_NAME_TYPE = 'グラフ用データ_家族構成';

export async function GET(request: NextRequest) {
  // 認証チェック
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }
  // TODO: ロールベースのアクセス制限（将来拡張用）
  // if (session.user.role !== '幹部') { ... }

  try {
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month'); // 'YYYY-MM'

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

    // Fetch all 3 sheets in parallel
    const [mainRows, ageRows, typeRows] = await Promise.all([
      getSheetData(SHEET_NAME_MAIN),
      getSheetData(SHEET_NAME_AGE).catch(() => []),
      getSheetData(SHEET_NAME_TYPE).catch(() => []),
    ]);

    // Aggregate main data
    const data = aggregateMainSheet(mainRows, targetYear, targetMonthIdx);

    // Build staffMap for age/type aggregation
    const staffMap: Record<string, typeof data.ranking[0]> = {};
    data.ranking.forEach((s) => { staffMap[s.name] = s; });

    // Aggregate age & type data if sheets exist
    if (ageRows.length > 0) {
      aggregateAgeSheet(ageRows, staffMap, targetYear, targetMonthIdx);
    }
    if (typeRows.length > 0) {
      aggregateTypeSheet(typeRows, staffMap, targetYear, targetMonthIdx);
    }

    // Rebuild globalStats ages/types after aggregation
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
