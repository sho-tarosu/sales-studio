import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { salesRecords } from '@/lib/schema';
import { sql, and, like } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.name) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const rows = await db
    .select({
      total: sql<number>`
        ROUND(SUM(
          CAST(mnp_h AS numeric) + CAST(mnp_s AS numeric) +
          CAST(new_count AS numeric) + CAST(change_count AS numeric) + CAST(cellup AS numeric) +
          CAST(hikari_n AS numeric) + CAST(hikari_t AS numeric) + CAST(hikari_c AS numeric) +
          CAST(tablet AS numeric) + CAST(life AS numeric) + CAST(credit AS numeric)
        ) * 100) / 100`,
      selfClose: sql<number>`ROUND(SUM(CAST(self_close AS numeric)) * 100) / 100`,
    })
    .from(salesRecords)
    .where(
      and(
        sql`staff_name = ${session.user.name}`,
        like(salesRecords.date, `${yearMonth}%`)
      )
    );

  const row = rows[0];
  return NextResponse.json({
    total: Number(row?.total ?? 0),
    selfClose: Number(row?.selfClose ?? 0),
  });
}
