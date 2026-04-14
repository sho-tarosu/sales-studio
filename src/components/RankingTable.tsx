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
              <th style={{ textAlign: 'center', width: 32, paddingLeft: 4, paddingRight: 4 }}>順位</th>
              <th style={{ minWidth: 120 }}>名前</th>
              {COLUMNS.map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => setSortKey(key)}
                  style={{
                    cursor: 'pointer',
                    color: sortKey === key ? '#ff4e45' : undefined,
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                  }}
                >
                  {label}
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
                <td style={{ color: '#3ea6ff', fontWeight: 'bold' }}>{staff.total}</td>
                <td style={{ color: staff.selfClose > 0 ? '#f97316' : 'var(--text-sub)' }}>{staff.selfClose}</td>
                <td>{staff.mnp}</td>
                <td>{staff.new}</td>
                <td>{staff.change}</td>
                <td>{staff.hikari}</td>
                <td>{staff.tablet}</td>
                <td>{staff.other}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
