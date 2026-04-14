'use client';

import { useEffect, useRef } from 'react';
import { Staff } from '@/types';

interface BarChartProps {
  ranking: Staff[];
  limit?: number;
  nameWidth?: number;
  getValue?: (s: Staff) => number;
  color?: string;
}

export default function BarChart({ ranking, limit, nameWidth = 100, getValue, color }: BarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const getVal = getValue ?? ((s: Staff) => s.total);
  const items = limit ? ranking.slice(0, limit) : ranking;
  const maxVal = items.reduce((m, s) => Math.max(m, getVal(s)), 0) || 1;

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
        const val = getVal(staff);
        const percent = (val / maxVal) * 100;
        return (
          <div key={staff.name} className="bar-row">
            <div className="bar-name" style={{ width: nameWidth }}>{staff.name}</div>
            <div className="bar-area">
              <div className="bar-fill" data-width={`${percent}%`} style={{ width: 0, ...(color ? { background: color } : {}) }} />
              <div className="bar-val">{val}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
