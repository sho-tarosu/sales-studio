'use client';

import { useState, useMemo } from 'react';
import type { ShiftRow } from '@/types';

interface ShiftViewProps {
  rows: ShiftRow[];
  tokyoStaffNames: string[];
  fukuokaStaffNames: string[];
  loading: boolean;
  selectedMonth: string; // 'YYYY-MM'
}

// 勤務地ごとに割り当てるカラーパレット（黒・グレー・白・赤）
const PILL_COLORS = [
  { bg: 'rgba(229,62,62,0.22)',   text: '#fc8181', dot: '#e53e3e' },   // 赤
  { bg: 'rgba(255,255,255,0.10)', text: '#d4d4d4', dot: '#aaaaaa' },   // 明るいグレー
  { bg: 'rgba(185,28,28,0.20)',   text: '#fca5a5', dot: '#b91c1c' },   // 暗い赤
  { bg: 'rgba(180,180,180,0.10)', text: '#b0b0b0', dot: '#888888' },   // 中グレー
  { bg: 'rgba(220,38,38,0.14)',   text: '#f87171', dot: '#dc2626' },   // 中赤
  { bg: 'rgba(255,255,255,0.07)', text: '#999999', dot: '#666666' },   // 暗いグレー
  { bg: 'rgba(239,68,68,0.18)',   text: '#fca5a5', dot: '#ef4444' },   // 薄赤
  { bg: 'rgba(255,255,255,0.13)', text: '#cccccc', dot: '#999999' },   // 白よりグレー
  { bg: 'rgba(153,27,27,0.22)',   text: '#f87171', dot: '#991b1b' },   // 深赤
  { bg: 'rgba(150,150,150,0.08)', text: '#a8a8a8', dot: '#777777' },   // 薄グレー
];

export default function ShiftView({
  rows,
  tokyoStaffNames,
  fukuokaStaffNames,
  loading,
  selectedMonth,
}: ShiftViewProps) {
  const [regionFilter, setRegionFilter] = useState<'東京' | '福岡'>('東京');

  const staffNames = regionFilter === '東京' ? tokyoStaffNames : fukuokaStaffNames;

  const filtered = useMemo(
    () => rows.filter((r) => r.sheetRegion === regionFilter),
    [rows, regionFilter]
  );

  const selectedMonthNum = selectedMonth.split('-')[1];

  // 日付一覧（ソート済み）
  const dates = useMemo(
    () => [...new Set(filtered.map((r) => r.date))].sort((a, b) => a.localeCompare(b)),
    [filtered]
  );

  // 日付 → 曜日マップ
  const dayOfWeekMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const row of filtered) m[row.date] = row.dayOfWeek;
    return m;
  }, [filtered]);

  // (スタッフ名, 日付) → 勤務場所リスト
  const shiftMap = useMemo(() => {
    const m: Record<string, Record<string, string[]>> = {};
    for (const row of filtered) {
      for (const staffName of row.staff) {
        if (!m[staffName]) m[staffName] = {};
        if (!m[staffName][row.date]) m[staffName][row.date] = [];
        m[staffName][row.date].push(row.location);
      }
    }
    return m;
  }, [filtered]);

  // 勤務地 → カラーマップ
  const locationColors = useMemo(() => {
    const locs = [...new Set(filtered.map((r) => r.location))].sort();
    return new Map(locs.map((loc, i) => [loc, PILL_COLORS[i % PILL_COLORS.length]]));
  }, [filtered]);

  // 今日の日付（MM/DD形式）
  const todayStr = useMemo(() => {
    const t = new Date();
    return `${String(t.getMonth() + 1).padStart(2, '0')}/${String(t.getDate()).padStart(2, '0')}`;
  }, []);

  // ─── Loading ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="shift-loading">
        <div className="shift-loading-spinner" />
        <div>シフトデータを読み込んでいます...</div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="shift-container">

      {/* Controls */}
      <div className="shift-controls">
        <div className="shift-region-toggle">
          {(['東京', '福岡'] as const).map((region) => (
            <button
              key={region}
              className={`shift-region-btn${regionFilter === region ? ' active' : ''}`}
              onClick={() => setRegionFilter(region)}
            >
              {region}
            </button>
          ))}
        </div>
        <div className="shift-meta">
          <span>{staffNames.length} 名</span>
          <span style={{ color: 'var(--border-color)' }}>·</span>
          <span>{dates.length} 日</span>
        </div>
      </div>

      {/* Location Legend */}
      {locationColors.size > 0 && (
        <div className="shift-legend">
          {[...locationColors.entries()].map(([loc, color]) => (
            <div key={loc} className="shift-legend-item">
              <span className="shift-legend-dot" style={{ background: color.dot }} />
              <span style={{ color: color.text }}>{loc}</span>
            </div>
          ))}
        </div>
      )}

      {/* Calendar Table */}
      <div className="shift-table-card">
        <div className="shift-scroll">
          <table className="shift-table">
            <thead>
              <tr>
                <th className="shift-sticky-col shift-col-label">スタッフ</th>
                {dates.map((date) => {
                  const [mm, dd] = date.split('/');
                  const label =
                    mm === selectedMonthNum
                      ? parseInt(dd)
                      : `${parseInt(mm)}/${parseInt(dd)}`;
                  const day = dayOfWeekMap[date] ?? '';
                  const isToday = date === todayStr;
                  const isSat = day === '土';
                  const isSun = day === '日' || day === '祝';
                  return (
                    <th
                      key={date}
                      className={[
                        'shift-col-date',
                        isToday ? 'today' : '',
                        isSat ? 'weekend-sat' : '',
                        isSun ? 'weekend-sun' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <div className="shift-date-num">{label}</div>
                      <div
                        className={`shift-date-dow${isSat ? ' sat' : isSun ? ' sun' : ''}`}
                      >
                        {day}
                      </div>
                    </th>
                  );
                })}
                <th className="shift-col-total">計</th>
              </tr>
            </thead>

            <tbody>
              {staffNames.map((staffName) => {
                const rowShifts = shiftMap[staffName] ?? {};
                const totalDays = Object.keys(rowShifts).length;

                return (
                  <tr key={staffName} className="shift-row">
                    <td className="shift-sticky-col shift-staff-name">{staffName}</td>

                    {dates.map((date) => {
                      const locations = rowShifts[date] ?? [];
                      const day = dayOfWeekMap[date] ?? '';
                      const isToday = date === todayStr;
                      const isSat = day === '土';
                      const isSun = day === '日' || day === '祝';
                      const color =
                        locations.length > 0 ? locationColors.get(locations[0]) : null;

                      return (
                        <td
                          key={date}
                          className={[
                            'shift-data-cell',
                            isToday ? 'today' : '',
                            isSat ? 'weekend-sat' : '',
                            isSun ? 'weekend-sun' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          title={locations.join('\n')}
                        >
                          {color && locations.length > 0 && (
                            <div
                              className="shift-pill"
                              style={{ background: color.bg, color: color.text }}
                            >
                              {locations[0].slice(0, 4)}
                              {locations.length > 1 && (
                                <span className="shift-pill-extra">
                                  +{locations.length - 1}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}

                    <td className="shift-total-cell">
                      {totalDays > 0 ? totalDays : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
