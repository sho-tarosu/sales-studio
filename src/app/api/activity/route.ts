import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserById, updateLastLogin } from '@/lib/sheets';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const user = await getUserById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: 'user not found' }, { status: 404 });
  }

  await updateLastLogin(user.rowIndex);
  return NextResponse.json({ ok: true });
}
