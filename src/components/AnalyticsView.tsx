'use client';

import { useState } from 'react';
import { DashboardData } from '@/types';
import AttendanceTable from './AttendanceTable';
import AnalysisView from './AnalysisView';
import IncentiveBar from './IncentiveBar';

interface AnalyticsViewProps {
  data: DashboardData;
  selectedMonth: string;
  loginName?: string;
  userRole?: string;
  myStats?: { total: number; selfClose: number } | null;
}

export default function AnalyticsView({ data, selectedMonth, loginName, userRole, myStats }: AnalyticsViewProps) {
  const [innerTab, setInnerTab] = useState<'attendance' | 'analysis'>('attendance');

  return (
    <div>
      {/* 内部タブ */}
      <div className="shift-controls" style={{ marginBottom: 16 }}>
        <div className="shift-region-toggle">
          <button
            className={`shift-region-btn${innerTab === 'attendance' ? ' active' : ''}`}
            onClick={() => setInnerTab('attendance')}
          >
            個人実績
          </button>
          <button
            className={`shift-region-btn${innerTab === 'analysis' ? ' active' : ''}`}
            onClick={() => setInnerTab('analysis')}
          >
            分析・比較
          </button>
        </div>
      </div>

      {innerTab === 'attendance' && (
        <>
          <div style={{ marginBottom: 28 }}>
            <AttendanceTable
              data={data}
              selectedMonth={selectedMonth}
              loginName={loginName}
              userRole={userRole}
            />
          </div>
          {userRole === 'アルバイト' && myStats && (
            <IncentiveBar total={myStats.total} selfClose={myStats.selfClose} />
          )}
        </>
      )}
      {innerTab === 'analysis' && (
        <AnalysisView data={data} />
      )}
    </div>
  );
}
