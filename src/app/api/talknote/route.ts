import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { talknotePosts, shiftRows } from '@/lib/schema';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const today = new Date().toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-');
  const date = searchParams.get('date') || today;

  // 'YYYY-MM-DD' → month='YYYY-MM', shiftDate='M/D'
  const [y, m, d] = date.split('-');
  const month = `${y}-${m}`;
  const shiftDate = `${parseInt(m)}/${parseInt(d)}`;

  const [posts, shifts] = await Promise.all([
    db.select()
      .from(talknotePosts)
      .where(eq(talknotePosts.date, date))
      .orderBy(talknotePosts.postedAt),
    db.select({
      location: shiftRows.location,
      staff: shiftRows.staff,
      agency: shiftRows.agency,
    })
      .from(shiftRows)
      .where(and(eq(shiftRows.month, month), eq(shiftRows.date, shiftDate)))
      .orderBy(shiftRows.id), // 挿入順 = シフト表の並び順
  ]);

  // シフト表の順で現場リストを構築（重複除去）
  const siteOrder: { location: string; staff: string[]; agency: string }[] = [];
  const seen = new Set<string>();
  for (const row of shifts) {
    if (!row.location || seen.has(row.location)) continue;
    seen.add(row.location);
    siteOrder.push({
      location: row.location,
      staff: (row.staff as string[]) ?? [],
      agency: row.agency ?? '',
    });
  }

  // site → staffName → posts[] のマップ
  const siteMap: Record<string, Record<string, { postedAt: string; message: string }[]>> = {};
  for (const post of posts) {
    const site = post.site || '店舗未確定';
    if (!siteMap[site]) siteMap[site] = {};
    if (!siteMap[site][post.staffName]) siteMap[site][post.staffName] = [];
    siteMap[site][post.staffName].push({ postedAt: post.postedAt, message: post.message });
  }

  return NextResponse.json({ date, siteOrder, siteMap });
}
