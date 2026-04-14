'use client';

import { useState } from 'react';
import { Staff } from '@/types';

type SortKey = 'total' | 'selfClose' | 'mnp' | 'new' | 'change' | 'hikari' | 'tablet' | 'other';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'total',     label: '獲得合計' },
  { key: 'selfClose', label: '自己クロ' },
  { key: 'mnp',       label: 'MNP' },
  { key: 'new',       label: '新規' },
  { key: 'change',    label: '機変' },
  { key: 'hikari',    label: 'ひかり' },
  { key: 'tablet',    label: 'タブ' },
  { key: 'other',     label: '自銀・クレカ' },
];

interface RankingTableProps {
  ranking: Staff[];
}

export default function RankingTable({ ranking }: RankingTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('total');

  const sorted = [...ranking].sort((a, b) => b[sortKey] - a[sortKey]);

  return (
    <div className="chart-card">
      <div className="table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table className="full-ranking-table" style={{ minWidth: 700 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'center', width: 48 }}>順位</th>
              <th style={{ minWidth: 120 }}>名前</th>
              {COLUMNS.map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => setSortKey(key)}
                  style={{
                    cursor: 'pointer',
                    color: sortKey === key ? '#3ea6ff' : undefined,
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                  }}
                >
                  {label}{sortKey === key ? ' ▼' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((staff, i) => (
              <tr key={staff.name}>
                <td style={{ textAlign: 'center', color: i < 3 ? '#facc15' : 'var(--text-sub)', fontWeight: i < 3 ? 700 : 400 }}>
                  {i + 1}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>{staff.name}</td>
                <td style={{ color: sortKey === 'total' ? '#3ea6ff' : undefined, fontWeight: sortKey === 'total' ? 'bold' : undefined }}>{staff.total}</td>
                <td style={{ color: sortKey === 'selfClose' ? '#3ea6ff' : staff.selfClose > 0 ? '#f97316' : 'var(--text-sub)' }}>{staff.selfClose}</td>
                <td style={{ color: sortKey === 'mnp' ? '#3ea6ff' : undefined }}>{staff.mnp}</td>
                <td style={{ color: sortKey === 'new' ? '#3ea6ff' : undefined }}>{staff.new}</td>
                <td style={{ color: sortKey === 'change' ? '#3ea6ff' : undefined }}>{staff.change}</td>
                <td style={{ color: sortKey === 'hikari' ? '#3ea6ff' : undefined }}>{staff.hikari}</td>
                <td style={{ color: sortKey === 'tablet' ? '#3ea6ff' : undefined }}>{staff.tablet}</td>
                <td style={{ color: sortKey === 'other' ? '#3ea6ff' : undefined }}>{staff.other}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
