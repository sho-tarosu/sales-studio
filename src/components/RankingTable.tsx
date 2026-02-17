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
              <th>#</th>
              <th>名前</th>
              <th>合計</th>
              <th>MNP</th>
              <th>新規</th>
              <th>機変</th>
              <th>ひかり</th>
              <th>タブ</th>
              <th>他</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((staff, i) => (
              <tr key={staff.name}>
                <td>{i + 1}</td>
                <td>{staff.name}</td>
                <td style={{ color: '#3ea6ff', fontWeight: 'bold' }}>{staff.total}</td>
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
