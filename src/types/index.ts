export type Role = '幹部' | '社員' | 'アルバイト';

export interface User {
  id: string;
  name: string;
  role: Role;
  active: boolean;
}

export interface CalendarDay {
  pt: number;
  selfClose: number;
  mnp: number;
  new: number;
  uq: number;
  nw: number;
  elec: number;
  credit: number;
  site: string;
}

export interface Staff {
  name: string;
  total: number;
  mnp: number;
  new: number;
  change: number;
  hikari: number;
  tablet: number;
  other: number;
  sites: Record<string, number>;
  ages: Record<string, number>;
  types: Record<string, number>;
  dailyTotal: number[];
  dailyBySite: Record<string, number[]>;
  calendar: CalendarDay[];
}

export interface KPI {
  total: number;
  mnp: number;
  new: number;
  change: number;
  hikari: number;
  tablet: number;
  other: number;
}

export interface SiteDetail {
  total: number;
  staffBreakdown: Record<string, number>;
  dailyTotal: number[];
}

export interface GlobalStats {
  sites: Record<string, number>;
  ages: Record<string, number>;
  types: Record<string, number>;
  dailyTotal: number[];
}

export interface DashboardData {
  kpi: KPI;
  prevKpi: KPI;
  ranking: Staff[];
  globalStats: GlobalStats;
  siteDetails: Record<string, SiteDetail>;
  daysInMonth: number;
}

export interface ShiftRow {
  date: string;
  dayOfWeek: string;
  location: string;
  startTime: string;
  order1: string;
  order2: string;
  staff: string[];
  finalStaff: string;
  agency: string;
  sheetRegion: '東京' | '福岡';
  isHoliday: boolean;
}

export type TabName =
  | 'dashboard'
  | 'visual-ranking'
  | 'stacked-chart'
  | 'analysis'
  | 'attendance'
  | 'shift'
  | 'profile';

export type AnalysisMode = 'overall' | 'individual' | 'site' | 'compare';
