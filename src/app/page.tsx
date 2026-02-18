'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
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

const TAB_TITLES: Record<TabName, string> = {
  'dashboard': '獲得状況',
  'visual-ranking': 'ランキング',
  'stacked-chart': 'MNP・新規・SU',
  'ranking': 'ランキング (詳細)',
  'analysis': '分析・比較',
  'attendance': '出勤管理',
  'shift': 'シフト',
};

export default function Home() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');

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
  const [shiftFetchedMonth, setShiftFetchedMonth] = useState<string | null>(null);

  const fetchShift = useCallback(async (month: string) => {
    setShiftLoading(true);
    try {
      const res = await fetch(`/api/shift?month=${month}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'シフトデータの取得に失敗しました');
      }
      const json: { rows: ShiftRow[]; tokyoStaffNames: string[]; fukuokaStaffNames: string[] } = await res.json();
      setShiftRows(json.rows);
      setTokyoStaffNames(json.tokyoStaffNames);
      setFukuokaStaffNames(json.fukuokaStaffNames);
      setShiftFetchedMonth(month);
    } catch {
      setShiftRows([]);
    } finally {
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
      setLastUpdate(`最終更新: ${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedMonth);
  }, [selectedMonth, fetchData]);

  // シフトタブが表示中に月が変わったら再取得
  useEffect(() => {
    if (activeTab === 'shift') {
      fetchShift(selectedMonth);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  // シフトタブに切り替わったとき（未取得 or 月が変わっていたら取得）
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
          <div className="header-left">
            <h1 className="page-title">{TAB_TITLES[activeTab]}</h1>
            <input
              type="month"
              value={selectedMonth}
              onChange={handleMonthChange}
            />
          </div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>{lastUpdate}</div>
        </header>

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
              <div className="chart-card" style={{ height: 'calc(100vh - 150px)' }}>
                <h3 style={{ fontSize: '14px', color: 'var(--text-sub)', marginBottom: '10px' }}>
                  ランキング (全スタッフ)
                </h3>
                <BarChart ranking={data.ranking} />
              </div>
            )}

            {activeTab === 'stacked-chart' && (
              <div className="chart-card" style={{ height: 'calc(100vh - 150px)' }}>
                <StackedBarChart ranking={data.ranking} />
              </div>
            )}

            {activeTab === 'ranking' && (
              <RankingTable ranking={data.ranking} />
            )}

            {activeTab === 'analysis' && (
              <AnalysisView data={data} />
            )}

            {activeTab === 'attendance' && (
              <AttendanceTable data={data} selectedMonth={selectedMonth} />
            )}
          </>
        )}

        {activeTab === 'shift' && (
          <ShiftView
            rows={shiftRows}
            tokyoStaffNames={tokyoStaffNames}
            fukuokaStaffNames={fukuokaStaffNames}
            loading={shiftLoading}
            selectedMonth={selectedMonth}
          />
        )}
      </main>

      <BottomNav onTabChange={setActiveTab} />
    </AuthGuard>
  );
}
