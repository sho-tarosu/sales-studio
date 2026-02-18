'use client';

import { TabName } from '@/types';

interface BottomNavProps {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
}

const navItems: { id: TabName; icon: string; label: string }[] = [
  { id: 'dashboard', icon: '🏠', label: 'ホーム' },
  { id: 'visual-ranking', icon: '📊', label: 'ランク' },
  { id: 'ranking', icon: '📜', label: '詳細' },
  { id: 'analysis', icon: '📈', label: '分析' },
  { id: 'attendance', icon: '📅', label: '出勤' },
  { id: 'shift', icon: '🗓️', label: 'シフト' },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <div
          key={item.id}
          className={`menu-item${activeTab === item.id ? ' active' : ''}`}
          onClick={() => onTabChange(item.id)}
        >
          <div>{item.icon}</div>
          <div style={{ fontSize: '10px' }}>{item.label}</div>
        </div>
      ))}
    </nav>
  );
}
