'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { RefreshCw } from 'lucide-react';
import { TabName, DashboardData, ShiftRow } from '@/types';
import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import KpiCards from '@/components/KpiCards';
import BarChart from '@/components/BarChart';
import StackedBarChart from '@/components/StackedBarChart';
import RankingList from '@/components/RankingList';
import RankingTable from '@/components/RankingTable';
import AnalysisView from '@/components/AnalysisView';
import AttendanceTable from '@/components/AttendanceTable';
import ShiftView from '@/components/ShiftView';
import ProfileView from '@/components/ProfileView';
import NippoAlert from '@/components/NippoAlert';

const TAB_TITLES: Record<TabName, string> = {
  'dashboard': '獲得状況',
  'visual-ranking': 'ランキング',
  'stacked-chart': 'MNP・新規・SU',
  'analysis': '分析・比較',
  'attendance': '出勤管理',
  'shift': 'シフト',
  'profile': 'プロフィール',
};

export default function Home() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');
  const [rankingView, setRankingView] = useState<'chart' | 'table'>('chart');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState('更新中...');

  const [shiftRows, setShiftRows] = useState<ShiftRow[]>([]);
  const [tokyoStaffNames, setTokyoStaffNames] = useState<string[]>([]);
  const [fukuokaStaffNames, setFukuokaStaffNames] = useState<string[]>([]);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [shiftError, setShiftError] = useState<string | null>(null);
  const [shiftFetchedMonth, setShiftFetchedMonth] = useState<string | null>(null);

  const fetchShift = useCallback(async (month: string) => {
    setShiftLoading(true);
    setShiftError(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000); // 15秒タイムアウト
    try {
      const res = await fetch(`/api/shift?month=${month}`, { signal: controller.signal });
      if (!res.ok) {
        const text = await res.text();
        let msg = 'シフトデータの取得に失敗しました';
        try { msg = JSON.parse(text).error || msg; } catch { /* ignore */ }
        throw new Error(msg);
      }
      const json: { rows: ShiftRow[]; tokyoStaffNames: string[]; fukuokaStaffNames: string[] } = await res.json();
      setShiftRows(json.rows);
      setTokyoStaffNames(json.tokyoStaffNames);
      setFukuokaStaffNames(json.fukuokaStaffNames);
    } catch (e) {
      const msg = e instanceof Error
        ? (e.name === 'AbortError' ? 'タイムアウトしました。再度お試しください。' : e.message)
        : 'シフトデータの取得に失敗しました';
      setShiftError(msg);
      setShiftRows([]);
    } finally {
      clearTimeout(timer);
      setShiftFetchedMonth(month); // 成功・失敗どちらでも更新して再トリガーを防ぐ
      setShiftLoading(false);
    }
  }, []);

  const fetchData = useCallback(async (month: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/data?month=${month}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'データの取得に失敗しました');
      }
      const json: DashboardData = await res.json();
      setData(json);
      const t = new Date();
      setLastUpdate(`最終更新: ${new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit' }).format(t)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedMonth);
  }, [selectedMonth, fetchData]);

  // シフトタブ表示中 or 切り替え時に（未取得 or 月が変わっていたら）取得
  useEffect(() => {
    if (activeTab === 'shift' && shiftFetchedMonth !== selectedMonth) {
      fetchShift(selectedMonth);
    }
  }, [activeTab, selectedMonth, shiftFetchedMonth, fetchShift]);

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(e.target.value);
  };

  return (
    <AuthGuard>
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userName={session?.user?.name}
        userRole={session?.user?.role}
      />

      <main className="main-content">
        <header className="header-area">
          <div className="header-top-row">
            <div className="header-left">
              <h1 className="page-title">{TAB_TITLES[activeTab]}</h1>
              {activeTab !== 'profile' && (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  aria-label="表示月を選択"
                />
              )}
            </div>
            {session?.user?.name && (
              <button
                onClick={() => setDrawerOpen(true)}
                className="header-avatar-btn"
                title={session.user.name}
              >
                {session.user.name.slice(0, 2)}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: '12px', color: '#aaa' }}>{lastUpdate}</div>
            <button
              onClick={() => {
                fetchData(selectedMonth);
                if (activeTab === 'shift') fetchShift(selectedMonth);
              }}
              title="更新"
              style={{
                background: 'none',
                border: 'none',
                padding: 4,
                cursor: 'pointer',
                color: '#aaa',
                display: 'flex',
                alignItems: 'center',
                opacity: 0.55,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.55')}
            >
              <RefreshCw size={16} strokeWidth={1.75} />
            </button>
          </div>
        </header>

        <NippoAlert />

        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
            データを読み込んでいます...
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: 40, color: '#ff4e45' }}>
            エラー: {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            {activeTab === 'dashboard' && (
              <>
                <KpiCards kpi={data.kpi} prevKpi={data.prevKpi} />
                <div className="dashboard-split">
                  <div className="chart-card">
                    <h3 style={{ fontSize: '14px', color: 'var(--text-sub)', marginBottom: '10px' }}>
                      Top 10 チャート
                    </h3>
                    <BarChart ranking={data.ranking} limit={10} />
                  </div>
                  <div className="ranking-card">
                    <div style={{ padding: '16px', borderBottom: '1px solid #333', fontWeight: 'bold' }}>
                      トップパフォーマー
                    </div>
                    <RankingList ranking={data.ranking} limit={5} />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'visual-ranking' && (
              <>
                <div className="shift-controls" style={{ marginBottom: '16px' }}>
                  <div className="shift-region-toggle">
                    <button
                      className={`shift-region-btn${rankingView === 'chart' ? ' active' : ''}`}
                      onClick={() => setRankingView('chart')}
                    >
                      グラフ
                    </button>
                    <button
                      className={`shift-region-btn${rankingView === 'table' ? ' active' : ''}`}
                      onClick={() => setRankingView('table')}
                    >
                      詳細
                    </button>
                  </div>
                </div>
                {rankingView === 'chart' ? (
                  <div className="chart-card" style={{ height: 'calc(100vh - 200px)' }}>
                    <BarChart ranking={data.ranking} />
                  </div>
                ) : (
                  <RankingTable ranking={data.ranking} />
                )}
              </>
            )}

            {activeTab === 'stacked-chart' && (
              <div className="chart-card" style={{ height: 'calc(100vh - 150px)' }}>
                <StackedBarChart ranking={data.ranking} />
              </div>
            )}

            {activeTab === 'analysis' && (
              <AnalysisView data={data} />
            )}

            {activeTab === 'attendance' && (
              <AttendanceTable data={data} selectedMonth={selectedMonth} loginName={session?.user?.name} />
            )}
          </>
        )}

        {activeTab === 'shift' && (
          <ShiftView
            rows={shiftRows}
            tokyoStaffNames={tokyoStaffNames}
            fukuokaStaffNames={fukuokaStaffNames}
            loading={shiftLoading}
            error={shiftError}
            selectedMonth={selectedMonth}
          />
        )}

        {activeTab === 'profile' && <ProfileView />}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ユーザードロワー */}
      {drawerOpen && (
        <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
      )}
      <div className={`user-drawer${drawerOpen ? ' open' : ''}`}>
        {session?.user?.name && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div className="header-avatar-btn" style={{ cursor: 'default', fontSize: 16, width: 48, height: 48 }}>
                {session.user.name.slice(0, 2)}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>{session.user.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>{session.user.role}</div>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              style={{
                width: '100%',
                padding: '10px',
                background: 'transparent',
                color: 'var(--text-sub)',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              ログアウト
            </button>
          </>
        )}
      </div>
    </AuthGuard>
  );
}
