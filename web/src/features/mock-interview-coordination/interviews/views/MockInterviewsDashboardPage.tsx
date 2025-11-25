import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardCheck,
  Calendar,
  TrendingUp,
  Users,
  Loader2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetMockInterviewsQuery } from "../data";
import { MockInterview, MOCK_INTERVIEW_DECISION } from "../../types";
import { startOfWeek, endOfWeek, isWithinInterval, format } from "date-fns";
import { cn } from "@/lib/utils";

export default function MockInterviewsDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useGetMockInterviewsQuery();
  const interviews = data?.data || [];

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    const scheduledThisWeek = interviews.filter((i) => {
      if (!i.scheduledTime || i.conductedAt) return false;
      const scheduleDate = new Date(i.scheduledTime);
      return isWithinInterval(scheduleDate, { start: weekStart, end: weekEnd });
    }).length;

    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const completedThisMonth = interviews.filter((i) => {
      if (!i.conductedAt) return false;
      const conductDate = new Date(i.conductedAt);
      return (
        conductDate.getMonth() === thisMonth &&
        conductDate.getFullYear() === thisYear
      );
    }).length;

    const completedInterviews = interviews.filter((i) => i.conductedAt);
    const approvedCount = completedInterviews.filter(
      (i) => i.decision === MOCK_INTERVIEW_DECISION.APPROVED
    ).length;
    const passRate =
      completedInterviews.length > 0
        ? Math.round((approvedCount / completedInterviews.length) * 100)
        : 0;

    const inTraining = interviews.filter(
      (i) =>
        i.decision === MOCK_INTERVIEW_DECISION.NEEDS_TRAINING &&
        i.trainingAssignment
    ).length;

    return {
      scheduledThisWeek,
      completedThisMonth,
      passRate,
      inTraining,
      totalScheduled: interviews.filter((i) => !i.conductedAt).length,
      totalCompleted: completedInterviews.length,
    };
  }, [interviews]);

  // Get upcoming interviews
  const upcomingInterviews = useMemo(() => {
    return interviews
      .filter((i) => i.scheduledTime && !i.conductedAt)
      .sort(
        (a, b) =>
          new Date(a.scheduledTime!).getTime() -
          new Date(b.scheduledTime!).getTime()
      )
      .slice(0, 5);
  }, [interviews]);

  // Get recent completed
  const recentCompletedInterviews = useMemo(() => {
    return interviews
      .filter((i) => i.conductedAt)
      .sort(
        (a, b) =>
          new Date(b.conductedAt!).getTime() -
          new Date(a.conductedAt!).getTime()
      )
      .slice(0, 5);
  }, [interviews]);

  const getDecisionBadge = (decision: string | null) => {
    if (!decision) return null;
    switch (decision) {
      case MOCK_INTERVIEW_DECISION.APPROVED:
        return (
          <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/50 dark:text-green-300">
            Approved
          </Badge>
        );
      case MOCK_INTERVIEW_DECISION.NEEDS_TRAINING:
        return (
          <Badge className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/50 dark:text-orange-300">
            Training
          </Badge>
        );
      case MOCK_INTERVIEW_DECISION.REJECTED:
        return (
          <Badge variant="destructive" className="text-xs">
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load mock interviews. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20">
            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Mock Interviews Dashboard
          </h1>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="group relative overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-blue-600" />
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  This Week
                </p>
                <p className="text-3xl font-bold bg-gradient-to-br from-blue-600 to-blue-700 bg-clip-text text-transparent transition-transform duration-300 group-hover:scale-105">
                  {stats.scheduledThisWeek}
                </p>
                <p className="text-xs text-muted-foreground">
                  Scheduled interviews
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-purple-600" />
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  This Month
                </p>
                <p className="text-3xl font-bold bg-gradient-to-br from-purple-600 to-purple-700 bg-clip-text text-transparent transition-transform duration-300 group-hover:scale-105">
                  {stats.completedThisMonth}
                </p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 group-hover:scale-110 transition-transform duration-300">
                <ClipboardCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-500 to-green-600" />
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Pass Rate
                </p>
                <p className="text-3xl font-bold bg-gradient-to-br from-green-600 to-green-700 bg-clip-text text-transparent transition-transform duration-300 group-hover:scale-105">
                  {stats.passRate}%
                </p>
                <p className="text-xs text-muted-foreground">
                  Approved candidates
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-500 to-orange-600" />
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  In Training
                </p>
                <p className="text-3xl font-bold bg-gradient-to-br from-orange-600 to-orange-700 bg-clip-text text-transparent transition-transform duration-300 group-hover:scale-105">
                  {stats.inTraining}
                </p>
                <p className="text-xs text-muted-foreground">Active programs</p>
              </div>
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/20 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Interviews */}
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                Upcoming Interviews
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/mock-interviews/list")}
                className="gap-1 hover:bg-accent/50"
              >
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingInterviews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No upcoming interviews</p>
                <p className="text-sm">Scheduled interviews will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingInterviews.map((interview) => {
                  const candidate = interview.candidateProjectMap?.candidate;
                  const role = interview.candidateProjectMap?.roleNeeded;

                  return (
                    <button
                      key={interview.id}
                      onClick={() =>
                        navigate(`/mock-interviews/${interview.id}/conduct`)
                      }
                      className="w-full p-4 rounded-lg border hover:border-primary/50 hover:bg-accent/50 transition-all duration-200 text-left group hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {candidate
                              ? `${candidate.firstName} ${candidate.lastName}`
                              : "Unknown Candidate"}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {role?.designation || "Unknown Role"}
                          </p>
                        </div>
                        <Badge variant="outline" className="ml-2">
                          {interview.mode}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {interview.scheduledTime
                            ? format(
                                new Date(interview.scheduledTime),
                                "MMM d, yyyy 'at' h:mm a"
                              )
                            : "Not scheduled"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recently Completed */}
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
                Recently Completed
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/mock-interviews/list")}
                className="gap-1 hover:bg-accent/50"
              >
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentCompletedInterviews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No completed interviews yet</p>
                <p className="text-sm">Completed interviews will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCompletedInterviews.map((interview) => {
                  const candidate = interview.candidateProjectMap?.candidate;
                  const role = interview.candidateProjectMap?.roleNeeded;

                  return (
                    <button
                      key={interview.id}
                      onClick={() =>
                        navigate(`/mock-interviews/${interview.id}`)
                      }
                      className="w-full p-4 rounded-lg border hover:border-primary/50 hover:bg-accent/50 transition-all duration-200 text-left hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {candidate
                              ? `${candidate.firstName} ${candidate.lastName}`
                              : "Unknown Candidate"}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {role?.designation || "Unknown Role"}
                          </p>
                        </div>
                        {getDecisionBadge(interview.decision)}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {interview.conductedAt
                              ? format(
                                  new Date(interview.conductedAt),
                                  "MMM d, yyyy"
                                )
                              : "Unknown"}
                          </span>
                        </div>
                        {interview.overallScore !== null && (
                          <span className="text-sm font-semibold">
                            {interview.overallScore}%
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-6 shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-auto py-4 justify-start gap-3 hover:shadow-sm transition-all duration-200 hover:scale-[1.02]"
              onClick={() => navigate("/mock-interviews/list")}
            >
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20">
                <ClipboardCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <p className="font-medium">View All Interviews</p>
                <p className="text-xs text-muted-foreground">
                  See complete list
                </p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 justify-start gap-3 hover:shadow-sm transition-all duration-200 hover:scale-[1.02]"
              onClick={() => navigate("/mock-interviews/templates")}
            >
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20">
                <ClipboardCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-left">
                <p className="font-medium">Manage Templates</p>
                <p className="text-xs text-muted-foreground">
                  Evaluation criteria
                </p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 justify-start gap-3 hover:shadow-sm transition-all duration-200 hover:scale-[1.02]"
              onClick={() => navigate("/mock-interviews/training")}
            >
              <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/20">
                <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="text-left">
                <p className="font-medium">Training Programs</p>
                <p className="text-xs text-muted-foreground">Manage training</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
