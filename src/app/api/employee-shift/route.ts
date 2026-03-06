import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getShiftSheetData } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

const SHEET_NAME = '【社員】';

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

  const [, mo] = month.split('-');
  const m = parseInt(mo);
  // データ行の日付列は "M/1" 形式（例: "3/1"）
  const firstDayPattern = `${m}/1`;

  try {
    const rows = await getShiftSheetData(SHEET_NAME);

    if (rows.length < 4) {
      return NextResponse.json({ staff: [], dates: [], cells: {} });
    }

    const staffRow = rows[2] ?? []; // row 3: スタッフ名行

    // データ行(row4以降)から対象月の開始列を探す
    let startCol = -1;
    for (let i = 3; i < rows.length && startCol === -1; i++) {
      const row = rows[i];
      for (let col = 0; col < row.length; col++) {
        if ((row[col] ?? '').trim() === firstDayPattern) {
          startCol = col;
          break;
        }
      }
    }

    if (startCol === -1) {
      return NextResponse.json({ staff: [], dates: [], cells: {} });
    }

    // 日付列=startCol, 曜日列=startCol+1, スタッフ列=startCol+2以降
    const staffColStart = startCol + 2;

    // 次の月の "M+1/1" を探して終了列を決定
    const nextM = m === 12 ? 1 : m + 1;
    const nextMonthPattern = `${nextM}/1`;
    let endCol = rows[3]?.length ?? staffColStart;
    outer:
    for (let i = 3; i < rows.length; i++) {
      const row = rows[i];
      for (let col = startCol + 1; col < row.length; col++) {
        if ((row[col] ?? '').trim() === nextMonthPattern) {
          endCol = col;
          break outer;
        }
      }
    }

    // スタッフ名を row3 から取得（空セルはスキップ）
    const staffWithCol: { name: string; col: number }[] = [];
    for (let col = staffColStart; col < endCol; col++) {
      const name = (staffRow[col] ?? '').trim();
      if (name) staffWithCol.push({ name, col });
    }

    // データ行を解析
    const dates: { date: string; dayOfWeek: string }[] = [];
    const cells: Record<string, Record<string, string>> = {};

    for (let i = 3; i < rows.length; i++) {
      const row = rows[i];
      const rawDate = (row[startCol] ?? '').trim();
      if (!rawDate) continue;

      // "3/5" → mm=3, dd=5
      const parts = rawDate.split('/');
      if (parts.length !== 2) continue;
      const mm = parseInt(parts[0]);
      const dd = parseInt(parts[1]);
      if (mm !== m || isNaN(dd) || dd < 1 || dd > 31) continue;

      const dateStr = `${String(mm).padStart(2, '0')}/${String(dd).padStart(2, '0')}`;
      const dayOfWeek = (row[startCol + 1] ?? '').trim();

      dates.push({ date: dateStr, dayOfWeek });
      cells[dateStr] = {};

      for (const { name, col } of staffWithCol) {
        cells[dateStr][name] = (row[col] ?? '').trim();
      }
    }

    return NextResponse.json({
      staff: staffWithCol.map((s) => s.name),
      dates,
      cells,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'データの取得に失敗しました' },
      { status: 500 }
    );
  }
}
