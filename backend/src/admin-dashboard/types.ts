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
  performanceScore: number;
  rating: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface RecruiterActivity {
  activity: string;
  value: number;
}

export interface PerformanceLeaderboardEntry {
  id: string;
  name: string;
  email: string;
  role: string;
  performanceScore: number;
  rating: string;
  placementsThisMonth: number;
  phone?: string;
  avatarUrl?: string;
}

export interface RecruiterAwardWinner {
  id: string;
  name: string;
  email: string;
  role: string;
  performanceScore: number;
  rating: string;
  deployedCount: number;
  phone?: string;
  avatarUrl?: string;
}

export interface TopRecruiterStatsData {
  period: {
    year: number;
    month: number;
  };
  recruiterOfTheMonth: RecruiterAwardWinner | null;
  recruiterOfTheYear: RecruiterAwardWinner | null;
  monthlyLeaderboard: PerformanceLeaderboardEntry[];
  yearlyLeaderboard: PerformanceLeaderboardEntry[];
  /** @deprecated Use recruiterOfTheMonth — kept for backward compatibility */
  topRecruiter: TopRecruiter;
  recruiterActivities: RecruiterActivity[];
  /** @deprecated Use monthlyLeaderboard */
  leaderboard: PerformanceLeaderboardEntry[];
}

export type InterviewStatus = "Scheduled" | "Completed" | "Pending" | "Missed";

export interface UpcomingInterviewEntry {
  day: string;
  candidate: string;
  project: string;
  role: string;
  recruiter: string;
  time: string;
  status: InterviewStatus;
  scheduledTime: string;
}

export interface InterviewChartEntry {
  day: string;
  interviews: number;
}

export interface AdminDashboardUpcomingInterviewsData {
  chartData: InterviewChartEntry[];
  interviews: UpcomingInterviewEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

