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
    <div className="min-h-screen">
      <div className="w-full mx-auto space-y-6 mt-2">
        {/* Header */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20">
                  <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                    <div>
                      <CardTitle className="text-xl font-semibold tracking-tight">
                        Screenings Dashboard
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {interviews.length} total screening
                        {interviews.length !== 1 ? "s" : ""} •{" "}
                        {stats.totalScheduled} scheduled • {stats.totalCompleted}{" "}
                        completed
                      </CardDescription>
                    </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="group relative overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-blue-600" />
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    This Week
                  </p>
                  <p className="text-2xl font-bold bg-gradient-to-br from-blue-600 to-blue-700 bg-clip-text text-transparent transition-transform duration-300 group-hover:scale-105">
                    {stats.scheduledThisWeek}
                  </p>
                    <p className="text-xs text-muted-foreground">
                    Scheduled screenings
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-purple-600" />
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    This Month
                  </p>
                  <p className="text-2xl font-bold bg-gradient-to-br from-purple-600 to-purple-700 bg-clip-text text-transparent transition-transform duration-300 group-hover:scale-105">
                    {stats.completedThisMonth}
                  </p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 group-hover:scale-110 transition-transform duration-300">
                  <ClipboardCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-500 to-green-600" />
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Pass Rate
                  </p>
                  <p className="text-2xl font-bold bg-gradient-to-br from-green-600 to-green-700 bg-clip-text text-transparent transition-transform duration-300 group-hover:scale-105">
                    {stats.passRate}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Approved candidates
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-500 to-orange-600" />
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    In Training
                  </p>
                  <p className="text-2xl font-bold bg-gradient-to-br from-orange-600 to-orange-700 bg-clip-text text-transparent transition-transform duration-300 group-hover:scale-105">
                    {stats.inTraining}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Active programs
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/20 group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Assigned Interviews */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">
                      Assigned Interviews
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {upcomingInterviews.length} assigned interview
                      {upcomingInterviews.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/screenings/assigned")}
                  className="gap-1 h-8 px-2 text-xs hover:bg-accent/50"
                >
                  View All
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {upcomingInterviews.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No Assigned screenings</p>
                  <p className="text-xs">
                    Scheduled screenings will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingInterviews.map((interview) => {
                    const candidate = interview.candidateProjectMap?.candidate;
                    const role = interview.candidateProjectMap?.roleNeeded;

                    return (
                      <div
                        key={interview.id}
                        className="relative w-full p-3 rounded-lg border hover:border-primary/50 hover:bg-accent/50 transition-all duration-200 text-left group hover:shadow-sm"
                        onClick={() => {
                          // If this is an assigned candidate-project (not an actual mock interview)
                          // and it has the screening_assigned substatus, open the schedule modal
                          if (
                            (interview?.id || "")
                              .toString()
                              .startsWith("assignment-") ||
                            (typeof interview === "object" &&
                              "subStatusName" in interview &&
                              (interview as any).subStatusName ===
                                "screening_assigned")
                          ) {
                            // Clicking the small dashboard card should take user to the
                            // full Assigned items page. Only the floating button opens the modal.
                            navigate("/screenings/assigned");
                            return;
                          }
                          navigate(`/screenings/${interview.id}/conduct`);
                        }}
                      >
                        <div className="flex items-start justify-between mb-1.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {candidate
                                ? `${candidate.firstName} ${candidate.lastName}`
                                : "Unknown Candidate"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {role?.designation || "Unknown Role"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <Badge variant="outline" className="text-xs">
                              {interview.mode}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {interview.scheduledTime
                              ? format(
                                  new Date(interview.scheduledTime),
                                  "MMM d, yyyy 'at' h:mm a"
                                )
                              : "Not scheduled"}
                          </span>
                        </div>
                        {/* floating action on assignment cards */}
                        {typeof interview === "object" &&
                          "subStatusName" in interview &&
                          (interview as any).subStatusName ===
                            "screening_assigned" && (
                            <div className="absolute bottom-3 right-3 flex items-center gap-2">
                              {/* when an assignment is expired show a small badge next to the action */}
                              {(interview as any).isExpired && (
                                <div className="flex-shrink-0">
                                  <div className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-destructive/10 text-destructive border border-destructive/20">
                                    Date expired
                                  </div>
                                </div>
                              )}
                              <UiButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openScheduleModal(interview);
                                }}
                                size="sm"
                                className="h-8 px-3 text-sm bg-primary text-white hover:bg-primary/90 shadow-sm rounded-full"
                              >
                                Schedule Screening
                              </UiButton>
                            </div>
                          )}

                        {/* for scheduled interviews (non-assignment) show expiry badge bottom-right as well */}
                        {(interview as any).isExpired &&
                          !(
                            typeof interview === "object" &&
                            "subStatusName" in interview &&
                            (interview as any).subStatusName ===
                            "screening_assigned"
                          ) && (
                            <div className="absolute bottom-3 right-3">
                              <div className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-destructive/10 text-destructive border border-destructive/20">
                                Date expired
                              </div>
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
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">
                      Upcoming Interviews
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {upcomingInterviewsFromApi.length} upcoming interview
                      {upcomingInterviewsFromApi.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/screenings/upcoming")}
                  className="gap-1 h-8 px-2 text-xs hover:bg-accent/50"
                >
                  View All
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {upcomingInterviewsFromApi.length === 0 ? (
                upcomingError ? (
                  <div className="py-4">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {/* Try to display backend validation or error message when available */}
                        {typeof upcomingError === "object" &&
                        (upcomingError as any)?.data?.message
                          ? (upcomingError as any).data.message
                          : "Failed to load upcoming interviews. Please try again."}
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">
                      No upcoming interviews yet
                    </p>
                    <p className="text-xs">
                      Upcoming interviews will appear here
                    </p>
                  </div>
                )
              ) : (
                <div className="space-y-2">
                  {upcomingInterviewsFromApi.map((interview) => {
                    const candidate = interview.candidateProjectMap?.candidate;
                    const role = interview.candidateProjectMap?.roleNeeded;

                    return (
                      <div
                        key={interview.id}
                        onClick={() =>
                          navigate("/screenings/upcoming", {
                            state: { selectedId: interview.id },
                          })
                        }
                        className="relative w-full p-3 rounded-lg border hover:border-primary/50 hover:bg-accent/50 transition-all duration-200 text-left hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between mb-1.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {candidate
                                ? `${candidate.firstName} ${candidate.lastName}`
                                : "Unknown Candidate"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {role?.designation || "Unknown Role"}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2 ml-2">
                            {getDecisionBadge(interview.decision)}
                            {/* substatus: show at top-right (if provided) */}
                            {(interview as any)?.candidateProjectMap?.subStatus
                              ?.label && (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 mt-1">
                                <span className="truncate">
                                  {
                                    (interview as any).candidateProjectMap
                                      .subStatus.label
                                  }
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {interview.scheduledTime
                                ? format(
                                    new Date(interview.scheduledTime),
                                    "MMM d, yyyy 'at' h:mm a"
                                  )
                                : "Not scheduled"}
                            </span>
                          </div>
                          {/* overallScore and conduct buttons intentionally removed from card */}
                        </div>

                        {/* show an expiry badge when the API signals the interview is expired */}
                        {(interview as any).isExpired && (
                          <div className="absolute bottom-3 right-3">
                            <div className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-destructive/10 text-destructive border border-destructive/20">
                              Date expired
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
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
        </Card>
      </div>
    </div>
  );
}
