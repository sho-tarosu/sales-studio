import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { talknotePosts } from '@/lib/schema';

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
  }).replace(/\//g, '-'); // 'YYYY-MM-DD'
  const date = searchParams.get('date') || today;

  const posts = await db
    .select()
    .from(talknotePosts)
    .where(eq(talknotePosts.date, date))
    .orderBy(talknotePosts.postedAt);

  // site → staffName → messages[] の形にグループ化
  const siteMap: Record<string, Record<string, { postedAt: string; message: string }[]>> = {};
  for (const post of posts) {
    const site = post.site || '店舗未確定';
    if (!siteMap[site]) siteMap[site] = {};
    if (!siteMap[site][post.staffName]) siteMap[site][post.staffName] = [];
    siteMap[site][post.staffName].push({ postedAt: post.postedAt, message: post.message });
  }

  return NextResponse.json({ date, siteMap });
}
