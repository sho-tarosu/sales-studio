'use client';

import { useMemo } from 'react';
import type { ShiftRow } from '@/types';

interface Props {
  filtered: ShiftRow[];
  visibleStaffNames: string[];
  staffNameSet: Set<string>;
}

function startsWithX(name: string): boolean {
  return /^[×✖✗✘]/.test(name);
}

export default function ShiftAnalysis({ filtered, visibleStaffNames, staffNameSet }: Props) {
  // ─── 代理店一覧（× 除外・ソート済み） ────────────────────────────
  const agencies = useMemo(() => {
    const set = new Set<string>();
    for (const row of filtered) {
      if (row.agency && row.agency.trim() && !startsWithX(row.agency)) {
        set.add(row.agency);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'ja'));
  }, [filtered]);

  // ─── A. スタッフ × 代理店 カウント ──────────────────────────────
  const agencyMatrix = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    for (const s of visibleStaffNames) m[s] = {};
    for (const row of filtered) {
      if (!row.agency?.trim() || startsWithX(row.agency)) continue;
      for (const staffName of row.staff) {
        if (!staffName?.trim() || startsWithX(staffName) || !staffNameSet.has(staffName)) continue;
        if (!(staffName in m)) continue;
        m[staffName][row.agency] = (m[staffName][row.agency] ?? 0) + 1;
      }
    }
    return m;
  }, [filtered, visibleStaffNames, staffNameSet]);

  // ─── B. スタッフ × スタッフ 同一現場カウント ─────────────────────
  const pairingMatrix = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    for (const s of visibleStaffNames) m[s] = {};
    for (const row of filtered) {
      const valid = row.staff.filter(
        (s) => s?.trim() && !startsWithX(s) && staffNameSet.has(s) && s in m
      );
      for (let i = 0; i < valid.length; i++) {
        for (let j = i + 1; j < valid.length; j++) {
          const a = valid[i];
          const b = valid[j];
          m[a][b] = (m[a][b] ?? 0) + 1;
          m[b][a] = (m[b][a] ?? 0) + 1;
        }
      }
    }
    return m;
  }, [filtered, visibleStaffNames, staffNameSet]);

  // ─── 最大値（色スケール用） ──────────────────────────────────────
  const agencyMax = useMemo(() => {
    let max = 1;
    for (const s of visibleStaffNames)
      for (const ag of agencies) {
        const v = agencyMatrix[s]?.[ag] ?? 0;
        if (v > max) max = v;
      }
    return max;
  }, [agencyMatrix, visibleStaffNames, agencies]);

  const pairingMax = useMemo(() => {
    let max = 1;
    for (let i = 0; i < visibleStaffNames.length; i++)
      for (let j = 0; j < visibleStaffNames.length; j++) {
        if (i === j) continue;
        const v = pairingMatrix[visibleStaffNames[i]]?.[visibleStaffNames[j]] ?? 0;
        if (v > max) max = v;
      }
    return max;
  }, [pairingMatrix, visibleStaffNames]);

  if (visibleStaffNames.length === 0) {
    return (
      <div className="shift-loading" style={{ color: 'var(--text-sub)' }}>
        この月のスタッフデータがありません
      </div>
    );
  }

  return (
    <div className="shift-analysis">

      {/* A. 代理店・キャリア別稼働 */}
      <section className="analysis-card">
        <div className="analysis-card-header">
          <h2 className="analysis-title">代理店・キャリア別稼働</h2>
          <p className="analysis-sub">スタッフが各代理店に入った回数（日）</p>
        </div>
        <div className="analysis-scroll">
          <table className="heatmap-table">
            <thead>
              <tr>
                <th className="hm-corner" />
                {agencies.map((ag) => (
                  <th key={ag} className="hm-col-th">
                    <div className="hm-col-label">{ag}</div>
                  </th>
                ))}
                <th className="hm-col-th hm-total-th">
                  <div className="hm-col-label">合計</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleStaffNames.map((staff) => {
                const rowData = agencyMatrix[staff] ?? {};
                const total = Object.values(rowData).reduce((s, v) => s + v, 0);
                return (
                  <tr key={staff}>
                    <td className="hm-row-th">{staff}</td>
                    {agencies.map((ag) => {
                      const val = rowData[ag] ?? 0;
                      return (
                        <td
                          key={ag}
                          className="hm-cell hm-agency-cell"
                          style={{ '--intensity': val / agencyMax } as React.CSSProperties}
                          title={val > 0 ? `${staff} × ${ag}: ${val}回` : undefined}
                        >
                          {val > 0 ? val : ''}
                        </td>
                      );
                    })}
                    <td className="hm-cell hm-total-cell">
                      {total > 0 ? total : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* B. スタッフ組み合わせマトリックス */}
      <section className="analysis-card">
        <div className="analysis-card-header">
          <h2 className="analysis-title">スタッフ組み合わせ</h2>
          <p className="analysis-sub">同じ現場・同じ日に一緒に入った回数</p>
        </div>
        <div className="analysis-scroll">
          <table className="heatmap-table">
            <thead>
              <tr>
                <th className="hm-corner" />
                {visibleStaffNames.map((name) => (
                  <th key={name} className="hm-col-th">
                    <div className="hm-col-label">{name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleStaffNames.map((rowStaff) => (
                <tr key={rowStaff}>
                  <td className="hm-row-th">{rowStaff}</td>
                  {visibleStaffNames.map((colStaff) => {
                    if (rowStaff === colStaff) {
                      return <td key={colStaff} className="hm-cell hm-self-cell" />;
                    }
                    const val = pairingMatrix[rowStaff]?.[colStaff] ?? 0;
                    return (
                      <td
                        key={colStaff}
                        className="hm-cell hm-pair-cell"
                        style={{ '--intensity': val / pairingMax } as React.CSSProperties}
                        title={val > 0 ? `${rowStaff} × ${colStaff}: ${val}回` : undefined}
                      >
                        {val > 0 ? val : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
