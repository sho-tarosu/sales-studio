'use client';

import { useState } from 'react';
import type { ShiftRow } from '@/types';

interface ShiftViewProps {
  rows: ShiftRow[];
  tokyoStaffNames: string[];
  fukuokaStaffNames: string[];
  loading: boolean;
  selectedMonth: string; // 'YYYY-MM'
}

export default function ShiftView({
  rows,
  tokyoStaffNames,
  fukuokaStaffNames,
  loading,
  selectedMonth,
}: ShiftViewProps) {
  const [regionFilter, setRegionFilter] = useState<'東京' | '福岡'>('東京');

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
        シフトデータを読み込んでいます...
      </div>
    );
  }

  const staffNames = regionFilter === '東京' ? tokyoStaffNames : fukuokaStaffNames;
  const filtered = rows.filter((r) => r.sheetRegion === regionFilter);

  // 選択月の月番号（例: "2026-02" → "02"）
  const selectedMonthNum = selectedMonth.split('-')[1];

  // 日付一覧（MM/DD形式で辞書順ソート → 自然な時系列順になる）
  const dates = [...new Set(filtered.map((r) => r.date))].sort((a, b) =>
    a.localeCompare(b)
  );

  // 日付 → 曜日マップ
  const dayOfWeekMap: Record<string, string> = {};
  for (const row of filtered) {
    dayOfWeekMap[row.date] = row.dayOfWeek;
  }

  // (スタッフ名, 日付) → 勤務場所リスト
  const shiftMap: Record<string, Record<string, string[]>> = {};
  for (const row of filtered) {
    for (const staffName of row.staff) {
      if (!shiftMap[staffName]) shiftMap[staffName] = {};
      if (!shiftMap[staffName][row.date]) shiftMap[staffName][row.date] = [];
      shiftMap[staffName][row.date].push(row.location);
    }
  }

  return (
    <div>
      <div className="analysis-controls">
        <div className="control-group">
          <span className="control-label">地域</span>
          <select
            className="control-select"
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value as '東京' | '福岡')}
          >
            <option value="東京">東京</option>
            <option value="福岡">福岡</option>
          </select>
        </div>
        <div style={{ fontSize: '12px', color: '#aaa', alignSelf: 'flex-end', paddingBottom: '8px' }}>
          {staffNames.length} 名 / {dates.length} 日
        </div>
      </div>

      <div className="chart-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="calendar-wrapper">
          <table className="cal-table" style={{ fontSize: '11px' }}>
            <thead>
              <tr>
                <th className="cal-label-col">社員</th>
                {dates.map((date) => {
                  const [mm, dd] = date.split('/');
                  const label = mm === selectedMonthNum ? parseInt(dd) : `${parseInt(mm)}/${parseInt(dd)}`;
                  return (
                    <th key={date} style={{ minWidth: '36px', padding: '6px 4px' }}>
                      {label}
                    </th>
                  );
                })}
              </tr>
              <tr>
                <th className="cal-label-col">曜日</th>
                {dates.map((date) => {
                  const day = dayOfWeekMap[date] ?? '';
                  const color =
                    day === '土' ? '#3ea6ff' : day === '日' || day === '祝' ? '#ff4e45' : undefined;
                  return (
                    <th key={date} style={color ? { color, padding: '4px' } : { padding: '4px' }}>
                      {day}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {staffNames.map((staffName) => (
                <tr key={staffName}>
                  <td className="cal-label-col" style={{ fontSize: '12px' }}>
                    {staffName}
                  </td>
                  {dates.map((date) => {
                    const locations = shiftMap[staffName]?.[date] ?? [];
                    const text = locations.length > 0 ? locations[0].slice(0, 4) : '';
                    const title = locations.join('\n');
                    return (
                      <td
                        key={date}
                        className={`cal-data-cell${text ? '' : ' zero'}`}
                        title={title}
                        style={{ padding: '4px 2px', textAlign: 'center', fontSize: '10px' }}
                      >
                        {text || ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
