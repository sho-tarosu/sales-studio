'use client';

import { Staff } from '@/types';

interface StackedBarChartProps {
  ranking: Staff[];
}

export default function StackedBarChart({ ranking }: StackedBarChartProps) {
  const maxVal = ranking.length > 0 ? ranking[0].total : 1;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '14px', color: 'var(--text-sub)' }}>獲得内訳 (MNP・新規・SU)</h3>
        <div className="stacked-legend">
          <div className="legend-box">
            <div className="color-box" style={{ background: 'var(--accent-color)' }} />
            MNP
          </div>
          <div className="legend-box">
            <div className="color-box" style={{ background: 'var(--accent-yellow)' }} />
            新規・セルアップ
          </div>
        </div>
      </div>
      <div className="bar-chart-container">
        {ranking.map((staff) => {
          const pMnp = (staff.mnp / maxVal) * 100;
          const pNew = (staff.new / maxVal) * 100;
          const pCu = (staff.change / maxVal) * 100;
          const stackSum = (staff.mnp + staff.new + staff.change).toFixed(2);
          return (
            <div key={staff.name} className="bar-row">
              <div className="bar-name">{staff.name}</div>
              <div className="bar-area">
                <div className="bar-part bar-part-mnp" style={{ width: `${pMnp}%` }} />
                <div className="bar-part bar-part-new" style={{ width: `${pNew}%` }} />
                <div className="bar-part bar-part-cu" style={{ width: `${pCu}%` }} />
                <div className="bar-val">{stackSum}</div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
