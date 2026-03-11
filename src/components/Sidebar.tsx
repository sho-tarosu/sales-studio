'use client';

import { useState } from 'react';
import Image from 'next/image';
import { LayoutDashboard, BarChart2, Layers, TrendingUp, Clock, Calendar, Users, Menu } from 'lucide-react';
import { TabName } from '@/types';
import { signOut } from 'next-auth/react';

interface SidebarProps {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
  userName?: string;
  userRole?: string;
}

const ICON_PROPS = { size: 18, strokeWidth: 1.75 } as const;

const menuItems: { id: TabName; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard',      label: 'ダッシュボード', icon: <LayoutDashboard {...ICON_PROPS} /> },
  { id: 'visual-ranking', label: 'ランキング',     icon: <BarChart2       {...ICON_PROPS} /> },
  { id: 'stacked-chart',  label: 'MNP・新規・SU',  icon: <Layers          {...ICON_PROPS} /> },
  { id: 'analysis',       label: '分析・比較',     icon: <TrendingUp      {...ICON_PROPS} /> },
  { id: 'attendance',     label: '出勤管理',       icon: <Clock           {...ICON_PROPS} /> },
  { id: 'shift',          label: 'シフト',         icon: <Calendar        {...ICON_PROPS} /> },
  { id: 'profile',        label: 'プロフィール',   icon: <Users           {...ICON_PROPS} /> },
];

export default function Sidebar({ activeTab, onTabChange, userName, userRole }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const initials = userName ? userName.slice(0, 2) : '??';

  return (
    <nav className={`sidebar${collapsed ? ' sidebar-collapsed' : ''}`}>
      {/* Brand + Toggle */}
      <div className="sidebar-brand-row">
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Image src="/logo-r.png" alt="logo" width={22} height={22} />
            <div className="brand-text">Sales Studio</div>
          </div>
        )}
        <button
          className="sidebar-toggle-btn"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? 'メニューを展開' : 'メニューを折り畳む'}
        >
          <Menu size={18} strokeWidth={1.75} />
        </button>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`menu-item${activeTab === item.id ? ' active' : ''}${collapsed ? ' menu-item-collapsed' : ''}`}
            onClick={() => onTabChange(item.id)}
            aria-current={activeTab === item.id ? 'page' : undefined}
            title={collapsed ? item.label : undefined}
          >
            <span style={{
              flexShrink: 0,
              opacity: activeTab === item.id ? 1 : 0.55,
              transition: 'opacity 0.15s',
            }}>
              {item.icon}
            </span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </div>

      {/* User Info */}
      {userName && (
        <div style={{
          padding: collapsed ? '14px 8px' : '14px 12px',
          borderTop: '1px solid var(--border-color)',
        }}>
          {collapsed ? (
            /* 折り畳み時はアバターのみ */
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
              margin: '0 auto',
              boxShadow: '0 2px 6px rgba(220,38,38,0.35)',
            }}>
              {initials}
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{
                  width: 34, height: 34,
                  background: 'linear-gradient(135deg, #e53e3e, #991b1b)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 'bold', color: '#fff', flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(220,38,38,0.35)',
                }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>{userName}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '1px' }}>{userRole}</div>
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
                  transition: 'border-color 0.15s, color 0.15s',
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
            </>
          )}
        </div>
      )}
    </nav>
  );
}
