import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Users,
  Building2,
  UserPlus,
  TrendingUp,
  Calendar,
  Phone,
  Mail,
  Crown,
  MoreHorizontal,
  Edit,
  Download,
  Plus,
  Briefcase,
  UserCheck,
  Activity,
  BarChart3,
  PieChart,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/hooks/useCan";
import { useGetTeamQuery } from "@/features/teams";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  joinedAt: string;
  currentProjects: number;
  activeCandidates: number;
  successRate: number;
}

interface TeamProject {
  id: string;
  title: string;
  description: string;
  status: "active" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  deadline: string;
  client: {
    id: string;
    name: string;
    type: string;
  };
  candidatesAssigned: number;
  rolesNeeded: number;
  progress: number;
}

interface TeamCandidate {
  id: string;
  name: string;
  contact: string;
  email: string;
  currentStatus: string;
  experience: number;
  skills: string[];
  assignedProject: string;
  lastActivity: string;
  nextInterview?: string;
}

export default function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const canWriteTeams = useCan("write:teams");
  const canReadTeams = useCan("read:teams");

  const [activeTab, setActiveTab] = useState("overview");

  // API calls
  const { data: teamData, isLoading, error } = useGetTeamQuery(teamId!);

  // Use real data if available, otherwise fallback to mock data
  const team = teamData?.data || {
    id: teamId!,
    name: "Healthcare Recruitment",
    description:
      "Specialized team for healthcare staffing and recruitment across multiple specialties including ICU, ER, Surgical, and Long-term Care",
    type: "Healthcare",
    createdAt: "2024-01-15",
    updatedAt: "2024-08-20",
    members: [],
    leadId: "1",
    headId: "2",
    managerId: "3",
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-800">
                Loading Team...
              </CardTitle>
              <CardDescription className="text-slate-600">
                Please wait while we load the team details.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-800">
                Team Not Found
              </CardTitle>
              <CardDescription className="text-slate-600">
                The team you're looking for doesn't exist or has been removed.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-6">
              <Button onClick={() => navigate("/teams")}>
                Go to Teams List
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const teamMembers: TeamMember[] = [
    {
      id: "1",
      name: "Sarah Johnson",
      email: "sarah@affiniks.com",
      role: "Team Lead",
      phone: "+1 (555) 123-4567",
      joinedAt: "2024-01-15",
      currentProjects: 4,
      activeCandidates: 12,
      successRate: 94.2,
    },
    {
      id: "2",
      name: "Mike Chen",
      email: "mike@affiniks.com",
      role: "Senior Recruiter",
      phone: "+1 (555) 234-5678",
      joinedAt: "2024-02-01",
      currentProjects: 3,
      activeCandidates: 8,
      successRate: 91.7,
    },
    {
      id: "3",
      name: "Emma Davis",
      email: "emma@affiniks.com",
      role: "Recruiter",
      phone: "+1 (555) 345-6789",
      joinedAt: "2024-03-10",
      currentProjects: 2,
      activeCandidates: 6,
      successRate: 88.9,
    },
    {
      id: "4",
      name: "Alex Rodriguez",
      email: "alex@affiniks.com",
      role: "Recruiter",
      phone: "+1 (555) 456-7890",
      joinedAt: "2024-04-05",
      currentProjects: 3,
      activeCandidates: 9,
      successRate: 92.1,
    },
    {
      id: "5",
      name: "Jennifer Lee",
      email: "jennifer.lee@affiniks.com",
      role: "Senior Recruiter",
      phone: "+1 (555) 567-8901",
      joinedAt: "2024-05-12",
      currentProjects: 2,
      activeCandidates: 7,
      successRate: 89.5,
    },
    {
      id: "6",
      name: "David Thompson",
      email: "david.thompson@affiniks.com",
      role: "Recruiter",
      phone: "+1 (555) 678-9012",
      joinedAt: "2024-06-01",
      currentProjects: 1,
      activeCandidates: 4,
      successRate: 85.2,
    },
  ];

  const teamProjects: TeamProject[] = [
    {
      id: "1",
      title: "ICU Nurses - Memorial Hospital",
      description: "Urgent need for 15 ICU nurses for night shift positions",
      status: "active",
      priority: "urgent",
      deadline: "2024-09-15",
      client: {
        id: "1",
        name: "Memorial Hospital",
        type: "HEALTHCARE_ORGANIZATION",
      },
      candidatesAssigned: 8,
      rolesNeeded: 15,
      progress: 53,
    },
    {
      id: "2",
      title: "ER Physicians - City Medical Center",
      description: "Emergency room physicians for 24/7 coverage",
      status: "active",
      priority: "high",
      deadline: "2024-10-01",
      client: {
        id: "2",
        name: "City Medical Center",
        type: "HEALTHCARE_ORGANIZATION",
      },
      candidatesAssigned: 3,
      rolesNeeded: 8,
      progress: 38,
    },
    {
      id: "3",
      title: "Surgical Techs - Regional Clinic",
      description: "Surgical technicians for outpatient procedures",
      status: "active",
      priority: "medium",
      deadline: "2024-11-30",
      client: {
        id: "3",
        name: "Regional Clinic",
        type: "HEALTHCARE_ORGANIZATION",
      },
      candidatesAssigned: 5,
      rolesNeeded: 12,
      progress: 42,
    },
    {
      id: "4",
      title: "Long-term Care Nurses - Golden Years Facility",
      description: "Registered nurses for long-term care and rehabilitation",
      status: "active",
      priority: "high",
      deadline: "2024-12-15",
      client: {
        id: "4",
        name: "Golden Years Facility",
        type: "HEALTHCARE_ORGANIZATION",
      },
      candidatesAssigned: 6,
      rolesNeeded: 10,
      progress: 60,
    },
    {
      id: "5",
      title: "Pediatric Nurses - Children's Hospital",
      description: "Specialized pediatric nurses for emergency and ICU",
      status: "completed",
      priority: "high",
      deadline: "2024-08-01",
      client: {
        id: "5",
        name: "Children's Hospital",
        type: "HEALTHCARE_ORGANIZATION",
      },
      candidatesAssigned: 8,
      rolesNeeded: 8,
      progress: 100,
    },
  ];

  const teamCandidates: TeamCandidate[] = [
    {
      id: "1",
      name: "Dr. Jennifer Smith",
      contact: "+1 (555) 111-2222",
      email: "jennifer.smith@email.com",
      currentStatus: "interview_scheduled",
      experience: 8,
      skills: ["Emergency Medicine", "Trauma Care", "ACLS", "BLS"],
      assignedProject: "ER Physicians - City Medical Center",
      lastActivity: "2024-08-20",
      nextInterview: "2024-08-25",
    },
    {
      id: "2",
      name: "Nurse Robert Wilson",
      contact: "+1 (555) 222-3333",
      email: "robert.wilson@email.com",
      currentStatus: "shortlisted",
      experience: 5,
      skills: ["ICU", "Critical Care", "Ventilator Management"],
      assignedProject: "ICU Nurses - Memorial Hospital",
      lastActivity: "2024-08-19",
    },
    {
      id: "3",
      name: "Sarah Thompson",
      contact: "+1 (555) 333-4444",
      email: "sarah.thompson@email.com",
      currentStatus: "documentation_pending",
      experience: 3,
      skills: ["Surgical Tech", "Sterilization", "OR Procedures"],
      assignedProject: "Surgical Techs - Regional Clinic",
      lastActivity: "2024-08-18",
    },
    {
      id: "4",
      name: "Dr. Michael Chang",
      contact: "+1 (555) 444-5555",
      email: "michael.chang@email.com",
      currentStatus: "placed",
      experience: 12,
      skills: ["Emergency Medicine", "Trauma Surgery", "Critical Care"],
      assignedProject: "ER Physicians - City Medical Center",
      lastActivity: "2024-08-15",
    },
    {
      id: "5",
      name: "Nurse Lisa Martinez",
      contact: "+1 (555) 555-6666",
      email: "lisa.martinez@email.com",
      currentStatus: "shortlisted",
      experience: 6,
      skills: ["Long-term Care", "Geriatric Nursing", "Rehabilitation"],
      assignedProject: "Long-term Care Nurses - Golden Years Facility",
      lastActivity: "2024-08-19",
    },
    {
      id: "6",
      name: "Dr. Amanda Foster",
      contact: "+1 (555) 666-7777",
      email: "amanda.foster@email.com",
      currentStatus: "interview_scheduled",
      experience: 9,
      skills: ["Pediatric Medicine", "Emergency Pediatrics", "PALS"],
      assignedProject: "Pediatric Nurses - Children's Hospital",
      lastActivity: "2024-08-20",
      nextInterview: "2024-08-26",
    },
  ];

  const teamStats = {
    totalMembers: teamMembers.length,
    activeProjects: teamProjects.filter((p) => p.status === "active").length,
    totalCandidates: teamCandidates.length,
    averageSuccessRate:
      teamMembers.reduce((acc, member) => acc + member.successRate, 0) /
      teamMembers.length,
    totalRevenue: 284000,
    monthlyGrowth: 12.5,
    completionRate: 87.3,
    totalProjects: teamProjects.length,
    completedProjects: teamProjects.filter((p) => p.status === "completed")
      .length,
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "completed":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Get priority badge variant
  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
      case "low":
        return "outline";
      default:
        return "outline";
    }
  };

  // Get candidate status badge variant
  const getCandidateStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "interview_scheduled":
        return "default";
      case "shortlisted":
        return "secondary";
      case "documentation_pending":
        return "outline";
      case "placed":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (!canReadTeams) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-800">
                Access Denied
              </CardTitle>
              <CardDescription className="text-slate-600">
                You don't have permission to view team details.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full mx-auto space-y-6">
        {/* Header Section */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="h-8 w-px bg-slate-300"></div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300/50">
                    <Users className="h-6 w-6 text-blue-700" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-slate-800">
                      {team.name}
                    </h1>
                    <p className="text-slate-600">{team.description}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {canWriteTeams && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/teams/${teamId}/edit`)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Team
                    </Button>
                    <Button variant="outline" size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Member
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Team Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                <div className="text-3xl font-bold text-blue-700">
                  {teamStats.totalMembers}
                </div>
                <div className="text-sm text-blue-600 font-medium">
                  Team Members
                </div>
              </div>
              <div className="text-center p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
                <div className="text-3xl font-bold text-green-700">
                  {teamStats.activeProjects}
                </div>
                <div className="text-sm text-green-600 font-medium">
                  Active Projects
                </div>
              </div>
              <div className="text-center p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
                <div className="text-3xl font-bold text-emerald-700">
                  {teamStats.completedProjects}
                </div>
                <div className="text-sm text-emerald-600 font-medium">
                  Completed
                </div>
              </div>
              <div className="text-center p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
                <div className="text-3xl font-bold text-purple-700">
                  {teamStats.totalCandidates}
                </div>
                <div className="text-sm text-purple-600 font-medium">
                  Candidates
                </div>
              </div>
              <div className="text-center p-4 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200">
                <div className="text-3xl font-bold text-orange-700">
                  {teamStats.averageSuccessRate.toFixed(1)}%
                </div>
                <div className="text-sm text-orange-600 font-medium">
                  Success Rate
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-5 mb-6">
                <TabsTrigger
                  value="overview"
                  className="flex items-center gap-2"
                >
                  <Activity className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="members"
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Members
                </TabsTrigger>
                <TabsTrigger
                  value="projects"
                  className="flex items-center gap-2"
                >
                  <Briefcase className="h-4 w-4" />
                  Projects
                </TabsTrigger>
                <TabsTrigger
                  value="candidates"
                  className="flex items-center gap-2"
                >
                  <UserCheck className="h-4 w-4" />
                  Candidates
                </TabsTrigger>
                <TabsTrigger
                  value="analytics"
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Team Leadership */}
                  <Card className="border border-slate-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-amber-600" />
                        Team Leadership
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-semibold">
                              SJ
                            </div>
                            <div>
                              <div className="font-medium text-slate-800">
                                Sarah Johnson
                              </div>
                              <div className="text-sm text-slate-600">
                                Team Lead
                              </div>
                            </div>
                          </div>
                          <Badge variant="default">Lead</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                              MC
                            </div>
                            <div>
                              <div className="font-medium text-slate-800">
                                Mike Chen
                              </div>
                              <div className="text-sm text-slate-600">
                                Senior Recruiter
                              </div>
                            </div>
                          </div>
                          <Badge variant="secondary">Senior</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Activity */}
                  <Card className="border border-slate-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 p-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                          <div className="flex-1">
                            <div className="text-sm text-slate-800">
                              New candidate assigned to ICU project
                            </div>
                            <div className="text-xs text-slate-500">
                              2 hours ago
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                          <div className="flex-1">
                            <div className="text-sm text-slate-800">
                              Interview scheduled for Dr. Smith
                            </div>
                            <div className="text-xs text-slate-500">
                              4 hours ago
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500 mt-2"></div>
                          <div className="flex-1">
                            <div className="text-sm text-slate-800">
                              Project deadline updated
                            </div>
                            <div className="text-xs text-slate-500">
                              1 day ago
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-2">
                          <div className="w-2 h-2 rounded-full bg-amber-500 mt-2"></div>
                          <div className="flex-1">
                            <div className="text-sm text-slate-800">
                              New team member onboarded
                            </div>
                            <div className="text-xs text-slate-500">
                              2 days ago
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-2">
                          <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2"></div>
                          <div className="flex-1">
                            <div className="text-sm text-slate-800">
                              Monthly performance review completed
                            </div>
                            <div className="text-xs text-slate-500">
                              3 days ago
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Performance Metrics */}
                <Card className="border border-slate-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Performance Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600 mb-2">
                          ${(teamStats.totalRevenue / 1000).toFixed(0)}K
                        </div>
                        <div className="text-sm text-slate-600">
                          Total Revenue
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <ArrowUpRight className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">
                            +{teamStats.monthlyGrowth}%
                          </span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          {teamStats.completionRate}%
                        </div>
                        <div className="text-sm text-slate-600">
                          Completion Rate
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <ArrowUpRight className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-blue-600">+5.2%</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600 mb-2">
                          {teamStats.averageSuccessRate.toFixed(1)}%
                        </div>
                        <div className="text-sm text-slate-600">
                          Success Rate
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <ArrowUpRight className="h-4 w-4 text-purple-600" />
                          <span className="text-sm text-purple-600">+2.1%</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-emerald-600 mb-2">
                          {teamStats.totalProjects}
                        </div>
                        <div className="text-sm text-slate-600">
                          Total Projects
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                          <span className="text-sm text-emerald-600">
                            +1 new
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Members Tab */}
              <TabsContent value="members" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">
                    Team Members ({teamMembers.length})
                  </h3>
                  {canWriteTeams && (
                    <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Member
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {teamMembers.map((member) => (
                    <Card
                      key={member.id}
                      className="border border-slate-200 hover:shadow-md transition-shadow"
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-semibold text-lg">
                              {member.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800">
                                {member.name}
                              </div>
                              <div className="text-sm text-slate-600">
                                {member.role}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Mail className="h-4 w-4" />
                            <span className="truncate">{member.email}</span>
                          </div>
                          {member.phone && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Phone className="h-4 w-4" />
                              <span>{member.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="h-4 w-4" />
                            <span>Joined {formatDate(member.joinedAt)}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-200">
                          <div className="text-center">
                            <div className="text-lg font-semibold text-blue-600">
                              {member.currentProjects}
                            </div>
                            <div className="text-xs text-slate-500">
                              Projects
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-green-600">
                              {member.activeCandidates}
                            </div>
                            <div className="text-xs text-slate-500">
                              Candidates
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-purple-600">
                              {member.successRate}%
                            </div>
                            <div className="text-xs text-slate-500">
                              Success
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Projects Tab */}
              <TabsContent value="projects" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">
                    Active Projects ({teamProjects.length})
                  </h3>
                  {canWriteTeams && (
                    <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                      <Plus className="h-4 w-4 mr-2" />
                      New Project
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  {teamProjects.map((project) => (
                    <Card
                      key={project.id}
                      className="border border-slate-200 hover:shadow-md transition-shadow"
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-lg font-semibold text-slate-800">
                                {project.title}
                              </h4>
                              <Badge
                                variant={getStatusBadgeVariant(project.status)}
                              >
                                {project.status}
                              </Badge>
                              <Badge
                                variant={getPriorityBadgeVariant(
                                  project.priority
                                )}
                              >
                                {project.priority}
                              </Badge>
                            </div>
                            <p className="text-slate-600 mb-3">
                              {project.description}
                            </p>
                            <div className="flex items-center gap-6 text-sm text-slate-500">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                <span>
                                  {project.client?.name || "No client assigned"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>Due {formatDate(project.deadline)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                <span>
                                  {project.candidatesAssigned}/
                                  {project.rolesNeeded} candidates
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Progress</span>
                            <span className="font-medium text-slate-800">
                              {project.progress}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${project.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Candidates Tab */}
              <TabsContent value="candidates" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">
                    Candidate Pipeline ({teamCandidates.length})
                  </h3>
                  <div className="flex items-center gap-2">
                    <Select>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="shortlisted">Shortlisted</SelectItem>
                        <SelectItem value="interview_scheduled">
                          Interview Scheduled
                        </SelectItem>
                        <SelectItem value="placed">Placed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  {teamCandidates.map((candidate) => (
                    <Card
                      key={candidate.id}
                      className="border border-slate-200 hover:shadow-md transition-shadow"
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-lg font-semibold text-slate-800">
                                {candidate.name}
                              </h4>
                              <Badge
                                variant={getCandidateStatusBadgeVariant(
                                  candidate.currentStatus
                                )}
                              >
                                {candidate.currentStatus.replace("_", " ")}
                              </Badge>
                              <Badge variant="outline">
                                {candidate.experience} years exp
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <Phone className="h-4 w-4" />
                                  <span>{candidate.contact}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <Mail className="h-4 w-4" />
                                  <span>{candidate.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <Briefcase className="h-4 w-4" />
                                  <span>{candidate.assignedProject}</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="text-sm">
                                  <span className="text-slate-600">
                                    Skills:{" "}
                                  </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {candidate.skills
                                      .slice(0, 3)
                                      .map((skill, index) => (
                                        <Badge
                                          key={index}
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          {skill}
                                        </Badge>
                                      ))}
                                    {candidate.skills.length > 3 && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        +{candidate.skills.length - 3} more
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <Clock className="h-4 w-4" />
                                  <span>
                                    Last activity:{" "}
                                    {formatDate(candidate.lastActivity)}
                                  </span>
                                </div>
                                {candidate.nextInterview && (
                                  <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Calendar className="h-4 w-4" />
                                    <span>
                                      Next interview:{" "}
                                      {formatDate(candidate.nextInterview)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Team Performance Chart */}
                  <Card className="border border-slate-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Monthly Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center text-slate-400">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                          <p>Performance chart coming soon</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Success Rate Distribution */}
                  <Card className="border border-slate-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChart className="h-5 w-5 text-purple-600" />
                        Success Rate Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center text-slate-400">
                        <div className="text-center">
                          <PieChart className="h-12 w-12 mx-auto mb-2" />
                          <p>Success rate chart coming soon</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Metrics Table */}
                <Card className="border border-slate-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-600" />
                      Detailed Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Metric</TableHead>
                          <TableHead>Current</TableHead>
                          <TableHead>Previous Month</TableHead>
                          <TableHead>Change</TableHead>
                          <TableHead>Target</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">
                            Placements
                          </TableCell>
                          <TableCell>24</TableCell>
                          <TableCell>21</TableCell>
                          <TableCell className="text-green-600">
                            +14.3%
                          </TableCell>
                          <TableCell>25</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Revenue</TableCell>
                          <TableCell>$284K</TableCell>
                          <TableCell>$252K</TableCell>
                          <TableCell className="text-green-600">
                            +12.7%
                          </TableCell>
                          <TableCell>$300K</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">
                            Time to Fill
                          </TableCell>
                          <TableCell>18 days</TableCell>
                          <TableCell>22 days</TableCell>
                          <TableCell className="text-green-600">
                            -18.2%
                          </TableCell>
                          <TableCell>20 days</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">
                            Candidate Quality
                          </TableCell>
                          <TableCell>4.2/5</TableCell>
                          <TableCell>4.0/5</TableCell>
                          <TableCell className="text-green-600">
                            +5.0%
                          </TableCell>
                          <TableCell>4.5/5</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">
                            Client Satisfaction
                          </TableCell>
                          <TableCell>4.8/5</TableCell>
                          <TableCell>4.6/5</TableCell>
                          <TableCell className="text-green-600">
                            +4.3%
                          </TableCell>
                          <TableCell>4.7/5</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">
                            Team Efficiency
                          </TableCell>
                          <TableCell>92%</TableCell>
                          <TableCell>89%</TableCell>
                          <TableCell className="text-green-600">
                            +3.4%
                          </TableCell>
                          <TableCell>90%</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
