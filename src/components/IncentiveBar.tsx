'use client';

interface Tier {
  name: string;
  pt: number;
  incentive: number;
  selfClosePt: number | null;
}

const TIERS: Tier[] = [
  { name: 'グリーン',         pt:  0, incentive:     0, selfClosePt: null },
  { name: 'ビギナー',         pt:  5, incentive:  1000, selfClosePt: null },
  { name: 'レギュラー',       pt: 10, incentive:  2000, selfClosePt: null },
  { name: 'ブロンズ',         pt: 15, incentive:  3000, selfClosePt: 10 },
  { name: 'クローザー',       pt: 20, incentive:  4000, selfClosePt: 15 },
  { name: 'トップクローザー', pt: 25, incentive:  5000, selfClosePt: 20 },
  { name: 'レジェンド',       pt: 30, incentive:  8000, selfClosePt: 30 },
  { name: 'ゼウス',           pt: 40, incentive:  9000, selfClosePt: 40 },
  { name: 'ゼウス+',          pt: 50, incentive: 10000, selfClosePt: 50 },
  { name: 'ゼウス++',         pt: 60, incentive: 11000, selfClosePt: 60 },
];

const ZONES = [
  { label: 'グリーン〜ブロンズ',    min: 0,  max: 15,  color: '#4ade80', trackColor: 'rgba(74,222,128,0.15)',  step: 5  },
  { label: 'クローザー〜レジェンド', min: 15, max: 30,  color: '#60a5fa', trackColor: 'rgba(96,165,250,0.15)',  step: 5  },
  { label: 'ゼウス',                min: 30, max: 100, color: '#f87171', trackColor: 'rgba(248,113,113,0.15)', step: 10 },
];

function getCurrentTier(total: number, selfClose: number): number {
  let idx = 0;
  for (let i = TIERS.length - 1; i >= 0; i--) {
    const t = TIERS[i];
    const ptOk = total >= t.pt;
    const scOk = t.selfClosePt === null || selfClose >= t.selfClosePt;
    if (ptOk && scOk) { idx = i; break; }
  }
  return idx;
}

function zoneProgress(total: number, min: number, max: number): number {
  if (total <= min) return 0;
  if (total >= max) return 100;
  return ((total - min) / (max - min)) * 100;
}

export default function IncentiveBar({ total, selfClose }: { total: number; selfClose: number }) {
  const currentIdx = getCurrentTier(total, selfClose);
  const current = TIERS[currentIdx];
  const next = TIERS[currentIdx + 1] ?? null;

  return (
    <div className="chart-card" style={{ marginBottom: 12 }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: 11, color: 'var(--text-sub)', marginRight: 6 }}>現在クラス</span>
          <span style={{ fontSize: 18, fontWeight: 'bold', color: 'var(--text-main)' }}>{current.name}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 11, color: 'var(--text-sub)', marginRight: 4 }}>インセン</span>
          <span style={{ fontSize: 16, fontWeight: 'bold', color: '#facc15' }}>
            ¥{current.incentive.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 3本ゾーンバー */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 16 }}>
        {ZONES.map((zone) => {
          const pct = zoneProgress(total, zone.min, zone.max);
          const isActive = total >= zone.min && total < zone.max;
          const range = zone.max - zone.min;

          // zone内のすべての目盛りpt（両端含む）
          const allTicks: number[] = [];
          for (let pt = zone.min; pt <= zone.max; pt += zone.step) {
            allTicks.push(pt);
          }
          const tickPct = (pt: number) => ((pt - zone.min) / range) * 100;

          return (
            <div key={zone.label}>
              {/* ゾーンラベル（右の範囲表示は削除） */}
              <div style={{ fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: isActive ? zone.color : 'var(--text-sub)', fontWeight: isActive ? 600 : 400 }}>
                  {zone.label}
                </span>
              </div>

              {/* バー＋目盛りコンテナ（上にランク名の余白） */}
              <div style={{ position: 'relative', paddingTop: 18, paddingBottom: 16 }}>
                {/* バー本体 */}
                <div style={{ background: zone.trackColor, borderRadius: 6, height: 8, overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: zone.color,
                    borderRadius: 6,
                    transition: 'width 0.6s ease',
                    opacity: pct === 0 ? 0.3 : 1,
                  }} />
                </div>

                {/* 目盛り＋ランク名 */}
                {allTicks.map((pt, i) => {
                  const tierName = TIERS.find(t => t.pt === pt)?.name ?? null;
                  const left = i === 0 ? '0%' : i === allTicks.length - 1 ? '100%' : `${tickPct(pt)}%`;
                  const isLast = i === allTicks.length - 1;
                  return (
                    <div key={pt} style={{
                      position: 'absolute',
                      left,
                      top: 0,
                      transform: isLast ? 'translateX(-100%)' : i === 0 ? 'none' : 'translateX(-50%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isLast ? 'flex-end' : i === 0 ? 'flex-start' : 'center',
                      pointerEvents: 'none',
                    }}>
                      {/* ランク名（上） */}
                      {tierName && (
                        <span style={{
                          fontSize: 9,
                          color: total >= pt ? zone.color : 'rgba(255,255,255,0.25)',
                          fontWeight: total >= pt ? 600 : 400,
                          whiteSpace: 'nowrap',
                          lineHeight: 1,
                          marginBottom: 2,
                        }}>
                          {tierName}
                        </span>
                      )}
                      {!tierName && <span style={{ height: 11, display: 'block' }} />}
                      {/* 目盛り線 */}
                      <div style={{ width: 1, height: 4, background: 'rgba(255,255,255,0.2)', marginTop: 8 }} />
                      {/* pt数字（下） */}
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', lineHeight: 1, marginTop: 2 }}>
                        {pt}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 次のクラスの条件 */}
      {next && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-sub)', marginBottom: 6 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{next.name}</span> まで
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--text-sub)' }}>獲得</span>
              <span style={{ color: 'var(--text-main)' }}>{next.pt}pt以上</span>
              {total >= next.pt ? (
                <span style={{ color: '#4ade80', fontWeight: 700, fontSize: 12 }}>clear</span>
              ) : (
                <span style={{ color: 'var(--text-sub)', fontSize: 12 }}>あと {Math.ceil((next.pt - total) * 10) / 10}pt</span>
              )}
            </div>
            {next.selfClosePt !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <span style={{ color: 'var(--text-sub)' }}>自己クロ</span>
                <span style={{ color: 'var(--text-main)' }}>{next.selfClosePt}pt以上</span>
                {selfClose >= next.selfClosePt ? (
                  <span style={{ color: '#4ade80', fontWeight: 700, fontSize: 12 }}>clear</span>
                ) : (
                  <span style={{ color: 'var(--text-sub)', fontSize: 12 }}>あと {Math.ceil((next.selfClosePt - selfClose) * 10) / 10}pt</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 最高クラス達成時 */}
      {!next && (
        <div style={{ textAlign: 'center', color: '#facc15', fontWeight: 700, fontSize: 14 }}>
          最高クラス達成！
        </div>
      )}
    </div>
  );
}
