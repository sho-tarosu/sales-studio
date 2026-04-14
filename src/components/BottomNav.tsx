'use client';

import { LayoutDashboard, BarChart2, TrendingUp, Clock, Calendar, Users, GraduationCap } from 'lucide-react';
import { TabName } from '@/types';

interface BottomNavProps {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
  userRole?: string;
}

const ROLE_ORDER = ['アルバイト', '社員', '幹部', '管理者'];
function hasMinRole(userRole: string | undefined, minRole: string): boolean {
  return ROLE_ORDER.indexOf(userRole ?? '') >= ROLE_ORDER.indexOf(minRole);
}

const ALL_NAV_ITEMS: { id: TabName; icon: React.ReactNode; label: string; minRole?: string }[] = [
  { id: 'dashboard',      icon: <LayoutDashboard size={20} strokeWidth={1.75} />, label: 'ホーム' },
  { id: 'visual-ranking', icon: <BarChart2        size={20} strokeWidth={1.75} />, label: 'ランキング' },
  { id: 'analysis',       icon: <TrendingUp       size={20} strokeWidth={1.75} />, label: '分析' },
  { id: 'attendance',     icon: <Clock            size={20} strokeWidth={1.75} />, label: '出勤' },
  { id: 'shift',          icon: <Calendar         size={20} strokeWidth={1.75} />, label: 'シフト' },
  { id: 'growth',         icon: <GraduationCap    size={20} strokeWidth={1.75} />, label: '育成', minRole: '社員' },
  { id: 'profile',        icon: <Users            size={20} strokeWidth={1.75} />, label: 'プロフィール' },
];

export default function BottomNav({ activeTab, onTabChange, userRole }: BottomNavProps) {
  const navItems = ALL_NAV_ITEMS.filter((item) => !item.minRole || hasMinRole(userRole, item.minRole));
  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            className={`menu-item${isActive ? ' active' : ''}`}
            onClick={() => onTabChange(item.id)}
            aria-current={isActive ? 'page' : undefined}
            style={{
              flexDirection: 'column',
              gap: '3px',
              padding: '6px 4px',
              color: isActive ? 'var(--text-main)' : 'var(--text-sub)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <span style={{ display: 'flex', justifyContent: 'center' }}>
              {item.icon}
            </span>
            <span style={{ fontSize: '9px', letterSpacing: '0.01em' }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
