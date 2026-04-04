'use client';

import { useState, useEffect } from 'react';

interface ShiftSite {
  location: string;
  staff: string[];
  agency: string;
}

interface SiteMap {
  [site: string]: {
    [staffName: string]: { postedAt: string; message: string }[];
  };
}

interface TalknoteData {
  date: string;
  siteOrder: ShiftSite[];
  siteMap: SiteMap;
}

const PILL_COLORS = [
  { bg: 'rgba(248,113,113,0.20)', text: '#f87171' },
  { bg: 'rgba(251,146,60,0.20)',  text: '#fb923c' },
  { bg: 'rgba(250,204,21,0.20)',  text: '#facc15' },
  { bg: 'rgba(163,230,53,0.20)',  text: '#a3e635' },
  { bg: 'rgba(74,222,128,0.20)',  text: '#4ade80' },
  { bg: 'rgba(45,212,191,0.20)',  text: '#2dd4bf' },
  { bg: 'rgba(34,211,238,0.20)',  text: '#22d3ee' },
  { bg: 'rgba(56,189,248,0.20)',  text: '#38bdf8' },
  { bg: 'rgba(129,140,248,0.20)', text: '#818cf8' },
  { bg: 'rgba(192,132,252,0.20)', text: '#c084fc' },
  { bg: 'rgba(244,114,182,0.20)', text: '#f472b6' },
  { bg: 'rgba(251,113,133,0.20)', text: '#fb7185' },
];

function agencyColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xfffffff;
  return PILL_COLORS[h % PILL_COLORS.length];
}

function normalizeSiteName(location: string): string {
  // IY → イトーヨーカドー に展開
  let name = location.replace(/^IY/, 'イトーヨーカドー');
  // スペース（半角・全角）以降を除去
  const spaceIdx = name.search(/[ 　]/);
  return spaceIdx === -1 ? name : name.slice(0, spaceIdx);
}

const WORK_KEYWORDS = [
  'MNP', '新規', 'NEW', 'new',
  'セルアップ', 'アップセル', 'cellup',
  'クレカ', 'ゴールド', '自銀', '金クレカ', '銀クレカ',
  '光', 'ひかり', '事変', '事業者変更', 'biglobe',
  'でんき', 'ガス',
  'SIM', 'sim', '端末',
  'docomo', 'ドコモ', 'UQ', '楽天', 'ワイモバイル', 'ahamo',
];

function isWorkRelated(message: string): boolean {
  return WORK_KEYWORDS.some((kw) => message.toLowerCase().includes(kw.toLowerCase()));
}

function countWorkPosts(postsByStaff: SiteMap[string]): number {
  return Object.values(postsByStaff).reduce(
    (sum, posts) => sum + posts.filter((p) => isWorkRelated(p.message)).length,
    0
  );
}

function todayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function SiteCard({ site, staffList, agency, siteMap }: {
  site: string;
  staffList: string[];
  agency: string;
  siteMap: SiteMap;
}) {
  const postsByStaff = siteMap[site] ?? {};
  const workCount = countWorkPosts(postsByStaff);
  const hasReport = workCount > 0;

  return (
    <div style={{
      border: '1px solid var(--border-color)',
      borderRadius: 10,
      marginBottom: 8,
      overflow: 'hidden',
    }}>
      {/* ヘッダー */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        padding: '9px 12px',
        background: 'rgba(255,255,255,0.025)',
        borderBottom: hasReport ? '1px solid var(--border-color)' : 'none',
      }}>
        {/* 現場名 */}
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', flexShrink: 0 }}>
          {normalizeSiteName(site)}
        </span>

        {/* 代理店バッジ */}
        {agency && (() => { const c = agencyColor(agency); return (
          <span style={{
            fontSize: 10,
            color: c.text,
            background: c.bg,
            border: `1px solid ${c.text}44`,
            borderRadius: 4,
            padding: '1px 6px',
            flexShrink: 0,
          }}>
            {agency}
          </span>
        ); })()}

        {/* スタッフバッジ */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flex: 1, minWidth: 0 }}>
          {staffList.map((name) => (
            <span key={name} style={{
              fontSize: 10,
              color: '#aaa',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 4,
              padding: '1px 6px',
              whiteSpace: 'nowrap',
            }}>
              {name}
            </span>
          ))}
        </div>

        {/* 件数バッジ */}
        {hasReport && (
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--accent-color)',
            background: 'rgba(229,62,62,0.12)',
            border: '1px solid rgba(229,62,62,0.25)',
            borderRadius: 20,
            padding: '2px 9px',
            marginLeft: 'auto',
            flexShrink: 0,
          }}>
            {workCount}件
          </span>
        )}
      </div>

      {/* コンテンツ */}
      {hasReport ? (
        <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(postsByStaff).map(([staffName, posts]) => {
            const workPosts = posts.filter((p) => isWorkRelated(p.message));
            if (workPosts.length === 0) return null;
            return (
              <div key={staffName}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-sub)',
                  marginBottom: 4,
                  letterSpacing: '0.02em',
                }}>
                  {staffName}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 8 }}>
                  {workPosts.map((post, idx) => (
                    <div key={idx} style={{
                      fontSize: 12,
                      color: 'var(--text-main)',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.65,
                      opacity: 0.85,
                    }}>
                      {post.message}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          padding: '7px 12px',
          fontSize: 11,
          color: 'var(--text-muted)',
        }}>
          報告なし
        </div>
      )}
    </div>
  );
}

export default function TalknoteCard() {
  const [date, setDate] = useState(todayString());
  const [data, setData] = useState<TalknoteData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/talknote?date=${date}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [date]);

  // スタッフがいる現場のみ（シフト順）
  const orderedSites = data
    ? data.siteOrder.filter((s) => s.staff.length > 0)
    : [];

  const totalReports = orderedSites.reduce((sum, s) => {
    return sum + countWorkPosts(data?.siteMap[s.location] ?? {});
  }, 0);

  return (
    <div className="chart-card" style={{ marginTop: 16, minHeight: 'unset' }}>
      {/* カードヘッダー */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 'bold', color: 'var(--text-main)' }}>
            稼働
          </h3>
          {!loading && data && totalReports > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>
              {totalReports}件の報告
            </span>
          )}
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 6,
            color: 'var(--text-main)',
            fontSize: 12,
            padding: '3px 8px',
            cursor: 'pointer',
          }}
        />
      </div>

      {loading && (
        <div style={{ color: 'var(--text-sub)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
          読み込み中...
        </div>
      )}

      {!loading && orderedSites.length === 0 && (
        <div style={{ color: 'var(--text-sub)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
          この日のシフトデータはありません
        </div>
      )}

      {!loading && data && orderedSites.map((s) => (
        <SiteCard
          key={s.location}
          site={s.location}
          staffList={s.staff}
          agency={s.agency}
          siteMap={data.siteMap}
        />
      ))}
    </div>
  );
}
