import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getShiftSheetDataWithHolidays } from '@/lib/sheets';
import type { ShiftRow } from '@/types';

export const dynamic = 'force-dynamic';

function buildSheetName(month: string, region: '東京' | '福岡'): string {
  const [year, mo] = month.split('-');
  const yy = year.slice(2);
  const m = String(parseInt(mo));
  return `${yy}年${m}月【${region}】`;
}

const REGION_COLS = {
  '東京': { staffEnd: 19, agencyIdx: 19 },
  '福岡': { staffEnd: 11, agencyIdx: 11 },
} as const;

// Sheets API は表示形式そのままを返すため "2026/4/30" や "4月30日" 等が混在する
// GAS と同じ "M/D" 形式（例: "4/30"）に統一する
// Sheets API は表示形式そのままを返す（"04/30", "2026/4/30", "4月30日" 等）
// GAS と同じ "M/D" 形式（例: "4/30"、先頭ゼロなし）に統一する
function normalizeDate(raw: string): string {
  if (!raw || !/\d/.test(raw)) return raw;
  // YYYY/M/D or YYYY-M-D
  const withYear = raw.match(/^\d{4}[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (withYear) return `${parseInt(withYear[1])}/${parseInt(withYear[2])}`;
  // MM/DD or M/D（先頭ゼロを除去）
  const md = raw.match(/^(\d{1,2})[\/](\d{1,2})$/);
  if (md) return `${parseInt(md[1])}/${parseInt(md[2])}`;
  // Japanese: M月D日 or YYYY年M月D日
  const jp = raw.match(/(\d{1,2})月(\d{1,2})日/);
  if (jp) return `${parseInt(jp[1])}/${parseInt(jp[2])}`;
  return raw;
}

function parseShiftRows(
  rows: string[][],
  region: '東京' | '福岡',
  holidayDates: Set<string>
): ShiftRow[] {
  const { staffEnd, agencyIdx } = REGION_COLS[region];
  const result: ShiftRow[] = [];
  for (const row of rows) {
    const date = normalizeDate(row[0] ?? '');
    if (!date || !/\d/.test(date)) continue;
    if (row[4] === '場所') continue;
    const staff = row.slice(7, staffEnd).filter((s) => s && s.trim() !== '');
    result.push({
      date,
      dayOfWeek: row[1] ?? '',
      location: row[3] ?? '',
      startTime: row[4] ?? '',
      order1: row[5] ?? '',
      order2: row[6] ?? '',
      staff,
      finalStaff: '',
      agency: row[agencyIdx] ?? '',
      sheetRegion: region,
      isHoliday: holidayDates.has(date),
    });
  }
  return result;
}

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

  async function safeGet(sheetName: string): Promise<{ values: string[][]; holidayDates: Set<string> }> {
    const empty = { values: [] as string[][], holidayDates: new Set<string>() };
    const timeout = new Promise<typeof empty>((resolve) =>
      setTimeout(() => resolve(empty), 10000)
    );
    try {
      return await Promise.race([getShiftSheetDataWithHolidays(sheetName), timeout]);
    } catch (e) {
      console.error(`[shift API] シートデータ取得エラー (${sheetName}):`, e);
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
