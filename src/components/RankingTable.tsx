'use client';

import { Staff } from '@/types';

interface RankingTableProps {
  ranking: Staff[];
}

export default function RankingTable({ ranking }: RankingTableProps) {
  return (
    <div className="chart-card">
      <div className="table-wrapper">
        <table className="full-ranking-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'center', width: 48 }}>順位</th>
              <th style={{ minWidth: 120 }}>名前</th>
              <th>合計</th>
              <th>MNP</th>
              <th>新規</th>
              <th>機変</th>
              <th>ひかり</th>
              <th>タブ</th>
              <th>他</th>
              <th>自己クロ</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((staff, i) => (
              <tr key={staff.name}>
                <td style={{ textAlign: 'center', color: i < 3 ? '#facc15' : 'var(--text-sub)', fontWeight: i < 3 ? 700 : 400 }}>
                  {i + 1}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>{staff.name}</td>
                <td style={{ color: '#3ea6ff', fontWeight: 'bold' }}>{staff.total}</td>
                <td>{staff.mnp}</td>
                <td>{staff.new}</td>
                <td>{staff.change}</td>
                <td>{staff.hikari}</td>
                <td>{staff.tablet}</td>
                <td>{staff.other}</td>
                <td style={{ color: staff.selfClose > 0 ? '#f97316' : 'var(--text-sub)' }}>{staff.selfClose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
