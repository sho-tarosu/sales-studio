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
  'スタート',
  'SIM', 'sim', '端末',
  'docomo', 'ドコモ', 'UQ', '楽天', 'ワイモバイル', 'ahamo',
];

function isWorkRelated(message: string): boolean {
  return WORK_KEYWORDS.some((kw) => message.toLowerCase().includes(kw.toLowerCase()));
}

function todayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function SiteSection({ site, staffList, agency, siteMap }: {
  site: string;
  staffList: string[];
  agency: string;
  siteMap: SiteMap;
}) {
  const postsByStaff = siteMap[site] ?? {};

  return (
    <div style={{ marginBottom: 20 }}>
      {/* 現場ヘッダー */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: 4,
        marginBottom: 8,
      }}>
        <span style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--accent-color)' }}>
          {site}
        </span>
        {agency && (
          <span style={{ fontSize: 11, color: 'var(--text-sub)' }}>{agency}</span>
        )}
        {staffList.length > 0 && (
          <span style={{ fontSize: 11, color: 'var(--text-sub)', marginLeft: 4 }}>
            {staffList.join('・')}
          </span>
        )}
      </div>

      {/* 投稿 */}
      {Object.entries(postsByStaff).map(([staffName, posts]) => {
        const workPosts = posts.filter((p) => isWorkRelated(p.message));
        if (workPosts.length === 0) return null;
        return (
          <div key={staffName} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--text-main)', marginBottom: 4 }}>
              {staffName}
            </div>
            {workPosts.map((post, idx) => (
              <div key={idx} style={{
                fontSize: 12,
                color: 'var(--text-sub)',
                whiteSpace: 'pre-wrap',
                paddingLeft: 8,
                borderLeft: '2px solid var(--border-color)',
                marginBottom: 4,
              }}>
                {post.message}
              </div>
            ))}
          </div>
        );
      })}
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

  // シフト順の現場 + 店舗未確定（シフトにない投稿）
  const orderedSites: { location: string; staff: string[]; agency: string }[] = [];
  if (data) {
    // シフト表の順
    for (const s of data.siteOrder) {
      orderedSites.push(s);
    }
    // siteMap にあってシフト順に含まれていない現場を末尾に追加
    for (const site of Object.keys(data.siteMap)) {
      if (!orderedSites.some((s) => s.location === site)) {
        orderedSites.push({ location: site, staff: [], agency: '' });
      }
    }
  }

  return (
    <div className="chart-card" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 'bold', color: 'var(--text-main)' }}>
          現場レポート
        </h3>
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
        <div style={{ color: 'var(--text-sub)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
          読み込み中...
        </div>
      )}

      {!loading && orderedSites.length === 0 && (
        <div style={{ color: 'var(--text-sub)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
          この日のレポートはありません
        </div>
      )}

      {!loading && data && orderedSites.map((s) => (
        <SiteSection
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
