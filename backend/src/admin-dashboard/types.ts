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

