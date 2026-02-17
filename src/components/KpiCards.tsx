'use client';

import { KPI } from '@/types';

interface KpiCardsProps {
  kpi: KPI;
  prevKpi: KPI;
}

function calcDiff(curr: number, old: number | undefined): React.ReactNode {
  if (old === undefined || old === null) return <span className="diff-zero">-</span>;
  const diff = Math.round((curr - old) * 100) / 100;
  if (diff > 0) return <span className="diff-plus">▲ {diff}</span>;
  if (diff < 0) return <span className="diff-minus">▼ {Math.abs(diff)}</span>;
  return <span className="diff-zero">±0</span>;
}

const kpiItems: { key: string; title: string; kpiField: keyof KPI; prevField: keyof KPI }[] = [
  { key: 'total', title: '総獲得数', kpiField: 'total', prevField: 'total' },
  { key: 'mnp', title: 'MNP', kpiField: 'mnp', prevField: 'mnp' },
  { key: 'new', title: '純新規', kpiField: 'new', prevField: 'new' },
  { key: 'cellup', title: '機変＋セルアップ', kpiField: 'change', prevField: 'change' },
  { key: 'hikari', title: 'ひかり', kpiField: 'hikari', prevField: 'hikari' },
];

export default function KpiCards({ kpi, prevKpi }: KpiCardsProps) {
  return (
    <div className="kpi-grid">
      {kpiItems.map((item) => (
        <div key={item.key} className="kpi-card">
          <div className="kpi-title">{item.title}</div>
          <div className="kpi-value">{kpi[item.kpiField]}</div>
          <div className="kpi-row">
            <span className="kpi-unit">Pt</span>
            <span className="diff-val">
              {calcDiff(kpi[item.kpiField], prevKpi[item.prevField])}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
