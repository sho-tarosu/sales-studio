'use client';

import { useState, useMemo, useEffect } from 'react';
import { DashboardData, Staff } from '@/types';

interface AttendanceTableProps {
  data: DashboardData;
  selectedMonth: string; // 'YYYY-MM'
  loginName?: string;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

type CalendarKey = 'pt' | 'selfClose' | 'mnp' | 'new' | 'uq' | 'nw' | 'elec' | 'credit';

const rows: { label: string; key: CalendarKey; isTotal?: boolean }[] = [
  { label: '獲得pt', key: 'pt', isTotal: true },
  { label: '自己クロ', key: 'selfClose' },
  { label: 'MNP', key: 'mnp' },
  { label: '新規', key: 'new' },
  { label: 'UQ→au', key: 'uq' },
  { label: 'NW', key: 'nw' },
  { label: 'でんガス', key: 'elec' },
  { label: 'クレカ', key: 'credit' },
];

export default function AttendanceTable({ data, selectedMonth, loginName }: AttendanceTableProps) {
  const initialName = (loginName && data.ranking.find((s) => s.name === loginName))
    ? loginName
    : data.ranking[0]?.name || '';
  const [staffName, setStaffName] = useState(initialName);
  const staff = data.ranking.find((s) => s.name === staffName);

  // ログインユーザーの未提出日（日番号のSet）
  const [missingDays, setMissingDays] = useState<Set<number>>(new Set());
  useEffect(() => {
    if (staffName !== loginName) { setMissingDays(new Set()); return; }
    fetch('/api/nippo-check')
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data.missingDates)) return;
        const days = new Set<number>(data.missingDates.map((d: string) => parseInt(d.split('-')[2])));
        setMissingDays(days);
      })
      .catch(() => {});
  }, [staffName, loginName]);

  const yearMonth = useMemo(() => {
    const parts = selectedMonth.split('-');
    return { year: parseInt(parts[0]), month: parseInt(parts[1]) - 1 };
  }, [selectedMonth]);

  if (!staff || !staff.calendar) {
    return (
      <>
        <div className="analysis-controls">
          <div className="control-group">
            <span className="control-label">スタッフ選択</span>
            <select className="control-select" value={staffName} onChange={(e) => setStaffName(e.target.value)}>
              {data.ranking.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="chart-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 20, textAlign: 'center' }}>データがありません</div>
        </div>
      </>
    );
  }

  const days = data.daysInMonth;

  return (
    <>
      <div className="analysis-controls">
        <div className="control-group">
          <span className="control-label">スタッフ選択</span>
          <select className="control-select" value={staffName} onChange={(e) => setStaffName(e.target.value)}>
            {data.ranking.map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="chart-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="calendar-wrapper">
          <table className="cal-table">
            <thead>
              <tr>
                <th className="cal-label-col">日付</th>
                {Array.from({ length: days }, (_, i) => (
                  <th key={i} style={missingDays.has(i + 1) ? { background: 'rgba(180,30,30,0.35)' } : undefined}>{i + 1}</th>
                ))}
              </tr>
              <tr>
                <th className="cal-label-col">曜日</th>
                {Array.from({ length: days }, (_, i) => {
                  const dateObj = new Date(yearMonth.year, yearMonth.month, i + 1);
                  const dayOfWeek = WEEKDAYS[dateObj.getDay()];
                  const colorStyle = dayOfWeek === '土' ? '#3ea6ff' : dayOfWeek === '日' ? '#ff4e45' : undefined;
                  return (
                    <th key={i} style={{
                      ...(colorStyle ? { color: colorStyle } : {}),
                      ...(missingDays.has(i + 1) ? { background: 'rgba(180,30,30,0.35)' } : {}),
                    }}>
                      {dayOfWeek}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td className={`cal-label-col ${row.isTotal ? 'row-total' : ''}`}>{row.label}</td>
                  {Array.from({ length: days }, (_, i) => {
                    const val = staff.calendar[i][row.key];
                    const displayVal = val === 0 || val === undefined ? '-' : val;
                    const cls = val === 0 || val === undefined ? 'cal-data-cell zero' : 'cal-data-cell';
                    return (
                      <td key={i} className={`${cls} ${row.isTotal ? 'row-total' : ''}`}
                        style={missingDays.has(i + 1) ? { background: 'rgba(180,30,30,0.25)' } : undefined}>
                        {displayVal}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td className="cal-label-col">現場</td>
                {Array.from({ length: days }, (_, i) => (
                  <td key={i} className="cal-data-cell cal-site-cell"
                    style={missingDays.has(i + 1) ? { background: 'rgba(180,30,30,0.25)' } : undefined}>
                    {staff.calendar[i].site || ''}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
