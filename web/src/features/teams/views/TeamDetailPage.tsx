import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Users,
  UserPlus,
  TrendingUp,
  Crown,
  Edit,
  Download,
  Briefcase,
  UserCheck,
  Activity,
  BarChart3,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/hooks/useCan";
import {
  useGetTeamQuery,
  useGetTeamMembersQuery,
  useGetTeamProjectsQuery,
  useGetTeamCandidatesQuery,
  useGetTeamStatsQuery,
} from "@/features/teams";
import TeamMembersTable from "../components/TeamMembersTable";
import TeamProjectsList from "../components/TeamProjectsList";
import TeamCandidatesList from "../components/TeamCandidatesList";
import TeamAnalytics from "../components/TeamAnalytics";

export default function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const canWriteTeams = useCan("write:teams");
  const canReadTeams = useCan("read:teams");

  const [activeTab, setActiveTab] = useState("overview");

  // API calls
  const { data: teamData, isLoading, error } = useGetTeamQuery(teamId!);
  const { data: teamMembers = [], isLoading: isLoadingMembers } =
    useGetTeamMembersQuery(teamId!);
  const { data: teamProjects = [] } = useGetTeamProjectsQuery(teamId!);
  const { data: teamCandidates = [] } = useGetTeamCandidatesQuery(teamId!);
  const { data: teamStats, isLoading: isLoadingStats } = useGetTeamStatsQuery(
    teamId!
  );

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

  // Use real stats from API, with fallback for loading states
  const stats = teamStats || {
    totalMembers: Array.isArray(teamMembers) ? teamMembers.length : 0,
    activeProjects: Array.isArray(teamProjects)
      ? teamProjects.filter((p) => p.status === "active").length
      : 0,
    totalCandidates: Array.isArray(teamCandidates) ? teamCandidates.length : 0,
    averageSuccessRate: 0,
    totalRevenue: 0,
    monthlyGrowth: 0,
    completionRate: 0,
    totalProjects: Array.isArray(teamProjects) ? teamProjects.length : 0,
    completedProjects: Array.isArray(teamProjects)
      ? teamProjects.filter((p) => p.status === "completed").length
      : 0,
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
                  {stats?.totalMembers || 0}
                </div>
                <div className="text-sm text-blue-600 font-medium">
                  Team Members
                </div>
              </div>
              <div className="text-center p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
                <div className="text-3xl font-bold text-green-700">
                  {stats?.activeProjects}
                </div>
                <div className="text-sm text-green-600 font-medium">
                  Active Projects
                </div>
              </div>
              <div className="text-center p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
                <div className="text-3xl font-bold text-emerald-700">
                  {stats?.completedProjects}
                </div>
                <div className="text-sm text-emerald-600 font-medium">
                  Completed
                </div>
              </div>
              <div className="text-center p-4 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200">
                <div className="text-3xl font-bold text-orange-700">
                  {stats?.averageSuccessRate.toFixed(1)}%
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
                          <div className="text-xs text-slate-500">Lead</div>
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
                          <div className="text-xs text-slate-500">Senior</div>
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
                          ${(stats?.totalRevenue / 1000).toFixed(0)}K
                        </div>
                        <div className="text-sm text-slate-600">
                          Total Revenue
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <ArrowUpRight className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">
                            +{stats?.monthlyGrowth}%
                          </span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          {stats?.completionRate}%
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
                          {stats?.averageSuccessRate.toFixed(1)}%
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
                          {stats?.totalProjects}
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
                <TeamMembersTable
                  members={teamMembers}
                  isLoading={isLoadingMembers}
                  teamId={teamId!}
                />
              </TabsContent>

              {/* Projects Tab */}
              <TabsContent value="projects" className="space-y-6">
                <TeamProjectsList projects={teamProjects} />
              </TabsContent>

              {/* Candidates Tab */}
              <TabsContent value="candidates" className="space-y-6">
                <TeamCandidatesList candidates={teamCandidates} />
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-6">
                <TeamAnalytics
                  stats={stats}
                  isLoading={isLoadingStats}
                  teamId={teamId!}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
