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
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-color)', flexShrink: 0 }}>
          {site}
        </span>

        {/* 代理店バッジ */}
        {agency && (
          <span style={{
            fontSize: 10,
            color: 'var(--text-sub)',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 4,
            padding: '1px 6px',
            flexShrink: 0,
          }}>
            {agency}
          </span>
        )}

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
    <div className="chart-card" style={{ marginTop: 16 }}>
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
