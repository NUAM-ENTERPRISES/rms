import { useMemo, useState } from "react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useGetScreeningsQuery,
  useGetAssignedScreeningsQuery,
  useGetUpcomingScreeningsQuery,
} from "../data";
import { SCREENING_DECISION } from "../../types";
import { startOfWeek, endOfWeek, isWithinInterval, format } from "date-fns";
import { cn } from "@/lib/utils";
// note: using native <select> for simplicity in modal
import { Button as UiButton } from "@/components/ui/button";
import ScheduleScreeningModal from "../components/ScheduleScreeningModal";

export default function ScreeningsDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useGetScreeningsQuery(undefined);
  const interviews = data?.data || [];

  // Assigned candidate-projects for mock interviews (these are different
  // from scheduled MockInterview resources). We'll fetch these and merge
  // into the upcoming list so coordinators can see assignments that haven't
  // been scheduled into an interview yet.
  const { data: assignedData, refetch: refetchAssigned } =
    useGetAssignedScreeningsQuery({
      page: 1,
      limit: 10,
    });

  const assignedItems = assignedData?.data?.items || [];

  // UI state for scheduling modal
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(
    null
  );
  // scheduling logic moved to ScheduleMockInterviewModal

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
      (i) => i.decision === SCREENING_DECISION.APPROVED
    ).length;
    const passRate =
      completedInterviews.length > 0
        ? Math.round((approvedCount / completedInterviews.length) * 100)
        : 0;

    const inTraining = interviews.filter(
      (i) => i.decision === SCREENING_DECISION.NEEDS_TRAINING && i.trainingAssignment
    ).length;

    return {
      scheduledThisWeek,
      completedThisMonth,
      passRate,
      inTraining,
      totalScheduled: interviews.filter((i) => !i.conductedAt).length,
      totalCompleted: completedInterviews.length,
    };
  }, [interviews, assignedItems]);

  // Get upcoming interviews
  const upcomingInterviews = useMemo(() => {
    // normalize scheduled mock interviews (MockInterview[]) and assigned
    // candidate-project items so the UI can display them uniformly.
    const scheduled = interviews
      .filter((i) => i.scheduledTime && !i.conductedAt)
      .sort(
        (a, b) =>
          new Date(a.scheduledTime!).getTime() -
          new Date(b.scheduledTime!).getTime()
      )
      .slice(0, 5);

    const assignedNormalized = assignedItems
      .filter((it) => it.assignedAt)
      .map((it) => ({
        // map assigned item into a shape the UI expects for display
        id: `assignment-${it.id}`,
        scheduledTime: it.assignedAt,
        // put information where existing code looks for it
        candidateProjectMap: {
          id: it.id,
          candidate: it.candidate,
          project: it.project,
          roleNeeded: it.roleNeeded,
          recruiter: it.recruiter,
        },
        // use subStatus label (e.g. "Mock Interview Assigned") or fall back
        // to a simple Assigned tag
        mode: it.subStatus?.label || it.subStatus?.name || "Assigned",
        // keep subStatus name available so callers can show the schedule button
        subStatusName: it.subStatus?.name,
        // expose the expiry flag for UI (API returns isExpired at root)
        isExpired: Boolean((it as any).isExpired),
      }))
      .slice(0, 10);

    return [...scheduled, ...assignedNormalized]
      .sort(
        (a, b) =>
          new Date(a.scheduledTime!).getTime() -
          new Date(b.scheduledTime!).getTime()
      )
      .slice(0, 5);
  }, [interviews]);

  // Open schedule modal for an assigned candidate-project
  const openScheduleModal = (assignment: any) => {
    setSelectedAssignment(assignment);
    setIsScheduleOpen(true);
  };

  // Schedule modal is now extracted to its own component

  // Get recent completed
  // Fetch recent completed from local list (kept for other stats) -- not used by Upcoming card
  // NOTE: recent completed list is no longer used for the 'Upcoming Interviews' card

  // Fetch upcoming screenings from API (uses /screenings/upcoming?page=1&limit=5)
  const { data: upcomingData, error: upcomingError } =
    useGetUpcomingScreeningsQuery({ page: 1, limit: 5 });
  const upcomingInterviewsFromApi = upcomingData?.data?.items || [];

  const getDecisionBadge = (decision: string | null | undefined) => {
    if (!decision) return null;
    switch (decision) {
      case SCREENING_DECISION.APPROVED:
        return (
          <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/50 dark:text-green-300">
            Approved
          </Badge>
        );
      case SCREENING_DECISION.NEEDS_TRAINING:
        return (
          <Badge className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/50 dark:text-orange-300">
            Training
          </Badge>
        );
      case SCREENING_DECISION.REJECTED:
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
            Failed to load screenings. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

return (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
    <div className="w-full max-w-7xl mx-auto space-y-6 px-4 py-6">
      {/* Elegant Header */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-2xl rounded-2xl ring-1 ring-indigo-200/30">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl blur-lg opacity-30 animate-pulse-slow"></div>
                <div className="relative p-3 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent tracking-tight">
                  Screenings Dashboard
                </CardTitle>
                <CardDescription className="text-sm mt-1">
                  {interviews.length} total screening{interviews.length !== 1 ? "s" : ""} •{" "}
                  {stats.totalScheduled} scheduled • {stats.totalCompleted} completed
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Premium Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "This Week",
            value: stats.scheduledThisWeek,
            label: "Scheduled",
            icon: Calendar,
            color: "blue",
          },
          {
            title: "This Month",
            value: stats.completedThisMonth,
            label: "Completed",
            icon: ClipboardCheck,
            color: "purple",
          },
          {
            title: "Pass Rate",
            value: `${stats.passRate}%`,
            label: "Approved",
            icon: TrendingUp,
            color: "green",
          },
          {
            title: "In Training",
            value: stats.inTraining,
            label: "Active",
            icon: Users,
            color: "orange",
          },
        ].map((stat, i) => (
          <Card
            key={i}
            className={cn(
              "group relative overflow-hidden border-0 shadow-lg bg-white/75 backdrop-blur-lg rounded-2xl ring-1 ring-slate-200/30",
              "hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
            )}
          >
            <div
              className={cn(
                "absolute top-0 left-0 w-1.5 h-full",
                stat.color === "blue" && "bg-gradient-to-b from-blue-500 to-indigo-600",
                stat.color === "purple" && "bg-gradient-to-b from-purple-500 to-pink-600",
                stat.color === "green" && "bg-gradient-to-b from-green-500 to-emerald-600",
                stat.color === "orange" && "bg-gradient-to-b from-orange-500 to-amber-600"
              )}
            />
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500">{stat.title}</p>
                  <p
                    className={cn(
                      "text-3xl font-bold tracking-tight bg-gradient-to-br bg-clip-text text-transparent transition-transform duration-300 group-hover:scale-105",
                      stat.color === "blue" && "from-blue-600 to-indigo-700",
                      stat.color === "purple" && "from-purple-600 to-pink-700",
                      stat.color === "green" && "from-green-600 to-emerald-700",
                      stat.color === "orange" && "from-orange-600 to-amber-700"
                    )}
                  >
                    {stat.value}
                  </p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
                <div
                  className={cn(
                    "p-3 rounded-2xl transition-transform duration-300 group-hover:scale-110",
                    stat.color === "blue" && "bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20",
                    stat.color === "purple" && "bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20",
                    stat.color === "green" && "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20",
                    stat.color === "orange" && "bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20"
                  )}
                >
                  <stat.icon className={cn("h-6 w-6", `text-${stat.color}-600`)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two-Column Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Interviews */}
        <Card className="border-0 shadow-xl bg-white/75 backdrop-blur-2xl rounded-2xl ring-1 ring-indigo-200/30 hover:shadow-2xl transition-all duration-300">
          <CardHeader className="pb-3 border-b bg-gradient-to-r from-white to-indigo-50/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
                  <Clock className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold">Assigned For Screening</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    {upcomingInterviews.length} assigned interview{upcomingInterviews.length !== 1 ? "s" : ""}
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-4 rounded-xl border-indigo-200 hover:bg-indigo-50"
                onClick={() => navigate("/screenings/assigned")}
              >
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {upcomingInterviews.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-base font-medium">No Assigned screenings</p>
                <p className="text-sm mt-1">Scheduled screenings will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingInterviews.map((interview) => {
                  const candidate = interview.candidateProjectMap?.candidate;
                  const role = interview.candidateProjectMap?.roleNeeded;
                  const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown Candidate";

                  return (
                    <div
                      key={interview.id}
                      onClick={() => {
                        if (
                          (interview?.id || "").toString().startsWith("assignment-") ||
                          (typeof interview === "object" && "subStatusName" in interview && (interview as any).subStatusName === "screening_assigned")
                        ) {
                          navigate("/screenings/assigned");
                          return;
                        }
                        navigate(`/screenings/${interview.id}/conduct`);
                      }}
                      className="relative p-4 rounded-xl border bg-white hover:border-indigo-300 hover:shadow-md transition-all duration-300 group cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate group-hover:text-indigo-700 transition-colors">
                            {candidateName}
                          </p>
                          <p className="text-sm text-slate-500 truncate mt-0.5">
                            {role?.designation || "Unknown Role"}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs px-3 py-1">
                          {interview.mode}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-3">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {interview.scheduledTime
                            ? format(new Date(interview.scheduledTime), "MMM d, yyyy 'at' h:mm a")
                            : "Not scheduled"}
                        </span>
                      </div>

                      {/* Actions */}
                      {(typeof interview === "object" && "subStatusName" in interview && (interview as any).subStatusName === "screening_assigned") && (
                        <div className="absolute bottom-3 right-3 flex items-center gap-2">
                          {(interview as any).isExpired && (
                            <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-red-100 text-red-700 border border-red-200">
                              Expired
                            </div>
                          )}
                          <Button
                            size="sm"
                            className="h-8 px-4 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                            onClick={(e) => {
                              e.stopPropagation();
                              openScheduleModal(interview);
                            }}
                          >
                            Schedule
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Interviews */}
        <Card className="border-0 shadow-xl bg-white/75 backdrop-blur-2xl rounded-2xl ring-1 ring-indigo-200/30 hover:shadow-2xl transition-all duration-300">
          <CardHeader className="pb-3 border-b bg-gradient-to-r from-white to-indigo-50/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
                  <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold">Upcoming Screening</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    {upcomingInterviewsFromApi.length} upcoming interview{upcomingInterviewsFromApi.length !== 1 ? "s" : ""}
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-4 rounded-xl border-indigo-200 hover:bg-indigo-50"
                onClick={() => navigate("/screenings/upcoming")}
              >
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {upcomingInterviewsFromApi.length === 0 ? (
              upcomingError ? (
                <Alert variant="destructive" className="py-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {typeof upcomingError === "object" && (upcomingError as any)?.data?.message
                      ? (upcomingError as any).data.message
                      : "Failed to load upcoming interviews"}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-base font-medium">No upcoming interviews</p>
                  <p className="text-sm mt-1">Upcoming interviews will appear here</p>
                </div>
              )
            ) : (
              <div className="space-y-3">
                {upcomingInterviewsFromApi.map((interview) => {
                  const candidate = interview.candidateProjectMap?.candidate;
                  const role = interview.candidateProjectMap?.roleNeeded;
                  const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown Candidate";

                  return (
                    <div
                      key={interview.id}
                      onClick={() => navigate("/screenings/upcoming", { state: { selectedId: interview.id } })}
                      className="relative p-4 rounded-xl border bg-white hover:border-indigo-300 hover:shadow-md transition-all duration-300 group cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate group-hover:text-indigo-700 transition-colors">
                            {candidateName}
                          </p>
                          <p className="text-sm text-slate-500 truncate mt-0.5">
                            {role?.designation || "Unknown Role"}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {getDecisionBadge(interview.decision)}
                          {(interview as any)?.candidateProjectMap?.subStatus?.label && (
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-indigo-100 text-indigo-700 border border-indigo-200">
                              {(interview as any).candidateProjectMap.subStatus.label}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {interview.scheduledTime
                              ? format(new Date(interview.scheduledTime), "MMM d, yyyy 'at' h:mm a")
                              : "Not scheduled"}
                          </span>
                        </div>
                        {(interview as any).isExpired && (
                          <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-red-100 text-red-700 border border-red-200">
                            Expired
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-xl bg-white/75 backdrop-blur-2xl rounded-2xl ring-1 ring-indigo-200/30 hover:shadow-2xl transition-all duration-300">
        <CardHeader className="pb-3 border-b bg-gradient-to-r from-white to-indigo-50/30">
          <CardTitle className="text-xl font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "View All Interviews", icon: ClipboardCheck, color: "blue", path: "/screenings/list" },
              { label: "Manage Templates", icon: ClipboardCheck, color: "purple", path: "/screenings/templates" },
              { label: "Training Programs", icon: Users, color: "orange", path: "/screenings/training" },
            ].map((action, i) => (
              <Button
                key={i}
                variant="outline"
                className={cn(
                  "h-auto py-4 justify-start gap-3 rounded-xl border border-slate-200 hover:shadow-md hover:scale-[1.02] transition-all duration-300 bg-white/50",
                  "hover:bg-gradient-to-r",
                  action.color === "blue" && "hover:from-blue-50 hover:to-indigo-50",
                  action.color === "purple" && "hover:from-purple-50 hover:to-pink-50",
                  action.color === "orange" && "hover:from-orange-50 hover:to-amber-50"
                )}
                onClick={() => navigate(action.path)}
              >
                <div
                  className={cn(
                    "p-3 rounded-xl transition-transform duration-300 group-hover:scale-105",
                    action.color === "blue" && "bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20",
                    action.color === "purple" && "bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20",
                    action.color === "orange" && "bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20"
                  )}
                >
                  <action.icon className={cn("h-5 w-5", `text-${action.color}-600`)} />
                </div>
                <div className="text-left">
                  <p className="text-base font-medium">{action.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Manage your {action.label.toLowerCase()}</p>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

        {/* Schedule modal (extracted to separate component) */}
        <ScheduleScreeningModal
          open={isScheduleOpen}
          onOpenChange={(open) => {
            setIsScheduleOpen(open);
            if (!open) setSelectedAssignment(null);
          }}
          selectedAssignment={selectedAssignment}
          refetchAssigned={refetchAssigned}
        />

        {/* Quick Actions */}
        {/* <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="h-auto py-3 justify-start gap-3 hover:shadow-sm transition-all duration-200 hover:scale-[1.02] border-0 bg-white/50 hover:bg-white/80"
                onClick={() => navigate("/screenings/list")}
              >
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20">
                  <ClipboardCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">View All Interviews</p>
                  <p className="text-xs text-muted-foreground">
                    See complete list
                  </p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-3 justify-start gap-3 hover:shadow-sm transition-all duration-200 hover:scale-[1.02] border-0 bg-white/50 hover:bg-white/80"
                onClick={() => navigate("/screenings/templates")}
              >
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20">
                  <ClipboardCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Manage Templates</p>
                  <p className="text-xs text-muted-foreground">
                    Evaluation criteria
                  </p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-3 justify-start gap-3 hover:shadow-sm transition-all duration-200 hover:scale-[1.02] border-0 bg-white/50 hover:bg-white/80"
                onClick={() => navigate("/screenings/training")}
              >
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/20">
                  <Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Training Programs</p>
                  <p className="text-xs text-muted-foreground">
                    Manage training
                  </p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card> */}
      </div>
    </div>
  );
}
