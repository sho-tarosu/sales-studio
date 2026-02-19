'use client';

import { useState, useMemo } from 'react';
import type { ShiftRow } from '@/types';
import ShiftAnalysis from '@/components/ShiftAnalysis';

interface ShiftViewProps {
  rows: ShiftRow[];
  tokyoStaffNames: string[];
  fukuokaStaffNames: string[];
  loading: boolean;
  error: string | null;
  selectedMonth: string; // 'YYYY-MM'
}

// 代理店ごとに割り当てるカラーパレット（色相環を均等12分割・最大限視覚的に識別可能）
const PILL_COLORS = [
  { bg: 'rgba(248,113,113,0.20)', text: '#f87171', dot: '#ef4444' },  // 赤        0°
  { bg: 'rgba(251,146,60,0.20)',  text: '#fb923c', dot: '#f97316' },  // オレンジ  30°
  { bg: 'rgba(250,204,21,0.20)',  text: '#facc15', dot: '#eab308' },  // 黄        60°
  { bg: 'rgba(163,230,53,0.20)',  text: '#a3e635', dot: '#84cc16' },  // ライム    90°
  { bg: 'rgba(74,222,128,0.20)',  text: '#4ade80', dot: '#22c55e' },  // 緑       120°
  { bg: 'rgba(45,212,191,0.20)',  text: '#2dd4bf', dot: '#14b8a6' },  // ティール 180°
  { bg: 'rgba(34,211,238,0.20)',  text: '#22d3ee', dot: '#06b6d4' },  // シアン   210°
  { bg: 'rgba(56,189,248,0.20)',  text: '#38bdf8', dot: '#0ea5e9' },  // スカイ   240°
  { bg: 'rgba(129,140,248,0.20)', text: '#818cf8', dot: '#6366f1' },  // インディゴ270°
  { bg: 'rgba(192,132,252,0.20)', text: '#c084fc', dot: '#a855f7' },  // 紫       300°
  { bg: 'rgba(232,121,249,0.20)', text: '#e879f9', dot: '#d946ef' },  // フクシア 315°
  { bg: 'rgba(244,114,182,0.20)', text: '#f472b6', dot: '#ec4899' },  // ピンク   330°
];

// 代理店名を固定インデックスにマップ（月・地域をまたいでも色が変わらない）
function agencyColorIndex(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xfffffff;
  return h % PILL_COLORS.length;
}

// × 系の文字（✖ U+2716、× U+00D7 など）で始まる名前かどうか
function startsWithX(name: string): boolean {
  return /^[×✖✗✘]/.test(name);
}

type ViewMode = 'staff' | 'location';

export default function ShiftView({
  rows,
  tokyoStaffNames,
  fukuokaStaffNames,
  loading,
  error,
  selectedMonth,
}: ShiftViewProps) {
  const [regionFilter, setRegionFilter] = useState<'東京' | '福岡'>('東京');
  const [viewMode, setViewMode] = useState<ViewMode>('staff');
  const [pageMode, setPageMode] = useState<'shift' | 'analysis'>('shift');

  const staffNames = regionFilter === '東京' ? tokyoStaffNames : fukuokaStaffNames;

  const filtered = useMemo(
    () => rows.filter((r) => r.sheetRegion === regionFilter),
    [rows, regionFilter]
  );

  const selectedMonthNum = selectedMonth.split('-')[1];

  // 「2026年2月」形式の月ラベル
  const monthLabel = (() => {
    const [y, m] = selectedMonth.split('-');
    return `${y}年${parseInt(m)}月`;
  })();

  // ─── スタッフ別ビュー用 ────────────────────────────────────────────

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

  // (スタッフ名, 日付) → 代理店名
  const agencyShiftMap = useMemo(() => {
    const m: Record<string, Record<string, string>> = {};
    for (const row of filtered) {
      for (const staffName of row.staff) {
        if (!m[staffName]) m[staffName] = {};
        if (!m[staffName][row.date]) m[staffName][row.date] = row.agency;
      }
    }
    return m;
  }, [filtered]);

  // 代理店 → カラーマップ
  const agencyColors = useMemo(() => {
    const agencies = [...new Set(filtered.map((r) => r.agency))]
      .filter((ag) => ag && ag.trim() !== '' && !startsWithX(ag));

    const sorted = agencies
      .map((ag) => ({ ag, pref: agencyColorIndex(ag) }))
      .sort((a, b) => a.pref - b.pref || a.ag.localeCompare(b.ag));

    const used = new Set<number>();
    const map = new Map<string, typeof PILL_COLORS[0]>();
    for (const { ag, pref } of sorted) {
      let idx = pref;
      for (let i = 0; i < PILL_COLORS.length; i++) {
        if (!used.has(idx)) break;
        idx = (idx + 1) % PILL_COLORS.length;
      }
      used.add(idx);
      map.set(ag, PILL_COLORS[idx]);
    }
    return map;
  }, [filtered]);

  // 表示するスタッフ名（空名・×付き・当月シフトなしを除外）
  const visibleStaffNames = useMemo(
    () => staffNames.filter(
      (name) => name && name.trim() !== '' && !startsWithX(name) && shiftMap[name]
    ),
    [staffNames, shiftMap]
  );

  // ─── 現場別ビュー用 ────────────────────────────────────────────────

  // Y3/Q3 以降のヘッダー名を Set 化（現場別ビューで使用）
  const staffNameSet = useMemo(() => new Set(staffNames), [staffNames]);

  // 現場別ビュー用
  // ・×代理店・空現場を除外
  // ・staffNameSet に含まれるスタッフが1人もいない行は非表示
  // ・日付のみでソート（同一日付内はスプレッドシートの行順＝元の順序を維持）
  const locationRows = useMemo(() => {
    return filtered
      .filter((r) => {
        if (!r.location || !r.location.trim()) return false;
        if (startsWithX(r.agency)) return false;
        return r.staff.some(
          (s) => s && s.trim() !== '' && !startsWithX(s) && staffNameSet.has(s)
        );
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered, staffNameSet]);

  // 祝日の日付セット（スタッフ別ビューで参照）
  const holidaySet = useMemo(() => {
    const s = new Set<string>();
    for (const row of filtered) {
      if (row.isHoliday) s.add(row.date);
    }
    return s;
  }, [filtered]);

  // ─── 共通 ──────────────────────────────────────────────────────────

  // 今日の日付（MM/DD形式）
  const todayStr = useMemo(() => {
    const t = new Date();
    return `${String(t.getMonth() + 1).padStart(2, '0')}/${String(t.getDate()).padStart(2, '0')}`;
  }, []);

  // ─── Loading / Error / Empty ───────────────────────────────────────

  if (loading) {
    return (
      <div className="shift-loading">
        <div className="shift-loading-spinner" />
        <div>シフトデータを読み込んでいます...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shift-loading" style={{ color: '#f87171' }}>
        {error}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="shift-loading" style={{ color: 'var(--text-sub)' }}>
        この月のシフトデータはありません
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="shift-container">

      {/* Controls */}
      <div className="shift-controls">
        <div className="shift-controls-left">
          {/* ページモードトグル */}
          <div className="shift-region-toggle">
            <button
              className={`shift-region-btn${pageMode === 'shift' ? ' active' : ''}`}
              onClick={() => setPageMode('shift')}
            >
              シフト表
            </button>
            <button
              className={`shift-region-btn${pageMode === 'analysis' ? ' active' : ''}`}
              onClick={() => setPageMode('analysis')}
            >
              分析
            </button>
          </div>

          {/* 表示モードトグル（シフト表のみ） */}
          {pageMode === 'shift' && (
            <div className="shift-region-toggle">
              <button
                className={`shift-region-btn${viewMode === 'staff' ? ' active' : ''}`}
                onClick={() => setViewMode('staff')}
              >
                スタッフ別
              </button>
              <button
                className={`shift-region-btn${viewMode === 'location' ? ' active' : ''}`}
                onClick={() => setViewMode('location')}
              >
                現場別
              </button>
            </div>
          )}

          {/* 地域トグル */}
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
        </div>

        {/* メタ情報 */}
        <div className="shift-meta">
          {pageMode === 'analysis' ? (
            <span>{visibleStaffNames.length} 名</span>
          ) : viewMode === 'staff' ? (
            <>
              <span>{visibleStaffNames.length} 名</span>
              <span style={{ color: 'var(--border-color)' }}>·</span>
              <span>{dates.length} 日</span>
            </>
          ) : (
            <span>{locationRows.length} 件</span>
          )}
        </div>
      </div>

      {/* 代理店凡例（シフト表のみ） */}
      {pageMode === 'shift' && agencyColors.size > 0 && (
        <div className="shift-legend">
          {[...agencyColors.entries()].map(([agency, color]) => (
            <div key={agency} className="shift-legend-item">
              <span className="shift-legend-dot" style={{ background: color.dot }} />
              <span style={{ color: color.text }}>{agency}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── スタッフ別テーブル ── */}
      {pageMode === 'shift' && viewMode === 'staff' && (
        <div className="shift-table-card">
          <div className="shift-scroll">
            <table className="shift-table">
              <thead>
                <tr>
                  <th className="shift-sticky-col shift-col-label">
                    <div className="shift-label-month">{monthLabel}</div>
                    <div>Staff</div>
                  </th>
                  {dates.map((date) => {
                    const [mm, dd] = date.split('/');
                    const label =
                      mm === selectedMonthNum
                        ? parseInt(dd)
                        : `${parseInt(mm)}/${parseInt(dd)}`;
                    const day = dayOfWeekMap[date] ?? '';
                    const isToday = date === todayStr;
                    const isHoliday = holidaySet.has(date);
                    const isSat = day === '土' && !isHoliday;
                    const isSun = day === '日' || day === '祝' || isHoliday;
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
                        <div className={`shift-date-dow${isSat ? ' sat' : isSun ? ' sun' : ''}`}>
                          {day}
                        </div>
                      </th>
                    );
                  })}
                  <th className="shift-col-total">計</th>
                </tr>
              </thead>

              <tbody>
                {visibleStaffNames.map((staffName) => {
                  const rowShifts = shiftMap[staffName] ?? {};
                  const totalDays = Object.keys(rowShifts).length;

                  return (
                    <tr key={staffName} className="shift-row">
                      <td className="shift-sticky-col shift-staff-name">{staffName}</td>

                      {dates.map((date) => {
                        const locations = rowShifts[date] ?? [];
                        const day = dayOfWeekMap[date] ?? '';
                        const isToday = date === todayStr;
                        const isHoliday = holidaySet.has(date);
                        const isSat = day === '土' && !isHoliday;
                        const isSun = day === '日' || day === '祝' || isHoliday;
                        const agency = agencyShiftMap[staffName]?.[date];
                        const color = agency ? agencyColors.get(agency) : null;

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
      )}

      {/* ── 現場別テーブル ── */}
      {pageMode === 'shift' && viewMode === 'location' && (
        <div className="shift-table-card">
          <div className="shift-scroll">
            <table className="shift-table location-table">
              <thead>
                <tr>
                  <th className="shift-sticky-col loc-th loc-th-date">日付</th>
                  <th className="loc-th loc-th-dow">曜日</th>
                  <th className="loc-th loc-th-place">店舗名</th>
                  <th className="loc-th loc-th-time">時間</th>
                  <th className="loc-th loc-th-staff">スタッフ</th>
                  <th className="loc-th loc-th-agency">代理店</th>
                </tr>
              </thead>

              <tbody>
                {locationRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-sub)', fontSize: 13 }}>
                      表示できる現場データがありません
                    </td>
                  </tr>
                ) : (
                  locationRows.map((row, i) => {
                    const [mm, dd] = row.date.split('/');
                    const dateLabel =
                      mm === selectedMonthNum
                        ? parseInt(dd)
                        : `${parseInt(mm)}/${parseInt(dd)}`;
                    const isToday = row.date === todayStr;
                    const isSat = row.dayOfWeek === '土' && !row.isHoliday;
                    const isSun = row.dayOfWeek === '日' || row.dayOfWeek === '祝' || row.isHoliday;
                    const agencyColor = agencyColors.get(row.agency) ?? null;
                    // Y3/Q3 由来の staffNameSet に含まれる名前のみ表示
                    const visibleStaff = row.staff.filter(
                      (s) => s && s.trim() !== '' && !startsWithX(s) && staffNameSet.has(s)
                    );

                    return (
                      <tr key={`${row.date}-${row.location}-${i}`} className="shift-row">
                        {/* 日付 */}
                        <td
                          className={[
                            'shift-sticky-col',
                            'loc-date-cell',
                            isToday ? 'today' : '',
                            isSat ? 'weekend-sat' : '',
                            isSun ? 'weekend-sun' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          <span className="loc-date-num">{dateLabel}</span>
                        </td>

                        {/* 曜日 */}
                        <td className={['loc-dow-cell', isSat ? 'sat' : isSun ? 'sun' : ''].filter(Boolean).join(' ')}>
                          {row.dayOfWeek}
                        </td>

                        {/* 店舗名 */}
                        <td className="loc-place-cell">{row.location}</td>

                        {/* 時間 */}
                        <td className="loc-time-cell">{row.startTime}</td>

                        {/* スタッフ */}
                        <td className="loc-staff-cell">
                          <div className="loc-staff-list">
                            {visibleStaff.length > 0 ? (
                              visibleStaff.map((name) => (
                                <span key={name} className="loc-staff-chip">{name}</span>
                              ))
                            ) : (
                              <span style={{ color: 'var(--text-sub)', fontSize: 12 }}>—</span>
                            )}
                          </div>
                        </td>

                        {/* 代理店 */}
                        <td className="loc-agency-cell">
                          {agencyColor ? (
                            <span
                              className="loc-agency-badge"
                              style={{ background: agencyColor.bg, color: agencyColor.text }}
                            >
                              {row.agency}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-sub)', fontSize: 12 }}>
                              {row.agency}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* ── 分析 ── */}
      {pageMode === 'analysis' && (
        <ShiftAnalysis
          filtered={filtered}
          visibleStaffNames={visibleStaffNames}
          staffNameSet={staffNameSet}
        />
      )}

    </div>
  );
}
