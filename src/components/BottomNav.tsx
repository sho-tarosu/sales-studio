'use client';

import { LayoutDashboard, BarChart2, List, TrendingUp, Clock, Calendar } from 'lucide-react';
import { TabName } from '@/types';

interface BottomNavProps {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
}

const navItems: { id: TabName; icon: React.ReactNode; label: string }[] = [
  { id: 'dashboard',      icon: <LayoutDashboard size={20} strokeWidth={1.75} />, label: 'ホーム' },
  { id: 'visual-ranking', icon: <BarChart2        size={20} strokeWidth={1.75} />, label: 'ランク' },
  { id: 'ranking',        icon: <List             size={20} strokeWidth={1.75} />, label: '詳細' },
  { id: 'analysis',       icon: <TrendingUp       size={20} strokeWidth={1.75} />, label: '分析' },
  { id: 'attendance',     icon: <Clock            size={20} strokeWidth={1.75} />, label: '出勤' },
  { id: 'shift',          icon: <Calendar         size={20} strokeWidth={1.75} />, label: 'シフト' },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <div
            key={item.id}
            className={`menu-item${isActive ? ' active' : ''}`}
            onClick={() => onTabChange(item.id)}
            style={{
              flexDirection: 'column',
              gap: '3px',
              padding: '6px 4px',
              color: isActive ? 'var(--text-main)' : 'var(--text-sub)',
            }}
          >
            <span style={{ display: 'flex', justifyContent: 'center' }}>
              {item.icon}
            </span>
            <span style={{ fontSize: '9px', letterSpacing: '0.01em' }}>{item.label}</span>
          </div>
        );
      })}
    </nav>
  );
}
