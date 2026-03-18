import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { shiftRows as shiftRowsTable, shiftStaffNames } from '@/lib/schema';
import type { ShiftRow } from '@/types';

export const dynamic = 'force-dynamic';

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

  try {
    const [dbShiftRows, dbStaffNames] = await Promise.all([
      db.select().from(shiftRowsTable).where(eq(shiftRowsTable.month, month)),
      db.select().from(shiftStaffNames).where(eq(shiftStaffNames.month, month)),
    ]);

    const rows: ShiftRow[] = dbShiftRows.map((r) => ({
      date: r.date,
      dayOfWeek: r.dayOfWeek ?? '',
      location: r.location ?? '',
      startTime: r.startTime ?? '',
      order1: r.order1 ?? '',
      order2: r.order2 ?? '',
      staff: (r.staff as string[]) ?? [],
      finalStaff: r.finalStaff ?? '',
      agency: r.agency ?? '',
      sheetRegion: r.sheetRegion as '東京' | '福岡',
      isHoliday: r.isHoliday ?? false,
    }));

    const tokyoStaffNames =
      (dbStaffNames.find((s) => s.sheetRegion === '東京')?.names as string[]) ?? [];
    const fukuokaStaffNames =
      (dbStaffNames.find((s) => s.sheetRegion === '福岡')?.names as string[]) ?? [];

    return NextResponse.json({ rows, tokyoStaffNames, fukuokaStaffNames });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'データの取得に失敗しました' },
      { status: 500 }
    );
  }
}
