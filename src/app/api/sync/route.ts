/**
 * /api/sync — スプレッドシート → DB 同期用 Webhook エンドポイント
 *
 * GAS (Google Apps Script) からのPOSTリクエストを受け取り、
 * 対象月のデータをDBに全件洗い替え (delete → insert) する。
 *
 * リクエスト形式:
 *   POST /api/sync
 *   Authorization: Bearer <SYNC_SECRET>
 *   Content-Type: application/json
 *   { "type": "sales" | "age" | "type" | "shift" | "employee-shift", "month": "YYYY-MM", ... }
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql, eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { dbSupabase } from '@/lib/db-supabase';
import {
  salesRecords,
  ageRecords,
  typeRecords,
  shiftRows,
  employeeShifts,
  shiftStaffNames,
  talknotePosts,
} from '@/lib/schema';

function checkAuth(request: NextRequest): boolean {
  const secret = process.env.SYNC_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

function num(v: unknown): string {
  const n = Number(v);
  return isNaN(n) ? '0' : String(n);
}

// ──────────────────────────────────────────────
// ペイロード型定義
// ──────────────────────────────────────────────

interface SalesPayload {
  type: 'sales';
  month: string;
  /**
   * 合算データシートの生行（ヘッダー含む2次元配列）
   * COL: [1]=date, [2]=name, [5]=site,
   *      [6]=mnp_h, [7]=mnp_s, [8]=new, [9]=change, [10]=cellup,
   *      [11]=hikari_n, [12]=hikari_t, [13]=hikari_c,
   *      [14]=tablet, [15]=life, [16]=credit, [17]=self_close
   */
  rows: string[][];
}

interface AgePayload {
  type: 'age';
  month: string;
  /** [タイムスタンプ, 名前, 年代, 件数] */
  rows: string[][];
}

interface TypePayload {
  type: 'type';
  month: string;
  /** [タイムスタンプ, 名前, 組数, 件数] */
  rows: string[][];
}

interface ShiftRowData {
  date: string;
  dayOfWeek: string;
  location: string;
  startTime: string;
  order1: string;
  order2: string;
  staff: string[];
  finalStaff: string;
  agency: string;
  isHoliday: boolean;
}

interface ShiftPayload {
  type: 'shift';
  month: string;
  tokyoRows: ShiftRowData[];
  fukuokaRows: ShiftRowData[];
  tokyoStaffNames: string[];
  fukuokaStaffNames: string[];
}

interface EmployeeShiftPayload {
  type: 'employee-shift';
  month: string;
  staff: string[];
  dates: { date: string; dayOfWeek: string }[];
  cells: Record<string, Record<string, string>>;
}

interface TalknotePayload {
  type: 'talknote';
  month: string;
  rows: { postedAt: string; staffName: string; message: string }[];
}

type SyncPayload = SalesPayload | AgePayload | TypePayload | ShiftPayload | EmployeeShiftPayload | TalknotePayload;

// ──────────────────────────────────────────────
// 各シート種別の同期処理
// ──────────────────────────────────────────────

async function syncSales(payload: SalesPayload) {
  const { month, rows } = payload;
  const [y, m] = month.split('-').map(Number);

  const dataRows = rows.slice(1).filter((row) => {
    const d = new Date(row[1]);
    return !isNaN(d.getTime()) && d.getFullYear() === y && d.getMonth() === m - 1;
  });

  // データが0件のときは既存データを削除しない（空送信による消滅防止）
  if (dataRows.length === 0) return { inserted: 0 };

  // 対象月の行を全削除（date列は 'YYYY-MM-DD' 形式）
  await Promise.all([
    db.delete(salesRecords).where(sql`LEFT(${salesRecords.date}, 7) = ${month}`),
    dbSupabase.delete(salesRecords).where(sql`LEFT(${salesRecords.date}, 7) = ${month}`),
  ]);

  const toInsert = dataRows.map((row) => {
    const d = new Date(row[1]);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return {
      date,
      staffName: row[2] ?? '',
      site: row[5] ?? '',
      mnpH: num(row[6]),
      mnpS: num(row[7]),
      newCount: num(row[8]),
      changeCount: num(row[9]),
      cellup: num(row[10]),
      hikariN: num(row[11]),
      hikariT: num(row[12]),
      hikariC: num(row[13]),
      tablet: num(row[14]),
      life: num(row[15]),
      credit: num(row[16]),
      selfClose: num(row[17]),
    };
  });

  await Promise.all([
    db.insert(salesRecords).values(toInsert),
    dbSupabase.insert(salesRecords).values(toInsert),
  ]);
  return { inserted: toInsert.length };
}

async function syncAge(payload: AgePayload) {
  const { month, rows } = payload;
  const [y, m] = month.split('-').map(Number);

  const dataRows = rows.slice(1).filter((row) => {
    const d = new Date(row[0]);
    return !isNaN(d.getTime()) && d.getFullYear() === y && d.getMonth() === m - 1;
  });

  if (dataRows.length === 0) return { inserted: 0 };

  await Promise.all([
    db.delete(ageRecords).where(sql`LEFT(${ageRecords.recordedAt}, 7) = ${month}`),
    dbSupabase.delete(ageRecords).where(sql`LEFT(${ageRecords.recordedAt}, 7) = ${month}`),
  ]);

  const toInsert = dataRows
    .filter((row) => row[1] && row[2])
    .map((row) => ({
      recordedAt: row[0],
      staffName: row[1],
      ageGroup: row[2],
      count: num(row[3] || '1'),
    }));

  if (toInsert.length > 0) {
    await Promise.all([
      db.insert(ageRecords).values(toInsert),
      dbSupabase.insert(ageRecords).values(toInsert),
    ]);
  }
  return { inserted: toInsert.length };
}

async function syncType(payload: TypePayload) {
  const { month, rows } = payload;
  const [y, m] = month.split('-').map(Number);

  const dataRows = rows.slice(1).filter((row) => {
    const d = new Date(row[0]);
    return !isNaN(d.getTime()) && d.getFullYear() === y && d.getMonth() === m - 1;
  });

  if (dataRows.length === 0) return { inserted: 0 };

  await Promise.all([
    db.delete(typeRecords).where(sql`LEFT(${typeRecords.recordedAt}, 7) = ${month}`),
    dbSupabase.delete(typeRecords).where(sql`LEFT(${typeRecords.recordedAt}, 7) = ${month}`),
  ]);

  const toInsert = dataRows
    .filter((row) => row[1] && row[2])
    .map((row) => ({
      recordedAt: row[0],
      staffName: row[1],
      typeGroup: row[2],
      count: num(row[3] || '1'),
    }));

  if (toInsert.length > 0) {
    await Promise.all([
      db.insert(typeRecords).values(toInsert),
      dbSupabase.insert(typeRecords).values(toInsert),
    ]);
  }
  return { inserted: toInsert.length };
}

async function syncShift(payload: ShiftPayload) {
  const { month, tokyoRows, fukuokaRows, tokyoStaffNames, fukuokaStaffNames } = payload;

  await Promise.all([
    db.delete(shiftRows).where(eq(shiftRows.month, month)),
    db.delete(shiftStaffNames).where(eq(shiftStaffNames.month, month)),
    dbSupabase.delete(shiftRows).where(eq(shiftRows.month, month)),
    dbSupabase.delete(shiftStaffNames).where(eq(shiftStaffNames.month, month)),
  ]);

  const makeRows = (rows: ShiftRowData[], region: string) =>
    rows.map((r) => ({
      month,
      date: r.date,
      dayOfWeek: r.dayOfWeek,
      location: r.location,
      startTime: r.startTime,
      order1: r.order1,
      order2: r.order2,
      staff: r.staff,
      finalStaff: r.finalStaff ?? '',
      agency: r.agency,
      sheetRegion: region,
      isHoliday: r.isHoliday,
    }));

  const allRows = [...makeRows(tokyoRows, '東京'), ...makeRows(fukuokaRows, '福岡')];
  const CHUNK = 50;
  for (let i = 0; i < allRows.length; i += CHUNK) {
    const chunk = allRows.slice(i, i + CHUNK);
    await Promise.all([
      db.insert(shiftRows).values(chunk),
      dbSupabase.insert(shiftRows).values(chunk),
    ]);
  }

  const staffNameRows = [
    { month, sheetRegion: '東京', names: tokyoStaffNames },
    { month, sheetRegion: '福岡', names: fukuokaStaffNames },
  ].filter((r) => r.names.length > 0);

  if (staffNameRows.length > 0) {
    await Promise.all([
      db.insert(shiftStaffNames).values(staffNameRows),
      dbSupabase.insert(shiftStaffNames).values(staffNameRows),
    ]);
  }

  return { inserted: allRows.length };
}

async function syncEmployeeShift(payload: EmployeeShiftPayload) {
  const { month, staff, dates, cells } = payload;

  await Promise.all([
    db.delete(employeeShifts).where(eq(employeeShifts.month, month)),
    dbSupabase.delete(employeeShifts).where(eq(employeeShifts.month, month)),
  ]);

  const toInsert: (typeof employeeShifts.$inferInsert)[] = [];
  for (const { date, dayOfWeek } of dates) {
    for (const staffName of staff) {
      toInsert.push({
        month,
        date,
        dayOfWeek,
        staffName,
        value: cells[date]?.[staffName] ?? '',
      });
    }
  }

  if (toInsert.length > 0) {
    await Promise.all([
      db.insert(employeeShifts).values(toInsert),
      dbSupabase.insert(employeeShifts).values(toInsert),
    ]);
  }
  return { inserted: toInsert.length };
}

async function syncTalknote(payload: TalknotePayload) {
  const { month, rows } = payload;
  if (rows.length === 0) return { inserted: 0 };

  // 対象月のデータを全削除
  await Promise.all([
    db.delete(talknotePosts).where(sql`LEFT(${talknotePosts.date}, 7) = ${month}`),
    dbSupabase.delete(talknotePosts).where(sql`LEFT(${talknotePosts.date}, 7) = ${month}`),
  ]);

  const toInsert: (typeof talknotePosts.$inferInsert)[] = [];
  for (const row of rows) {
    const date = row.postedAt.split(' ')[0]; // 'YYYY-MM-DD'
    const [, m, d] = date.split('-');
    const shiftDate = `${parseInt(m)}/${parseInt(d)}`; // '3/31'
    // スペースを除去して照合
    // Talknote "大久保 光"→"大久保光"、"岡田 和己"→"岡田和己"
    // シフト側は "大久保"（姓のみ）や "岡田和"（姓+名一部）のケースがあるため
    // 「シフト名が Talknote名（スペース除去）の前方一致」で照合する
    const fullNameNoSpace = row.staffName.replace(/[\s　]/g, '');

    const shiftResult = await db
      .select({ location: shiftRows.location })
      .from(shiftRows)
      .where(
        and(
          eq(shiftRows.month, month),
          eq(shiftRows.date, shiftDate),
          sql`EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(${shiftRows.staff}) AS s
            WHERE ${fullNameNoSpace} LIKE s || '%'
          )`
        )
      )
      .limit(1);

    toInsert.push({
      date,
      postedAt: row.postedAt,
      staffName: row.staffName,
      site: shiftResult[0]?.location ?? '',
      message: row.message,
    });
  }

  const CHUNK = 50;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK);
    await Promise.all([
      db.insert(talknotePosts).values(chunk),
      dbSupabase.insert(talknotePosts).values(chunk),
    ]);
  }
  return { inserted: toInsert.length };
}

// ──────────────────────────────────────────────
// Route Handler
// ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  let payload: SyncPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSONパースエラー' }, { status: 400 });
  }

  if (!payload.type || !payload.month) {
    return NextResponse.json({ error: 'type と month は必須です' }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}$/.test(payload.month)) {
    return NextResponse.json({ error: 'month は YYYY-MM 形式で指定してください' }, { status: 400 });
  }

  try {
    let result: object;

    switch (payload.type) {
      case 'sales':
        result = await syncSales(payload);
        break;
      case 'age':
        result = await syncAge(payload);
        break;
      case 'type':
        result = await syncType(payload);
        break;
      case 'shift':
        result = await syncShift(payload);
        break;
      case 'employee-shift':
        result = await syncEmployeeShift(payload);
        break;
      case 'talknote':
        result = await syncTalknote(payload);
        break;
      default:
        return NextResponse.json({ error: '不明な type です' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, type: payload.type, month: payload.month, ...result });
  } catch (error) {
    console.error('[sync API] エラー:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '同期に失敗しました' },
      { status: 500 }
    );
  }
}
