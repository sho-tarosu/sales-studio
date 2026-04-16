import { NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheets';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  try {
    const rows = await getSheetData('スタッフ情報');

    const contacts: { name: string; role: string; contact: string }[] = [];

    // 1行目はヘッダーとしてスキップ
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const name    = row[19]?.trim(); // T列: 名前
      const role    = row[22]?.trim(); // W列: ロール
      const active  = row[23]?.trim(); // X列: 有効
      const contact = row[25]?.trim(); // Z列: 連絡先

      if (!name || active?.toUpperCase() !== 'TRUE') continue;
      if (!contact) continue;

      contacts.push({ name, role: role || '', contact });
    }

    return NextResponse.json(contacts);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
