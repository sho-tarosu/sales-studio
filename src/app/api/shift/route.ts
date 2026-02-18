import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getShiftSheetDataWithHolidays } from '@/lib/sheets';
import type { ShiftRow } from '@/types';

function buildSheetName(month: string, region: '東京' | '福岡'): string {
  const [year, mo] = month.split('-');
  const yy = year.slice(2);
  const m = String(parseInt(mo));
  return `${yy}年${m}月【${region}】`;
}

// 東京: スタッフ H-S (7-18), 代理店 T (19)
// 福岡: スタッフ H-K (7-10), 代理店 L (11)
const REGION_COLS = {
  '東京': { staffEnd: 19, agencyIdx: 19 },
  '福岡': { staffEnd: 11, agencyIdx: 11 },
} as const;

function parseShiftRows(
  rows: string[][],
  region: '東京' | '福岡',
  holidayDates: Set<string>
): ShiftRow[] {
  const { staffEnd, agencyIdx } = REGION_COLS[region];
  const result: ShiftRow[] = [];
  for (const row of rows) {
    const date = row[0] ?? '';
    if (!date || !/\d/.test(date)) continue; // 日付がない行はスキップ
    if (row[4] === '場所') continue; // 「場所」副行をスキップ
    const staff = row.slice(7, staffEnd).filter((s) => s && s.trim() !== '');
    result.push({
      date,
      dayOfWeek: row[1] ?? '',
      location: row[3] ?? '',
      startTime: row[4] ?? '',
      order1: row[5] ?? '',
      order2: row[6] ?? '',
      staff,
      agency: row[agencyIdx] ?? '',
      sheetRegion: region,
      isHoliday: holidayDates.has(date),
    });
  }
  return result;
}

// ヘッダー行からスタッフ名を抽出（startIdx列から「クロ」の手前まで）
function extractStaffNames(headerRow: string[], startIdx: number): string[] {
  const kuroIdx = headerRow.findIndex((v, i) => i >= startIdx && v === 'クロ');
  const endIdx = kuroIdx >= 0 ? kuroIdx : headerRow.length;
  return [...new Set(
    headerRow.slice(startIdx, endIdx).filter((v) => v && v.trim() !== '' && v !== '-')
  )];
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const month =
    searchParams.get('month') ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // シートが存在しない or Google API がハングした場合でも10秒で空データを返す
  async function safeGet(sheetName: string): Promise<{ values: string[][]; holidayDates: Set<string> }> {
    const empty = { values: [] as string[][], holidayDates: new Set<string>() };
    const timeout = new Promise<typeof empty>((resolve) =>
      setTimeout(() => resolve(empty), 10000)
    );
    try {
      return await Promise.race([getShiftSheetDataWithHolidays(sheetName), timeout]);
    } catch {
      return empty;
    }
  }

  try {
    const [tokyo, fukuoka] = await Promise.all([
      safeGet(buildSheetName(month, '東京')),
      safeGet(buildSheetName(month, '福岡')),
    ]);

    const rows: ShiftRow[] = [
      ...parseShiftRows(tokyo.values, '東京', tokyo.holidayDates),
      ...parseShiftRows(fukuoka.values, '福岡', fukuoka.holidayDates),
    ];

    // ヘッダー行（インデックス2）からスタッフ名を取得
    // 東京: Y列(24)以降、福岡: Q列(16)以降、「クロ」の手前まで
    const tokyoHeader = tokyo.values[2] ?? [];
    const fukuokaHeader = fukuoka.values[2] ?? [];
    const tokyoStaffNames = extractStaffNames(tokyoHeader, 24);
    const fukuokaStaffNames = extractStaffNames(fukuokaHeader, 16);

    return NextResponse.json({ rows, tokyoStaffNames, fukuokaStaffNames });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'データの取得に失敗しました' },
      { status: 500 }
    );
  }
}
