import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSheetData } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  try {
    const rows = await getSheetData('スタッフ情報');
    const userId = session.user.id;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[20]?.trim() !== userId) continue; // U列: ユーザーID

      return NextResponse.json({
        base: row[1]?.trim() ?? '',       // B列: 拠点
        birthday: row[4]?.trim() ?? '',   // E列: 生年月日
        bloodType: row[8]?.trim() ?? '',  // I列: 血液型
        animal: row[13]?.trim() ?? '',    // N列: 動物占い
        zodiac: row[17]?.trim() ?? '',    // R列: 星座
      });
    }

    return NextResponse.json({ birthday: '', bloodType: '', animal: '', zodiac: '' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
