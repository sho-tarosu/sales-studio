'use client';

import { TabName } from '@/types';
import { signOut } from 'next-auth/react';

interface SidebarProps {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
  userName?: string;
  userRole?: string;
}

const menuItems: { id: TabName; label: string }[] = [
  { id: 'dashboard', label: 'ダッシュボード' },
  { id: 'visual-ranking', label: 'ランキング' },
  { id: 'stacked-chart', label: 'MNP・新規・SU' },
  { id: 'ranking', label: 'ランキング (詳細)' },
  { id: 'analysis', label: '分析・比較' },
  { id: 'attendance', label: '出勤管理' },
  { id: 'shift', label: 'シフト' },
];

export default function Sidebar({ activeTab, onTabChange, userName, userRole }: SidebarProps) {
  return (
    <nav className="sidebar">
      <div className="brand">
        <div>▶</div>
        <div>Sales Studio</div>
      </div>
      {menuItems.map((item) => (
        <div
          key={item.id}
          className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
          onClick={() => onTabChange(item.id)}
        >
          {item.label}
        </div>
      ))}
      {userName && (
        <div style={{
          marginTop: 'auto',
          padding: '16px 24px',
          borderTop: '1px solid #3e3e3e',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
            {userName}
          </div>
          <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>
            {userRole}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{
              marginTop: '10px',
              padding: '6px 12px',
              background: 'transparent',
              color: '#aaa',
              border: '1px solid #444',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            ログアウト
          </button>
        </div>
      )}
    </nav>
  );
}
