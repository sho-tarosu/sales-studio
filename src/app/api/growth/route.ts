import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { staffEvaluations } from '@/lib/schema';
import { StaffEvaluation } from '@/types';

export async function GET() {
  try {
  const rows = await db
    .select()
    .from(staffEvaluations)
    .orderBy(asc(staffEvaluations.rank));

  const data: StaffEvaluation[] = rows.map((r) => ({
    staffName: r.staffName,
    totalScore: Number(r.totalScore),
    rank: Number(r.rank),
    potential: r.potential ?? '',
    attendance: r.attendance ?? '',
    attribute: r.attribute ?? '',
    supervisor: r.supervisor ?? '',
    scores: (r.scores as Record<string, number>) ?? {},
    knowledge: (r.knowledge as Record<string, boolean>) ?? {},
    knowledgeItems: (r.knowledgeItems as string[]) ?? [],
  }));

  return NextResponse.json(data);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
