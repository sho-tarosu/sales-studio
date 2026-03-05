'use client';

import { useEffect, useState } from 'react';


interface ProfileData {
  prefectures: Record<string, number>;
  regions: Record<string, number>;
  bloodTypes: Record<string, number>;
  total: number;
}


const BLOOD_TYPE_COLORS: Record<string, string> = {
  'A型': '#4285F4',
  'B型': '#EA4335',
  'O型': '#34A853',
  'AB型': '#9c27b0',
};

// ブロックの端から約2mm外側にラベル配置
// push: モバイル時にラベルをさらに外側へ動かす方向
const OVERLAY_POS: Record<string, { top: string; left: string; push: 'up' | 'down' | 'left' | 'right' }> = {
  '海外':       { top: '20%', left: '19%', push: 'left'  },
  '北海道':     { top: '19%', left: '57%', push: 'up'    },
  '東北':       { top: '49%', left: '83%', push: 'right' },
  '関東':       { top: '65%', left: '82%', push: 'right' },
  '中部':       { top: '79%', left: '55%', push: 'down'  },
  '関西':       { top: '50%', left: '45%', push: 'up'    },
  '中国':       { top: '50%', left: '35%', push: 'up'    },
  '四国':       { top: '76%', left: '30%', push: 'down'  },
  '九州・沖縄': { top: '50%', left: '12%', push: 'left'  },
};

// push方向に応じた translate オフセット（モバイル時に追加で外側へ）
const PUSH_TRANSFORM: Record<string, string> = {
  up:    'translate(-50%, -70%)',
  down:  'translate(-50%, -30%)',
  left:  'translate(-65%, -50%)',
  right: 'translate(-35%, -50%)',
};

function BloodTypeDonut({ bloodTypes }: { bloodTypes: Record<string, number> }) {
  const total = Object.values(bloodTypes).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const cx = 210, cy = 195;
  const outerR = 130, innerR = 72;

  const ORDER = ['A型', 'B型', 'O型', 'AB型'];
  const entries = ORDER
    .filter(t => (bloodTypes[t] || 0) > 0)
    .map(t => ({ type: t, count: bloodTypes[t], pct: Math.round(bloodTypes[t] / total * 100) }));

  let angle = -Math.PI / 2;
  const segments = entries.map(e => {
    const span = (e.count / total) * 2 * Math.PI;
    const start = angle;
    angle += span;
    return { ...e, start, end: angle, mid: start + span / 2 };
  });

  const pt = (a: number, r: number) => ({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });

  const arc = (s: number, e: number) => {
    const o0 = pt(s, outerR), o1 = pt(e, outerR);
    const i0 = pt(s, innerR), i1 = pt(e, innerR);
    const lg = e - s > Math.PI ? 1 : 0;
    return `M${o0.x} ${o0.y} A${outerR} ${outerR} 0 ${lg} 1 ${o1.x} ${o1.y} L${i1.x} ${i1.y} A${innerR} ${innerR} 0 ${lg} 0 ${i0.x} ${i0.y}Z`;
  };

  return (
    <svg viewBox="0 0 420 390" style={{ width: '100%', height: 'auto' }}>
      {segments.map(({ type, count, pct, start, end, mid }) => {
        const color = BLOOD_TYPE_COLORS[type] || '#888';
        const inside = pt(mid, (outerR + innerR) / 2);
        const lineStart = pt(mid, outerR + 6);
        const lineEnd = pt(mid, outerR + 28);
        const label = pt(mid, outerR + 34);
        const right = Math.cos(mid) >= 0;
        const anchor = right ? 'start' : 'end';

        return (
          <g key={type}>
            <path d={arc(start, end)} fill={color} />
            {/* セグメント内: 人数 */}
            <text x={inside.x} y={inside.y} textAnchor="middle" dominantBaseline="middle"
              fill="white" fontSize="15" fontWeight="bold">
              {count}名
            </text>
            {/* リーダーライン */}
            <line x1={lineStart.x} y1={lineStart.y} x2={lineEnd.x} y2={lineEnd.y}
              stroke={color} strokeWidth="1.5" />
            {/* 外側ラベル: 血液型名 */}
            <text x={label.x} y={label.y - 8} textAnchor={anchor} dominantBaseline="middle"
              fill="var(--text-sub)" fontSize="12" fontWeight="600">
              {type}
            </text>
            {/* 外側ラベル: % */}
            <text x={label.x} y={label.y + 9} textAnchor={anchor} dominantBaseline="middle"
              fill={color} fontSize="14" fontWeight="800">
              {pct}%
            </text>
          </g>
        );
      })}
      {/* 中央: 総勢 */}
      <text x={cx} y={cy - 12} textAnchor="middle" dominantBaseline="middle"
        fill="var(--text-sub)" fontSize="15">総勢</text>
      <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="middle"
        fill="var(--text-main)" fontSize="26" fontWeight="bold">{total}名</text>
    </svg>
  );
}

function JapanRegionMap({ regions }: { regions: Record<string, number> }) {
  const total = Object.values(regions).reduce((a, b) => a + b, 0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (total === 0) return null;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/japan-map.png" alt="日本地図" style={{ width: '100%', display: 'block', borderRadius: 8 }} />
      {Object.entries(regions)
        .filter(([, count]) => count > 0)
        .map(([region, count]) => {
          const pos = OVERLAY_POS[region];
          if (!pos) return null;
          const pct = Math.round((count / total) * 100);
          return (
            <div
              key={region}
              style={{
                position: 'absolute',
                top: pos.top,
                left: pos.left,
                transform: isMobile ? PUSH_TRANSFORM[pos.push] : 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
              }}
            >
              {/* 地方名 */}
              <div style={{
                fontSize: isMobile ? 'clamp(11px, 3vw, 20px)' : 'clamp(13px, 3vw, 20px)',
                fontWeight: '700',
                color: '#2a1a00',
                letterSpacing: '0.02em',
                marginBottom: 'clamp(2px, 0.8vw, 6px)',
              }}>
                {region}
              </div>
              {/* % */}
              <div style={{
                fontSize: isMobile ? 'clamp(36px, 7vw, 76px)' : 'clamp(38px, 7vw, 76px)',
                fontWeight: '900',
                color: '#e06e10',
                letterSpacing: '-1px',
                lineHeight: 1,
              }}>
                {pct}<span style={{ fontSize: '0.5em', fontWeight: '800', letterSpacing: 0 }}>%</span>
              </div>
            </div>
          );
        })}
    </div>
  );
}

export default function ProfileView() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => {
        if (!r.ok) return r.json().then((e: { error?: string }) => { throw new Error(e.error || 'エラー'); });
        return r.json();
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>データを読み込んでいます...</div>;
  }
  if (error) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#ff4e45' }}>エラー: {error}</div>;
  }
  if (!data) return null;

  return (
    <div style={{ padding: '0 0 80px' }}>
      {/* 総勢 */}
      <div className="chart-card" style={{ marginBottom: 12, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 32, fontWeight: 'bold', color: 'var(--accent-color)', lineHeight: 1 }}>{data.total}</span>
        <span style={{ fontSize: 14, color: 'var(--text-sub)' }}>名のスタッフ</span>
      </div>

      {/* 出身地 — 日本地図スタイル */}
      <div className="chart-card" style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: 'var(--text-main)' }}>出身地</h3>
        <JapanRegionMap regions={data.regions} />
      </div>

      {/* 血液型 */}
      <div className="chart-card">
        <h3 style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: 'var(--text-main)' }}>血液型</h3>
        <BloodTypeDonut bloodTypes={data.bloodTypes} />
      </div>
    </div>
  );
}
