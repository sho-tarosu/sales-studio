'use client';

import { TabName } from '@/types';
import { signOut } from 'next-auth/react';

interface SidebarProps {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
  userName?: string;
  userRole?: string;
}

// ─── SVG Icons ─────────────────────────────────────────────────────────────

const GridIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

const BarChartIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 20V10M12 20V4M6 20v-6" />
  </svg>
);

const LayersIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12,2 2,7 12,12 22,7" />
    <polyline points="2,17 12,22 22,17" />
    <polyline points="2,12 12,17 22,12" />
  </svg>
);

const ListIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
);

const TrendIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

// ─── Menu Config ──────────────────────────────────────────────────────────

const menuItems: { id: TabName; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard',      label: 'ダッシュボード',     icon: <GridIcon /> },
  { id: 'visual-ranking', label: 'ランキング',          icon: <BarChartIcon /> },
  { id: 'stacked-chart',  label: 'MNP・新規・SU',       icon: <LayersIcon /> },
  { id: 'ranking',        label: 'ランキング (詳細)',    icon: <ListIcon /> },
  { id: 'analysis',       label: '分析・比較',          icon: <TrendIcon /> },
  { id: 'attendance',     label: '出勤管理',            icon: <ClockIcon /> },
  { id: 'shift',          label: 'シフト',              icon: <CalendarIcon /> },
];

// ─── Component ────────────────────────────────────────────────────────────

export default function Sidebar({ activeTab, onTabChange, userName, userRole }: SidebarProps) {
  const initials = userName ? userName.slice(0, 2) : '??';

  return (
    <nav className="sidebar">
      {/* Brand */}
      <div className="brand">
        <div className="brand-icon">▶</div>
        <div>Sales Studio</div>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {menuItems.map((item) => (
          <div
            key={item.id}
            className={`menu-item${activeTab === item.id ? ' active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            <span style={{
              flexShrink: 0,
              opacity: activeTab === item.id ? 1 : 0.55,
              transition: 'opacity 0.15s',
            }}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* User Info */}
      {userName && (
        <div style={{
          padding: '14px 12px',
          borderTop: '1px solid var(--border-color)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '10px',
          }}>
            {/* Avatar */}
            <div style={{
              width: 34,
              height: 34,
              background: 'linear-gradient(135deg, #e53e3e, #991b1b)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#fff',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(220,38,38,0.35)',
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                {userName}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '1px' }}>
                {userRole}
              </div>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              color: 'var(--text-sub)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              width: '100%',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-color)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-hover)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-color)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-sub)';
            }}
          >
            ログアウト
          </button>
        </div>
      )}
    </nav>
  );
}
