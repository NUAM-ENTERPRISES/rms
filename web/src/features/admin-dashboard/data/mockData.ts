import { Users, Briefcase, Building2, UserCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ---------- KPI Stats ----------
export type StatCard = {
  id: string;
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  color: string; // Tailwind color key (e.g. "indigo")
};

export const statsData: StatCard[] = [
  {
    id: "total-candidates",
    title: "Total Candidates",
    value: "2,340",
    description: "+12 this week",
    icon: Users,
    color: "indigo",
  },
  {
    id: "active-clients",
    title: "Active Clients",
    value: "48",
    description: "currently hiring",
    icon: Building2,
    color: "emerald",
  },
  {
    id: "open-jobs",
    title: "Open Jobs",
    value: "126",
    description: "active job postings",
    icon: Briefcase,
    color: "amber",
  },
  {
    id: "candidates-placed",
    title: "Candidates Placed",
    value: "32",
    description: "placements this month",
    icon: UserCheck,
    color: "teal",
  },
];

// ---------- Hiring Trend (Bar Chart) ----------
export type HiringTrendEntry = {
  month: string;
  hired: number;
};

export const hiringTrendMonthly: HiringTrendEntry[] = [
  { month: "Jan", hired: 12 },
  { month: "Feb", hired: 18 },
  { month: "Mar", hired: 10 },
  { month: "Apr", hired: 15 },
  { month: "May", hired: 9 },
  { month: "Jun", hired: 20 },
];

export const hiringTrendDaily: HiringTrendEntry[] = [
  { month: "Mon", hired: 3 },
  { month: "Tue", hired: 5 },
  { month: "Wed", hired: 2 },
  { month: "Thu", hired: 4 },
  { month: "Fri", hired: 6 },
  { month: "Sat", hired: 1 },
  { month: "Sun", hired: 0 },
];

export const hiringTrendYearly: HiringTrendEntry[] = [
  { month: "2020", hired: 85 },
  { month: "2021", hired: 112 },
  { month: "2022", hired: 140 },
  { month: "2023", hired: 168 },
  { month: "2024", hired: 195 },
  { month: "2025", hired: 210 },
];

// ---------- Top Recruiter ----------
export type TopRecruiter = {
  name: string;
  role: string;
  placementsThisMonth: number;
  avatarUrl?: string;
};

export const topRecruiter: TopRecruiter = {
  name: "John Mathew",
  role: "Senior IT Recruiter",
  placementsThisMonth: 7,
};

// ---------- Recruiter Activity Breakdown ----------
export type RecruiterActivity = {
  activity: string;
  value: number;
};

export const recruiterActivities: RecruiterActivity[] = [
  { activity: "Projects Assigned", value: 12 },
  { activity: "Sent for Verification", value: 35 },
  { activity: "Interviews Passed", value: 18 },
  { activity: "Candidates Hired", value: 7 },
];

// ---------- Project Role Hiring Status ----------
export type ProjectRole = {
  role: string;
  required: number;
  filled: number;
};

export const projectRolesData: Record<string, ProjectRole[]> = {
  "Aster Hospital": [
    { role: "Emergency Staff Nurse", required: 5, filled: 3 },
    { role: "ICU Staff Nurse", required: 4, filled: 2 },
    { role: "Lab Technician", required: 2, filled: 1 },
  ],
  "MedCare Clinic": [
    { role: "General Nurse", required: 6, filled: 4 },
    { role: "Pharmacist", required: 2, filled: 1 },
  ],
  "LifeLine Medical": [
    { role: "ICU Nurse", required: 5, filled: 3 },
    { role: "Ward Nurse", required: 4, filled: 2 },
  ],
};

export const projectNames = Object.keys(projectRolesData);

// ---------- Upcoming Interviews ----------
export type InterviewChartEntry = {
  day: string;
  interviews: number;
};

export const interviewChartData: InterviewChartEntry[] = [
  { day: "Mon", interviews: 3 },
  { day: "Tue", interviews: 5 },
  { day: "Wed", interviews: 2 },
  { day: "Thu", interviews: 4 },
  { day: "Fri", interviews: 1 },
];

export type InterviewStatus = "Scheduled" | "Completed" | "Pending" | "Missed";

export type InterviewEntry = {
  day: string;
  candidate: string;
  project: string;
  role: string;
  recruiter: string;
  time: string;
  status: InterviewStatus;
};

export const interviewsData: InterviewEntry[] = [
  { day: "Mon", candidate: "Rahul Kumar", project: "Aster Hospital", role: "ICU Nurse", recruiter: "John Mathew", time: "10:30 AM", status: "Scheduled" },
  { day: "Mon", candidate: "Priya Nair", project: "MedCare Clinic", role: "Staff Nurse", recruiter: "Sarah", time: "12:00 PM", status: "Scheduled" },
  { day: "Mon", candidate: "Deepa Menon", project: "LifeLine Medical", role: "Ward Nurse", recruiter: "Alex", time: "2:00 PM", status: "Pending" },
  { day: "Tue", candidate: "Arjun Das", project: "LifeLine Medical", role: "Lab Technician", recruiter: "Alex", time: "3:30 PM", status: "Pending" },
  { day: "Tue", candidate: "Sneha Roy", project: "Aster Hospital", role: "Emergency Staff Nurse", recruiter: "John Mathew", time: "9:00 AM", status: "Scheduled" },
  { day: "Tue", candidate: "Meera Pillai", project: "MedCare Clinic", role: "Pharmacist", recruiter: "Sarah", time: "11:00 AM", status: "Completed" },
  { day: "Tue", candidate: "Vikram Singh", project: "Aster Hospital", role: "ICU Staff Nurse", recruiter: "John Mathew", time: "1:30 PM", status: "Scheduled" },
  { day: "Tue", candidate: "Anita Sharma", project: "LifeLine Medical", role: "ICU Nurse", recruiter: "Alex", time: "4:00 PM", status: "Missed" },
  { day: "Wed", candidate: "Kiran Rao", project: "Aster Hospital", role: "Lab Technician", recruiter: "Sarah", time: "10:00 AM", status: "Scheduled" },
  { day: "Wed", candidate: "Lakshmi Iyer", project: "MedCare Clinic", role: "General Nurse", recruiter: "John Mathew", time: "2:30 PM", status: "Pending" },
  { day: "Thu", candidate: "Suresh Nair", project: "LifeLine Medical", role: "Ward Nurse", recruiter: "Alex", time: "9:30 AM", status: "Scheduled" },
  { day: "Thu", candidate: "Divya Thomas", project: "Aster Hospital", role: "ICU Nurse", recruiter: "Sarah", time: "11:30 AM", status: "Scheduled" },
  { day: "Thu", candidate: "Anil Kumar", project: "MedCare Clinic", role: "Staff Nurse", recruiter: "John Mathew", time: "1:00 PM", status: "Completed" },
  { day: "Thu", candidate: "Ravi Menon", project: "LifeLine Medical", role: "ICU Nurse", recruiter: "Alex", time: "3:00 PM", status: "Pending" },
  { day: "Fri", candidate: "Neha Gupta", project: "Aster Hospital", role: "Emergency Staff Nurse", recruiter: "Sarah", time: "10:00 AM", status: "Scheduled" },
];
