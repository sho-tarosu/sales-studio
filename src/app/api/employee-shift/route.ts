import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { employeeShifts } from '@/lib/schema';

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
    const shifts = await db
      .select()
      .from(employeeShifts)
      .where(eq(employeeShifts.month, month));

    if (shifts.length === 0) {
      return NextResponse.json({ staff: [], dates: [], cells: {} });
    }

    // dates の順序を保持しつつ重複排除
    const datesMap = new Map<string, string>();
    const staffSet = new Set<string>();
    const cells: Record<string, Record<string, string>> = {};

    for (const s of shifts) {
      if (!datesMap.has(s.date)) datesMap.set(s.date, s.dayOfWeek ?? '');
      staffSet.add(s.staffName);
      if (!cells[s.date]) cells[s.date] = {};
      cells[s.date][s.staffName] = s.value ?? '';
    }

    const dates = Array.from(datesMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayOfWeek]) => ({ date, dayOfWeek }));

    const staff = Array.from(staffSet);

    return NextResponse.json({ staff, dates, cells });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'データの取得に失敗しました' },
      { status: 500 }
    );
  }
}
