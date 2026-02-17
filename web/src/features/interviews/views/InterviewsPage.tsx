import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, TrendingUp, ClipboardCheck, Mail } from "lucide-react";
import { Calendar, RefreshCw } from "lucide-react";
import { useCan } from "@/hooks/useCan";
import { ImageViewer } from "@/components/molecules/ImageViewer";
import { useGetInterviewsQuery, useGetUpcomingInterviewsQuery, useGetInterviewsDashboardQuery, useGetShortlistPendingQuery, useUpdateClientDecisionMutation } from "../api";
import ScheduleInterviewDialog from "../components/ScheduleInterviewDialog";
import EditInterviewDialog from "../components/EditInterviewDialog";
import { ClientDecisionModal } from "../components/ClientDecisionModal";
import { toast } from "sonner";

// STATUS_KEYS not used in dashboard layout (kept for compatibility if table-based view is readded)

// Dashboard uses a simplified overview — helper formatters available here if needed

export default function InterviewsPage() {
  const navigate = useNavigate();
  // Search and filter UI removed for dashboard; retain state if table is reintroduced later
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleDialogInitial] = useState<{
    candidateProjectMapId?: string;
    candidateName?: string;
    projectName?: string;
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
  // Ensure upcoming hook is called unconditionally (avoid hooks ordering changes)
  const { data: upcomingData, refetch: refetchUpcoming } = useGetUpcomingInterviewsQuery({ page: 1, limit: 5 });

  type InterviewRecord = Record<string, any>;
  const interviews = (interviewsData?.data?.interviews ??
    []) as InterviewRecord[];
  const totalInterviews = interviewsData?.data?.pagination?.total ?? 0;

  const { data: dashboardData, refetch: refetchDashboard } = useGetInterviewsDashboardQuery();

  const { data: shortlistData, refetch: refetchShortlist } = useGetShortlistPendingQuery({ page: 1, limit: 5 });

  // Dashboard: client-decision modal for shortlist preview
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [selectedShortlisting, setSelectedShortlisting] = useState<any | null>(null);
  const [updateClientDecision, { isLoading: isUpdatingDecision }] = useUpdateClientDecisionMutation();

  async function handleClientDecision(decision: "shortlisted" | "not_shortlisted" | null, reason: string) {
    if (!selectedShortlisting || !decision) return;

    try {
      const res = await updateClientDecision({ id: selectedShortlisting.id, data: { decision, notes: reason } }).unwrap();

      if (res.success) {
        toast.success(decision === 'shortlisted' ? 'Candidate shortlisted successfully' : 'Candidate marked as not shortlisted');
        setDecisionModalOpen(false);
        setSelectedShortlisting(null);
        refetchShortlist?.();
      }
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to update candidate status');
    }
  }

  // legacy: status breakdown removed; dashboard uses card-based stats

  useCan("schedule:interviews");

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
            <Button size="sm" onClick={() => {
                try {
                  refetch?.();
                  refetchUpcoming?.();
                  refetchDashboard?.();
                } catch (e) {
                  // ignore
                }
              }}>
                <RefreshCw className="mr-2 h-4 w-4" /> Retry
              </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const now = new Date();

  

  const upcomingInterviews = upcomingData?.data?.interviews ?? [];

  const shortlistingPreview = shortlistData?.data?.items ?? [];
  const shortlistingCount = shortlistData?.data?.pagination?.total ?? 0;

  // Build stats using server-provided dashboard data when available, otherwise fall back to local calculations
  const scheduledThisWeek = dashboardData?.data?.thisWeek?.count ?? interviews.filter((iv) => {
    if (!iv.scheduledTime) return false;
    const d = new Date(iv.scheduledTime);
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    return d >= weekAgo && d <= now && !iv.conductedAt;
  }).length;

  // API no longer provides per-day or previous totals; keep simple count only

  const completedThisMonth = dashboardData?.data?.thisMonth?.completedCount ?? interviews.filter((iv) => {
    if (!iv.conductedAt) return false;
    const d = new Date(iv.conductedAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const passRate = dashboardData?.data?.thisMonth?.passRate !== undefined
    ? dashboardData.data.thisMonth.passRate
    : (() => {
        const completed = interviews.filter((iv) => iv.conductedAt).length;
        const passed = interviews.filter((iv) => (iv.status || "").toLowerCase() === "passed").length;
        return completed === 0 ? 0 : (passed / completed) * 100;
      })();

  // helper counts for display
  const passedCount = dashboardData?.data?.thisMonth?.passedCount ?? undefined;
  const completedCount = dashboardData?.data?.thisMonth?.completedCount ?? completedThisMonth;
  const failedCount = Number.isFinite(completedCount) ? (completedCount - (passedCount ?? 0)) : undefined;

  const inTraining = 0;
  const stats = { scheduledThisWeek, completedThisMonth, passRate, inTraining };

  // Dashboard layout similar to mock interviews
  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full space-y-6 py-2">
      <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-5 shadow-lg backdrop-blur-sm">
  {/* Header */}
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 border border-blue-200">
        <Calendar className="h-5 w-5 text-blue-600" />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
          Interview Dashboard
        </p>
        <h2 className="text-lg font-bold text-slate-900 mt-0.5">
          Orchestrate every panel with clarity
        </h2>
      </div>
    </div>

    <Button
      variant="outline"
      size="sm"
      className="h-9 px-4 text-sm font-medium border-slate-300 hover:bg-slate-50"
      onClick={() => {
        try {
          refetch?.();
          refetchUpcoming?.();
          refetchDashboard?.();
        } catch (e) {}
      }}
    >
      <RefreshCw className="mr-2 h-4 w-4" />
      Refresh
    </Button>
  </div>

  {/* Stats Grid – Medium & Compact */}
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    {/* Scheduled This Week */}
    <div className="group relative rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 hover:shadow-md transition-all duration-300">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-blue-600 rounded-l-xl" />
      
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-600">Scheduled (7d)</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {stats.scheduledThisWeek}
          </p>
          <p className="text-xs text-slate-500 mt-1">last 7 days</p>
        </div>
        <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
          <Calendar className="h-5 w-5 text-blue-600" />
        </div>
      </div>
    </div>

    {/* Completed This Month */}
    <div className="group relative rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 hover:shadow-md transition-all duration-300">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-purple-600 rounded-l-xl" />
      
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-600">This Month</p>
          <p className="mt-2 text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
            {stats.completedThisMonth}
          </p>
          <p className="text-xs text-slate-500 mt-1">completed</p>
        </div>
        <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200">
          <ClipboardCheck className="h-5 w-5 text-purple-600" />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-3 gap-3 text-center text-xs">
        <div>
          <div className="font-bold text-slate-900">{passedCount ?? "-"}</div>
          <div className="text-slate-500">Passed</div>
        </div>
        <div>
          <div className="font-bold text-slate-900">{failedCount !== undefined ? failedCount : "-"}</div>
          <div className="text-slate-500">Failed</div>
        </div>
        <div>
          <div className="font-bold text-purple-600">{Number(passRate ?? stats.passRate).toFixed(1)}%</div>
          <div className="text-slate-500">Pass Rate</div>
        </div>
      </div>
    </div>

    {/* Overall Pass Rate */}
    <div className="group relative rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 hover:shadow-md transition-all duration-300">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-l-xl" />
      
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-600">Overall Pass Rate</p>
          <p className="mt-2 text-4xl font-extrabold bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">
            {Number(passRate ?? stats.passRate).toFixed(1)}%
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {passedCount ?? "-"} passed • {failedCount !== undefined ? failedCount : "-"} failed
          </p>
        </div>
        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
        </div>
      </div>
    </div>
  </div>
</section>

       <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-md rounded-3xl overflow-hidden">
  <CardHeader className="border-b border-slate-100/60 bg-white/70 backdrop-blur-sm pb-6">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-1.5">
        <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight">
          Interview Dashboard
        </CardTitle>
        <CardDescription className="text-base text-slate-600">
          Track and manage your assigned and upcoming candidate interviews
        </CardDescription>
      </div>
    </div>
  </CardHeader>

  <CardContent className="p-8 space-y-10">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Short Listing Pending Candidates */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden">
        <CardHeader className="pb-5 bg-gradient-to-r from-amber-50/80 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-gradient-to-br from-amber-100 to-amber-50 rounded-2xl shadow-md border border-amber-200/60">
                <Mail className="h-7 w-7 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-900">
                  Short Listing Pending Candidates
                </CardTitle>
                <CardDescription className="text-sm mt-1.5 text-slate-600">
                  {shortlistingCount} candidate{shortlistingCount !== 1 ? "s" : ""} sent to client for review
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (shortlistingPreview[0]?.id) {
                  navigate("/interviews/shortlisting", { state: { selectedId: shortlistingPreview[0]?.id } });
                } else {
                  navigate("/interviews/shortlisting");
                }
              }}
              disabled={shortlistingCount === 0}
              className="group text-sm font-medium text-amber-600 hover:bg-amber-50 hover:text-amber-700"
            >
              View All
              <ArrowRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {shortlistingCount === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Calendar className="h-14 w-14 mx-auto mb-5 opacity-40" />
              <p className="font-semibold text-lg">No shortlisting items</p>
              <p className="text-sm mt-2">Candidates sent to clients will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {shortlistingPreview.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/interviews/shortlisting`, { state: { selectedId: c.id } })}
                  className="group relative p-5 rounded-2xl border border-slate-200/80 hover:border-amber-300 hover:bg-amber-50/60 hover:shadow-lg transition-all duration-300 cursor-pointer"
                >
                  <div className="flex items-start justify-between pr-28">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <ImageViewer
                        src={c.candidate?.profileImage}
                        title={c.candidate ? `${c.candidate.firstName} ${c.candidate.lastName}` : "Unknown"}
                        className="h-12 w-12 shrink-0 shadow-sm"
                        enableHoverPreview={false}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-semibold text-slate-900 truncate">
                          {c.candidate ? `${c.candidate.firstName} ${c.candidate.lastName}` : "Unknown"}
                        </p>
                        <p className="text-sm text-slate-600 truncate mt-1">
                          {c.roleNeeded?.designation || "Unknown Role"}
                          {c.candidate?.qualifications?.[0]?.qualification?.shortName || c.candidate?.qualifications?.[0]?.qualification?.name ? (
                            <span className="text-xs text-muted-foreground ml-2">• {c.candidate.qualifications[0].qualification.shortName || c.candidate.qualifications[0].qualification.name}</span>
                          ) : null}
                          <span className="text-slate-500 ml-2">• {c.project?.title || "No Project"}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-4 text-sm text-slate-600">
                    <Calendar className="h-4.5 w-4.5" />
                    <span className="font-medium">
                      {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : "Just now"}
                    </span>
                    {c.latestForward?.sender?.name && (
                      <span className="text-xs text-muted-foreground ml-2">• forwarded by {c.latestForward.sender.name}</span>
                    )}
                    <Badge className="ml-auto text-xs bg-emerald-100 text-emerald-700 border-emerald-200 font-medium">
                      {c.subStatus?.label || "Sent to Client"}
                    </Badge>
                  </div>

                  <div className="absolute right-4 top-4">
                    <Button
                      size="sm"
                      className="h-8 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-sm hover:shadow-md"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedShortlisting(c);
                        setDecisionModalOpen(true);
                      }}
                      aria-label={`Update client decision for ${c.candidate?.firstName ?? 'candidate'}`}
                    >
                      Update
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Interviews – Teal Theme */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden">
        <CardHeader className="pb-5 bg-gradient-to-r from-teal-50/80 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-gradient-to-br from-teal-100 to-teal-50 rounded-2xl shadow-md border border-teal-200/60">
                <CheckCircle2 className="h-7 w-7 text-teal-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-900">
                  Upcoming Interviews
                </CardTitle>
                <CardDescription className="text-sm mt-1.5 text-slate-600">
                  {upcomingInterviews.length} confirmed interview{upcomingInterviews.length !== 1 ? "s" : ""}
                </CardDescription>
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
              className="group text-sm font-medium text-teal-600 hover:bg-teal-50 hover:text-teal-700"
            >
              View All
              <ArrowRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {upcomingInterviews.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Calendar className="h-14 w-14 mx-auto mb-5 opacity-40" />
              <p className="font-semibold text-lg">No upcoming interviews</p>
              <p className="text-sm mt-2">Scheduled interviews will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingInterviews.map((interview) => {
                const candidate = interview.candidate || interview.candidateProjectMap?.candidate;
                const role = interview.roleNeeded || interview.candidateProjectMap?.roleNeeded;
                const project = interview.project || interview.candidateProjectMap?.project;
                return (
                  <div
                    key={interview.id}
                    onClick={() => navigate(`/interviews/upcoming`, { state: { selectedId: interview.id } })}
                    className="group p-5 rounded-2xl border border-slate-200/80 hover:border-teal-300 hover:bg-teal-50/60 hover:shadow-lg transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <ImageViewer
                          src={candidate?.profileImage}
                          title={candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown"}
                          className="h-12 w-12 shrink-0 shadow-sm"
                          enableHoverPreview={false}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-semibold text-slate-900 truncate">
                            {candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown Candidate"}
                          </p>
                          <p className="text-sm text-slate-600 truncate mt-1">
                            {role?.designation || "Unknown Role"} • <span className="text-slate-500">{project?.title || "No Project"}</span>
                          </p>
                        </div>
                      </div>
                      <Badge className="ml-6 text-xs font-semibold bg-teal-100 text-teal-700 border-teal-200 px-4 py-1.5 shadow-sm">
                        {interview.candidateProjectMap?.subStatus?.label || interview.candidateProjectMap?.subStatus?.name || 'Scheduled'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 mt-4 text-sm text-slate-600">
                      <Calendar className="h-4.5 w-4.5" />
                      <span className="font-medium">
                        {interview.scheduledTime 
                          ? new Date(interview.scheduledTime).toLocaleString() 
                          : "Not scheduled"}
                      </span>
                      {interview.expired && (
                        <Badge className="ml-auto text-xs bg-rose-100 text-rose-700 border-rose-200 font-medium">
                          Expired
                        </Badge>
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
      <div className="text-center pt-6">
        <p className="text-sm font-medium text-slate-500">
          Showing {interviews.length} of {totalInterviews} total interviews
        </p>
      </div>
    )}
  </CardContent>
</Card>

      <ClientDecisionModal
        open={decisionModalOpen}
        onOpenChange={(open) => {
          setDecisionModalOpen(open);
          if (!open) setSelectedShortlisting(null);
        }}
        candidateName={selectedShortlisting?.candidate ? `${selectedShortlisting.candidate.firstName} ${selectedShortlisting.candidate.lastName}` : 'Unknown Candidate'}
        onSubmit={handleClientDecision}
        isSubmitting={isUpdatingDecision}
      />

        <ScheduleInterviewDialog
          open={scheduleDialogOpen}
          onOpenChange={(open) => setScheduleDialogOpen(open)}
          initialCandidateProjectMapId={scheduleDialogInitial.candidateProjectMapId}
          initialCandidateName={scheduleDialogInitial.candidateName}
          initialProjectName={scheduleDialogInitial.projectName}
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
