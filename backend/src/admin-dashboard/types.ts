export interface AdminDashboardStats {
  totalCandidates: number;
  activeClients: number;
  openJobs: number;
  candidatesPlaced: number;
}

export interface HiringTrendEntry {
  period: string;
  placed: number;
}

export interface HiringTrendData {
  daily: HiringTrendEntry[];
  monthly: HiringTrendEntry[];
  yearly: HiringTrendEntry[];
}

export interface TopRecruiter {
  name: string;
  role: string;
  placementsThisMonth: number;
  email?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface RecruiterActivity {
  activity: string;
  value: number;
}

export interface TopRecruiterStatsData {
  topRecruiter: TopRecruiter;
  recruiterActivities: RecruiterActivity[];
}

