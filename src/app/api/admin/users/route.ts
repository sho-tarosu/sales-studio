import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllUsers } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  if ((session.user.role as string) !== '管理者') return NextResponse.json({ error: '権限がありません' }, { status: 403 });

  const users = await getAllUsers();
  return NextResponse.json(users);
}
