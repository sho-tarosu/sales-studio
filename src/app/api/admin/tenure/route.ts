import { NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheets';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function calcTenure(raw: string): { years: number; months: number; totalMonths: number } {
  if (!raw) return { years: 0, months: 0, totalMonths: 0 };
  const serial = Number(raw);
  let join: Date;
  if (!isNaN(serial) && serial > 10000) {
    join = new Date((serial - 25569) * 86400 * 1000);
  } else {
    join = new Date(raw.replace(/\//g, '-'));
  }
  if (isNaN(join.getTime())) return { years: 0, months: 0, totalMonths: 0 };

  const today = new Date();
  let years = today.getFullYear() - join.getFullYear();
  let months = today.getMonth() - join.getMonth();
  if (today.getDate() < join.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  const totalMonths = Math.max(0, years * 12 + months);
  return { years, months, totalMonths };
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }
  const role = session.user?.role as string;
  if (role !== '管理者' && role !== '社員') {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  }

  try {
    const rows = await getSheetData('スタッフ情報');
    const result: { name: string; joinDate: string; years: number; months: number; totalMonths: number }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row      = rows[i];
      const name     = row[19]?.trim(); // T列: 名前
      const active   = row[23]?.trim(); // X列: 有効
      const joinDate = row[9]?.trim();  // J列: 入社日

      if (!name || active?.toUpperCase() !== 'TRUE' || !joinDate) continue;

      const tenure = calcTenure(joinDate);
      if (tenure.totalMonths === 0) continue;

      result.push({ name, joinDate, ...tenure });
    }

    result.sort((a, b) => b.totalMonths - a.totalMonths);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
