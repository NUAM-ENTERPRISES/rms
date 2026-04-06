export interface RecruiterStats {
  totalCandidates: number;
  candidatesAdded: number;
  submitted: number;
  interviewsScheduled: number;
  interviewsPassed: number;
  hired: number;
}

export interface Recruiter {
  id: string;
  name: string;
  role: string;
  avatar: string;
  score: number;
  stats: RecruiterStats;
}

export const mockRecruiters: Recruiter[] = [
  {
    id: "rec-1",
    name: "Aarav Sharma",
    role: "Senior Recruiter",
    avatar: "https://ui-avatars.com/api/?name=Aarav+Sharma&background=6366f1&color=fff",
    score: 92,
    stats: {
      totalCandidates: 312,
      candidatesAdded: 145,
      submitted: 98,
      interviewsScheduled: 72,
      interviewsPassed: 51,
      hired: 34,
    },
  },
  {
    id: "rec-2",
    name: "Priya Patel",
    role: "Recruiter",
    avatar: "https://ui-avatars.com/api/?name=Priya+Patel&background=ec4899&color=fff",
    score: 85,
    stats: {
      totalCandidates: 248,
      candidatesAdded: 120,
      submitted: 78,
      interviewsScheduled: 55,
      interviewsPassed: 38,
      hired: 22,
    },
  },
  {
    id: "rec-3",
    name: "Rohan Mehta",
    role: "Junior Recruiter",
    avatar: "https://ui-avatars.com/api/?name=Rohan+Mehta&background=14b8a6&color=fff",
    score: 74,
    stats: {
      totalCandidates: 176,
      candidatesAdded: 88,
      submitted: 52,
      interviewsScheduled: 35,
      interviewsPassed: 20,
      hired: 12,
    },
  },
  {
    id: "rec-4",
    name: "Sneha Reddy",
    role: "Senior Recruiter",
    avatar: "https://ui-avatars.com/api/?name=Sneha+Reddy&background=f59e0b&color=fff",
    score: 88,
    stats: {
      totalCandidates: 290,
      candidatesAdded: 132,
      submitted: 91,
      interviewsScheduled: 68,
      interviewsPassed: 47,
      hired: 29,
    },
  },
];
