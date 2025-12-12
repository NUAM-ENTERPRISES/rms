import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, Clock, TrendingUp, ClipboardCheck } from "lucide-react";
import { Plus, Calendar, RefreshCw } from "lucide-react";
import { useCan } from "@/hooks/useCan";
import { useGetInterviewsQuery, useGetAssignedInterviewsQuery, useGetUpcomingInterviewsQuery } from "../api";
import ScheduleInterviewDialog from "../components/ScheduleInterviewDialog";
import EditInterviewDialog from "../components/EditInterviewDialog";

// STATUS_KEYS not used in dashboard layout (kept for compatibility if table-based view is readded)

// Dashboard uses a simplified overview — helper formatters available here if needed

export default function InterviewsPage() {
  const navigate = useNavigate();
  // Search and filter UI removed for dashboard; retain state if table is reintroduced later
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleDialogInitial, setScheduleDialogInitial] = useState<{
    candidateProjectMapId?: string;
  }>({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedInterviewId] = useState<string>("");

  const {
    data: interviewsData,
    isLoading,
    error,
    refetch,
  } = useGetInterviewsQuery({
    page: 1,
    limit: 50,
  });
  const { data: assignedData } = useGetAssignedInterviewsQuery({ page: 1, limit: 5 });
  // Ensure upcoming hook is called unconditionally (avoid hooks ordering changes)
  const { data: upcomingData } = useGetUpcomingInterviewsQuery({ page: 1, limit: 5 });

  type InterviewRecord = Record<string, any>;
  const interviews = (interviewsData?.data?.interviews ??
    []) as InterviewRecord[];
  const totalInterviews = interviewsData?.data?.pagination?.total ?? 0;

  // legacy: status breakdown removed; dashboard uses card-based stats

  const canScheduleInterviews = useCan("schedule:interviews");

  // Compute derived values and memoized hooks before any conditional returns to keep hooks order stable
  

  // Edit/Delete actions are available on the InterviewsPage table UI only. Not used on dashboard widgets.

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="mt-3 text-sm text-slate-500">Loading interviews…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-sm border border-slate-100 shadow-xl">
          <CardContent className="space-y-4 pt-8 text-center">
            <RefreshCw className="mx-auto h-10 w-10 text-rose-500" />
            <p className="text-lg font-semibold text-slate-900">
              Failed to load
            </p>
            <Button size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const now = new Date();

  const scheduledThisWeek = interviews.filter((iv) => {
    if (!iv.scheduledTime) return false;
    const d = new Date(iv.scheduledTime);
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    return d >= weekAgo && d <= now && !iv.conductedAt;
  }).length;

  const completedThisMonth = interviews.filter((iv) => {
    if (!iv.conductedAt) return false;
    const d = new Date(iv.conductedAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const completed = interviews.filter((iv) => iv.conductedAt).length;
  const passed = interviews.filter((iv) => (iv.status || "").toLowerCase() === "passed").length;
  const passRate = completed === 0 ? 0 : Math.round((passed / completed) * 100);
  const inTraining = 0;
  const stats = { scheduledThisWeek, completedThisMonth, passRate, inTraining };

  const upcomingInterviews = upcomingData?.data?.interviews ?? [];

  const assignedInterviews = assignedData?.data?.items ?? [];

  // Dashboard layout similar to mock interviews
  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full space-y-6 py-2">
        <section className="rounded-3xl border border-white/60 bg-white/95 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-500">
                  Interview Dashboard
                </p>
                <h1 className="text-2xl font-black text-slate-900">
                  Orchestrate every panel with clarity
                </h1>
              </div>
            </div>
              <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              {canScheduleInterviews && (
                <Button size="sm" onClick={() => { setScheduleDialogInitial({}); setScheduleDialogOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule
                </Button>
              )}
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="group relative overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 rounded-2xl">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-blue-600" />
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">This Week</p>
                    <p className="text-2xl font-bold bg-gradient-to-br from-blue-600 to-blue-700 bg-clip-text text-transparent">{stats.scheduledThisWeek}</p>
                    <p className="text-xs text-muted-foreground">Scheduled</p>
                  </div>
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 rounded-2xl">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-purple-600" />
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">This Month</p>
                    <p className="text-2xl font-bold bg-gradient-to-br from-purple-600 to-purple-700 bg-clip-text text-transparent">{stats.completedThisMonth}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20">
                    <ClipboardCheck className="h-4 w-4 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 rounded-2xl">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-500 to-green-600" />
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Pass Rate</p>
                    <p className="text-2xl font-bold bg-gradient-to-br from-green-600 to-green-700 bg-clip-text text-transparent">{stats.passRate}%</p>
                    <p className="text-xs text-muted-foreground">Approved</p>
                  </div>
                  <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              </div>
            </div>

          

          </div>
        </section>

        <Card className="border(border-slate-100) shadow-lg">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Interview Dashboard
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-6">

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
                        <CardTitle className="text-lg font-semibold">Assigned Interviews</CardTitle>
                        <CardDescription className="text-xs mt-0.5">{assignedInterviews.length} assigned interview{assignedInterviews.length !== 1 ? "s" : ""}</CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (assignedInterviews[0]?.id) {
                          navigate("/interviews/assigned", { state: { selectedId: assignedInterviews[0]?.id } });
                        } else {
                          navigate("/interviews/assigned");
                        }
                      }}
                      disabled={assignedInterviews.length === 0}
                      className="gap-1 h-8 px-2 text-xs hover:bg-accent/50"
                    >
                      View All
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {assignedInterviews.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium">No Assigned interviews</p>
                      <p className="text-xs">Assigned interviews will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {assignedInterviews.map((interview) => {
                        const candidate = interview.candidate;
                        const role = interview.roleNeeded;
                        return (
                            <div key={interview.id} className="relative w-full p-3 rounded-lg border hover:border-primary/50 hover:bg-accent/50 transition-all duration-200 text-left group hover:shadow-sm" onClick={() => navigate(`/interviews/assigned`, { state: { selectedId: interview.id } })}>
                            <div className="flex items-start justify-between mb-1.5">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown Candidate"}</p>
                                <p className="text-xs text-muted-foreground truncate">{role?.designation || "Unknown Role"}</p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {interview.mode && <Badge variant="outline" className="text-xs">{interview.mode}</Badge>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>{interview.scheduledTime ? new Date(interview.scheduledTime).toLocaleString() : "Not scheduled"}</span>
                              {interview.expired && (
                                <Badge className="text-xs capitalize bg-rose-50 text-rose-700 border border-rose-100 ml-2">Expired</Badge>
                              )}
                            </div>
                            {/* Right-side stack: sub-status badge (top) and schedule button (bottom) with spacing */}
                            <div className="absolute right-3 top-3 bottom-3 flex flex-col justify-between items-end gap-3">
                              <div className="flex flex-col items-end gap-2">
                                <Badge className="text-xs capitalize bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded-md">{(interview as any).subStatus?.label || (interview as any).subStatus?.name || 'Assigned'}</Badge>
                                {/* expired badge shown next to scheduled time */}
                                <Button size="sm" className="px-2 py-1 text-xs rounded-md bg-orange-500 text-white hover:bg-orange-600" onClick={(e) => { e.stopPropagation(); setScheduleDialogInitial({}); setScheduleDialogOpen(true); }}>
                                  Schedule
                                </Button>
                              </div>
                            </div>
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
                        <CardTitle className="text-lg font-semibold">Upcoming Interviews</CardTitle>
                        <CardDescription className="text-xs mt-0.5">{upcomingInterviews.length} upcoming interview{upcomingInterviews.length !== 1 ? "s" : ""}</CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (upcomingInterviews[0]?.id) {
                          navigate("/interviews/upcoming", { state: { selectedId: upcomingInterviews[0]?.id } });
                        } else {
                          navigate("/interviews/upcoming");
                        }
                      }}
                      disabled={upcomingInterviews.length === 0}
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
                      <p className="text-sm font-medium">No Upcoming interviews</p>
                      <p className="text-xs">Upcoming interviews will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {upcomingInterviews.map((interview) => {
                        const candidate = interview.candidate || interview.candidateProjectMap?.candidate;
                        const role = interview.roleNeeded || interview.candidateProjectMap?.roleNeeded;
                        return (
                          <div key={interview.id} onClick={() => navigate(`/interviews/upcoming`, { state: { selectedId: interview.id } })} className="relative w-full p-3 rounded-lg border hover:border-primary/50 hover:bg-accent/50 transition-all duration-200 text-left hover:shadow-sm">
                            <div className="flex items-start justify-between mb-1.5">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown Candidate"}</p>
                                <p className="text-xs text-muted-foreground truncate">{role?.designation || "Unknown Role"}</p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge className="text-xs capitalize bg-blue-100 text-blue-700 border border-blue-100">
                                  {interview.candidateProjectMap?.subStatus?.label || interview.candidateProjectMap?.subStatus?.name || 'Scheduled'}
                                </Badge>
                                {/* expired badge shown next to scheduled time */}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>{interview.scheduledTime ? new Date(interview.scheduledTime).toLocaleString() : "Not scheduled"}</span>
                              {interview.expired && (
                                <Badge className="text-xs capitalize bg-rose-50 text-rose-700 border border-rose-100 ml-2">Expired</Badge>
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
            {interviews.length > 0 && (
              <p className="text-center text-xs text-slate-500">
                Showing {interviews.length} of {totalInterviews} interviews
              </p>
            )}
          </CardContent>
        </Card>

        <ScheduleInterviewDialog
          open={scheduleDialogOpen}
          onOpenChange={(open) => setScheduleDialogOpen(open)}
          initialCandidateProjectMapId={scheduleDialogInitial.candidateProjectMapId}
        />
        <EditInterviewDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          interviewId={selectedInterviewId}
        />
      </div>
    </div>
  );
}

  // Summary meta retained for backward compatibility — not used by dashboard cards currently
  // Summary helpers removed; dashboard uses simplified cards
