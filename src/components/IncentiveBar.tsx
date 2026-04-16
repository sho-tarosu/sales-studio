'use client';

interface Tier {
  name: string;
  pt: number;
  incentive: number;
  selfClosePt: number | null; // null = 条件なし
}

const TIERS: Tier[] = [
  { name: 'グリーン',       pt:  0, incentive:     0, selfClosePt: null },
  { name: 'ビギナー',       pt:  5, incentive:  1000, selfClosePt: null },
  { name: 'レギュラー',     pt: 10, incentive:  2000, selfClosePt: null },
  { name: 'ブロンズ',       pt: 15, incentive:  3000, selfClosePt: 10 },
  { name: 'クローザー',     pt: 20, incentive:  4000, selfClosePt: 15 },
  { name: 'トップクローザー', pt: 25, incentive:  5000, selfClosePt: 20 },
  { name: 'レジェンド',     pt: 30, incentive:  8000, selfClosePt: 30 },
  { name: 'ゼウス',         pt: 40, incentive:  9000, selfClosePt: 40 },
  { name: 'ゼウス+',        pt: 50, incentive: 10000, selfClosePt: 50 },
  { name: 'ゼウス++',       pt: 60, incentive: 11000, selfClosePt: 60 },
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

export default function IncentiveBar({ total, selfClose }: { total: number; selfClose: number }) {
  const currentIdx = getCurrentTier(total, selfClose);
  const current = TIERS[currentIdx];
  const next = TIERS[currentIdx + 1] ?? null;

  const barFrom = current.pt;
  const barTo = next ? next.pt : current.pt;
  const progress = barTo > barFrom
    ? Math.min(((total - barFrom) / (barTo - barFrom)) * 100, 100)
    : 100;

  return (
    <div className="chart-card" style={{ marginBottom: 12 }}>
      {/* 現在クラス */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
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

      {/* プログレスバー */}
      {next && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-sub)', marginBottom: 4 }}>
            <span>{current.name} ({barFrom}pt)</span>
            <span>{next.name} ({barTo}pt)</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 6, height: 10, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #f97316, #facc15)',
              borderRadius: 6,
              transition: 'width 0.6s ease',
            }} />
          </div>

          {/* 次のクラスの条件 */}
          <div style={{ fontSize: 12, color: 'var(--text-sub)', marginBottom: 4 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{next.name}</span> の条件
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* 獲得pt条件 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--text-sub)' }}>獲得</span>
              <span style={{ color: 'var(--text-main)' }}>{next.pt}pt以上</span>
              {total >= next.pt ? (
                <span style={{ color: '#4ade80', fontWeight: 700, fontSize: 12 }}>clear</span>
              ) : (
                <span style={{ color: 'var(--text-sub)', fontSize: 12 }}>あと {Math.ceil((next.pt - total) * 10) / 10}pt</span>
              )}
            </div>

            {/* 自己クロ条件 */}
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
        </>
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
