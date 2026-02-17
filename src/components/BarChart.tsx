'use client';

import { useEffect, useRef } from 'react';
import { Staff } from '@/types';

interface BarChartProps {
  ranking: Staff[];
  limit?: number;
  nameWidth?: number;
}

export default function BarChart({ ranking, limit, nameWidth = 100 }: BarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const items = limit ? ranking.slice(0, limit) : ranking;
  const maxVal = items.length > 0 ? items[0].total : 1;

  useEffect(() => {
    // Trigger animation after mount
    const bars = containerRef.current?.querySelectorAll('.bar-fill') as NodeListOf<HTMLElement>;
    if (bars) {
      requestAnimationFrame(() => {
        bars.forEach((bar) => {
          bar.style.width = bar.dataset.width || '0%';
        });
      });
    }
  }, [items]);

  return (
    <div className="bar-chart-container" ref={containerRef}>
      {items.map((staff) => {
        const percent = (staff.total / maxVal) * 100;
        return (
          <div key={staff.name} className="bar-row">
            <div className="bar-name" style={{ width: nameWidth }}>{staff.name}</div>
            <div className="bar-area">
              <div className="bar-fill" data-width={`${percent}%`} style={{ width: 0 }} />
              <div className="bar-val">{staff.total}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
