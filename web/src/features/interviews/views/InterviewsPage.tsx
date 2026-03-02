import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, TrendingUp, ClipboardCheck, Mail, X } from "lucide-react";
import { Calendar, RefreshCw } from "lucide-react";
import { useCan } from "@/hooks/useCan";
import { ImageViewer } from "@/components/molecules/ImageViewer";
import { useGetInterviewsQuery, useGetShortlistedQuery, useGetNotShortlistedQuery, useGetInterviewsDashboardQuery, useGetShortlistPendingQuery, useUpdateClientDecisionMutation } from "../api";
import ScheduleInterviewDialog from "../components/ScheduleInterviewDialog";
import EditInterviewDialog from "../components/EditInterviewDialog";
import { ClientDecisionModal } from "../components/ClientDecisionModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext"; // ← added this import

export default function InterviewsPage() {
  const navigate = useNavigate();
  const { theme } = useTheme(); // ← added this line
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

  const { data: shortlistedData, refetch: refetchShortlistedPreview } = useGetShortlistedQuery({ page: 1, limit: 5 });

  const { data: notShortlistedData, refetch: refetchNotShortlistedPreview } = useGetNotShortlistedQuery({ page: 1, limit: 5 });

  type InterviewRecord = Record<string, any>;
  const interviews = (interviewsData?.data?.interviews ?? []) as InterviewRecord[];
  const totalInterviews = interviewsData?.data?.pagination?.total ?? 0;

  const { data: dashboardData, refetch: refetchDashboard } = useGetInterviewsDashboardQuery();

  const { data: shortlistData, refetch: refetchShortlist } = useGetShortlistPendingQuery({ page: 1, limit: 5 });

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
        refetchShortlistedPreview?.();
        refetchNotShortlistedPreview?.();
        refetchDashboard?.();
      }
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to update candidate status');
    }
  }

  useCan("schedule:interviews");

  const now = new Date();

  const shortlistedPreview = shortlistedData?.data?.items ?? [];
  const shortlistedCountPreview = shortlistedData?.data?.pagination?.total ?? 0;

  const notShortlistedPreview = notShortlistedData?.data?.items ?? [];
  const notShortlistedCountPreview = notShortlistedData?.data?.pagination?.total ?? 0;

  const shortlistingPreview = shortlistData?.data?.items ?? [];
  const shortlistingCount = shortlistData?.data?.pagination?.total ?? 0;

  const scheduledThisWeek = dashboardData?.data?.thisWeek?.count ?? interviews.filter((iv) => {
    if (!iv.scheduledTime) return false;
    const d = new Date(iv.scheduledTime);
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    return d >= weekAgo && d <= now && !iv.conductedAt;
  }).length;

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

  const passedCount = dashboardData?.data?.thisMonth?.passedCount ?? undefined;
  const completedCount = dashboardData?.data?.thisMonth?.completedCount ?? completedThisMonth;
  const failedCount = Number.isFinite(completedCount) ? (completedCount - (passedCount ?? 0)) : undefined;

  const inTraining = 0;
  const stats = { scheduledThisWeek, completedThisMonth, passRate, inTraining };

  if (isLoading) {
    return (
      <div className={cn(
        "flex min-h-screen items-center justify-center",
        theme === "dark" ? "bg-black" : "bg-slate-50"
      )}>
        <div className="text-center">
          <div className={cn(
            "mx-auto h-12 w-12 animate-spin rounded-full border-4",
            theme === "dark" ? "border-slate-700 border-t-blue-500" : "border-slate-200 border-t-blue-600"
          )} />
          <p className={cn(
            "mt-3 text-sm",
            theme === "dark" ? "text-slate-400" : "text-slate-500"
          )}>
            Loading interviews…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn(
        "flex min-h-screen items-center justify-center p-6",
        theme === "dark" ? "bg-black" : "bg-slate-50"
      )}>
        <Card className={cn(
          "max-w-sm border shadow-xl",
          theme === "dark" ? "bg-slate-900 border-slate-700" : "border-slate-100 bg-white"
        )}>
          <CardContent className="space-y-4 pt-8 text-center">
            <RefreshCw className={cn(
              "mx-auto h-10 w-10",
              theme === "dark" ? "text-rose-400" : "text-rose-500"
            )} />
            <p className={cn(
              "text-lg font-semibold",
              theme === "dark" ? "text-slate-100" : "text-slate-900"
            )}>
              Failed to load
            </p>
            <Button 
              size="sm" 
              onClick={() => {
                try {
                  refetch?.();
                  refetchShortlistedPreview?.();
                  refetchNotShortlistedPreview?.();
                  refetchDashboard?.();
                } catch (e) {}
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen",
      theme === "dark" ? "bg-black" : ""
    )}>
      <div className="mx-auto w-full space-y-6 py-2">
        <section className={cn(
          "rounded-2xl border p-5 shadow-lg backdrop-blur-sm",
          theme === "dark" 
            ? "border-slate-700/70 bg-slate-950/80" 
            : "border-slate-200/70 bg-white/95"
        )}>
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl border",
                theme === "dark" 
                  ? "bg-blue-950/50 border-blue-800/50" 
                  : "bg-blue-50 border-blue-200"
              )}>
                <Calendar className={cn(
                  "h-5 w-5",
                  theme === "dark" ? "text-blue-400" : "text-blue-600"
                )} />
              </div>
              <div>
                <p className={cn(
                  "text-xs font-bold uppercase tracking-widest",
                  theme === "dark" ? "text-blue-400" : "text-blue-600"
                )}>
                  Interview Dashboard
                </p>
                <h2 className={cn(
                  "text-lg font-bold mt-0.5",
                  theme === "dark" ? "text-slate-100" : "text-slate-900"
                )}>
                  Orchestrate every panel with clarity
                </h2>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 px-4 text-sm font-medium transition-colors",
                theme === "dark" 
                  ? "border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100" 
                  : "border-slate-300 hover:bg-slate-50"
              )}
              onClick={() => {
                try {
                  refetch?.();
                  refetchShortlistedPreview?.();
                  refetchNotShortlistedPreview?.();
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
            <div className={cn(
              "group relative rounded-xl border p-5 hover:shadow-md transition-all duration-300",
              theme === "dark" 
                ? "border-slate-700/70 bg-slate-900/60" 
                : "border-slate-200 bg-gradient-to-br from-slate-50 to-white"
            )}>
              <div className={cn(
                "absolute top-0 left-0 w-1 h-full rounded-l-xl",
                theme === "dark" ? "bg-gradient-to-b from-blue-600 to-blue-700" : "bg-gradient-to-b from-blue-500 to-blue-600"
              )} />
              
              <div className="flex items-start justify-between">
                <div>
                  <p className={cn(
                    "text-xs font-semibold",
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  )}>Scheduled (7d)</p>
                  <p className={cn(
                    "mt-2 text-3xl font-bold",
                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                  )}>
                    {stats.scheduledThisWeek}
                  </p>
                  <p className={cn(
                    "text-xs mt-1",
                    theme === "dark" ? "text-slate-500" : "text-slate-500"
                  )}>last 7 days</p>
                </div>
                <div className={cn(
                  "p-2.5 rounded-lg border",
                  theme === "dark" 
                    ? "bg-blue-950/50 border-blue-800/50" 
                    : "bg-blue-50 border-blue-200"
                )}>
                  <Calendar className={cn(
                    "h-5 w-5",
                    theme === "dark" ? "text-blue-400" : "text-blue-600"
                  )} />
                </div>
              </div>
            </div>

            {/* Completed This Month */}
            <div className={cn(
              "group relative rounded-xl border p-5 hover:shadow-md transition-all duration-300",
              theme === "dark" 
                ? "border-slate-700/70 bg-slate-900/60" 
                : "border-slate-200 bg-gradient-to-br from-slate-50 to-white"
            )}>
              <div className={cn(
                "absolute top-0 left-0 w-1 h-full rounded-l-xl",
                theme === "dark" ? "bg-gradient-to-b from-purple-600 to-purple-700" : "bg-gradient-to-b from-purple-500 to-purple-600"
              )} />
              
              <div className="flex items-start justify-between">
                <div>
                  <p className={cn(
                    "text-xs font-semibold",
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  )}>This Month</p>
                  <p className={cn(
                    "mt-2 text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent",
                    theme === "dark" 
                      ? "from-purple-400 to-purple-500 text-transparent" 
                      : "from-purple-600 to-purple-700 text-transparent"
                  )}>
                    {stats.completedThisMonth}
                  </p>
                  <p className={cn(
                    "text-xs mt-1",
                    theme === "dark" ? "text-slate-500" : "text-slate-500"
                  )}>completed</p>
                </div>
                <div className={cn(
                  "p-2.5 rounded-lg border",
                  theme === "dark" 
                    ? "bg-purple-950/50 border-purple-800/50" 
                    : "bg-purple-50 border-purple-200"
                )}>
                  <ClipboardCheck className={cn(
                    "h-5 w-5",
                    theme === "dark" ? "text-purple-400" : "text-purple-600"
                  )} />
                </div>
              </div>

              <div className={cn(
                "mt-4 pt-4 border-t grid grid-cols-3 gap-3 text-center text-xs",
                theme === "dark" ? "border-slate-800" : "border-slate-200"
              )}>
                <div>
                  <div className={cn(
                    "font-bold",
                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                  )}>{passedCount ?? "-"}</div>
                  <div className={cn(
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  )}>Passed</div>
                </div>
                <div>
                  <div className={cn(
                    "font-bold",
                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                  )}>{failedCount !== undefined ? failedCount : "-"}</div>
                  <div className={cn(
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  )}>Failed</div>
                </div>
                <div>
                  <div className={cn(
                    "font-bold",
                    theme === "dark" ? "text-purple-400" : "text-purple-600"
                  )}>{Number(passRate ?? stats.passRate).toFixed(1)}%</div>
                  <div className={cn(
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  )}>Pass Rate</div>
                </div>
              </div>
            </div>

            {/* Overall Pass Rate */}
            <div className={cn(
              "group relative rounded-xl border p-5 hover:shadow-md transition-all duration-300",
              theme === "dark" 
                ? "border-slate-700/70 bg-slate-900/60" 
                : "border-slate-200 bg-gradient-to-br from-slate-50 to-white"
            )}>
              <div className={cn(
                "absolute top-0 left-0 w-1 h-full rounded-l-xl",
                theme === "dark" ? "bg-gradient-to-b from-emerald-600 to-emerald-700" : "bg-gradient-to-b from-emerald-500 to-emerald-600"
              )} />
              
              <div className="flex items-start justify-between">
                <div>
                  <p className={cn(
                    "text-xs font-semibold",
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  )}>Overall Pass Rate</p>
                  <p className={cn(
                    "mt-2 text-4xl font-extrabold bg-gradient-to-r bg-clip-text text-transparent",
                    theme === "dark" 
                      ? "from-emerald-400 to-emerald-500 text-transparent" 
                      : "from-emerald-600 to-emerald-700 text-transparent"
                  )}>
                    {Number(passRate ?? stats.passRate).toFixed(1)}%
                  </p>
                  <p className={cn(
                    "text-xs mt-1",
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  )}>
                    {passedCount ?? "-"} passed • {failedCount !== undefined ? failedCount : "-"} failed
                  </p>
                </div>
                <div className={cn(
                  "p-2.5 rounded-lg border",
                  theme === "dark" 
                    ? "bg-emerald-950/50 border-emerald-800/50" 
                    : "bg-emerald-50 border-emerald-200"
                )}>
                  <TrendingUp className={cn(
                    "h-5 w-5",
                    theme === "dark" ? "text-emerald-400" : "text-emerald-600"
                  )} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <Card className={cn(
          "border-0 shadow-2xl rounded-3xl overflow-hidden backdrop-blur-md",
          theme === "dark" ? "bg-slate-950/95" : "bg-white/90"
        )}>
          <CardHeader className={cn(
            "border-b pb-6 backdrop-blur-sm",
            theme === "dark" 
              ? "border-slate-800/60 bg-slate-900/70" 
              : "border-slate-100/60 bg-white/70"
          )}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1.5">
                <CardTitle className={cn(
                  "text-2xl font-bold tracking-tight",
                  theme === "dark" ? "text-slate-100" : "text-slate-900"
                )}>
                  Interview Dashboard
                </CardTitle>
                <CardDescription className={cn(
                  "text-base",
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                )}>
                  Track and manage your assigned and upcoming candidate interviews
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-8 space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Short Listing Pending Candidates */}
              <Card className={cn(
                "border-0 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden h-full min-h-72 backdrop-blur-sm",
                theme === "dark" ? "bg-slate-900/80" : "bg-white/80"
              )}>
                <CardHeader className={cn(
                  "pb-5",
                  theme === "dark" 
                    ? "bg-gradient-to-r from-amber-950/40 to-transparent" 
                    : "bg-gradient-to-r from-amber-50/80 to-transparent"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-3.5 rounded-2xl shadow-md border",
                        theme === "dark" 
                          ? "bg-gradient-to-br from-amber-900/60 to-amber-950/60 border-amber-800/50" 
                          : "bg-gradient-to-br from-amber-100 to-amber-50 border-amber-200/60"
                      )}>
                        <Mail className={cn(
                          "h-7 w-7",
                          theme === "dark" ? "text-amber-400" : "text-amber-600"
                        )} />
                      </div>
                      <div>
                        <CardTitle className={cn(
                          "text-xl font-bold",
                          theme === "dark" ? "text-slate-100" : "text-slate-900"
                        )}>
                          Short Listing Pending Candidates
                        </CardTitle>
                        <CardDescription className={cn(
                          "text-sm mt-1.5",
                          theme === "dark" ? "text-slate-400" : "text-slate-600"
                        )}>
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
                      className={cn(
                        "group text-sm font-medium transition-colors",
                        theme === "dark" 
                          ? "text-amber-400 hover:bg-amber-950/50 hover:text-amber-300" 
                          : "text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                      )}
                    >
                      View All
                      <ArrowRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-4">
                  {shortlistingCount === 0 ? (
                    <div className={cn(
                      "text-center py-12",
                      theme === "dark" ? "text-slate-500" : "text-slate-500"
                    )}>
                      <Calendar className={cn(
                        "h-14 w-14 mx-auto mb-5 opacity-40",
                        theme === "dark" ? "text-slate-600" : ""
                      )} />
                      <p className={cn(
                        "font-semibold text-lg",
                        theme === "dark" ? "text-slate-200" : ""
                      )}>No shortlisting items</p>
                      <p className="text-sm mt-2">Candidates sent to clients will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {shortlistingPreview.slice(0, 3).map((c) => (
                        <div
                          key={c.id}
                          onClick={() => navigate(`/interviews/shortlisting`, { state: { selectedId: c.id } })}
                          className={cn(
                            "group relative p-5 rounded-2xl border transition-all duration-300 cursor-pointer",
                            theme === "dark"
                              ? "border-slate-700/70 hover:border-amber-700/70 hover:bg-amber-950/30"
                              : "border-slate-200/80 hover:border-amber-300 hover:bg-amber-50/60 hover:shadow-lg"
                          )}
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
                                <p className={cn(
                                  "text-lg font-semibold truncate",
                                  theme === "dark" ? "text-slate-100" : "text-slate-900"
                                )}>
                                  {c.candidate ? `${c.candidate.firstName} ${c.candidate.lastName}` : "Unknown"}
                                </p>
                                <p className={cn(
                                  "text-sm truncate mt-1",
                                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                                )}>
                                  {c.roleNeeded?.designation || "Unknown Role"}
                                  {c.candidate?.qualifications?.[0]?.qualification?.shortName || c.candidate?.qualifications?.[0]?.qualification?.name ? (
                                    <span className={cn(
                                      "text-xs ml-2",
                                      theme === "dark" ? "text-slate-500" : "text-muted-foreground"
                                    )}>
                                      • {c.candidate.qualifications[0].qualification.shortName || c.candidate.qualifications[0].qualification.name}
                                    </span>
                                  ) : null}
                                  <span className={cn(
                                    "ml-2",
                                    theme === "dark" ? "text-slate-500" : "text-slate-500"
                                  )}>
                                    • {c.project?.title || "No Project"}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className={cn(
                            "flex items-center gap-3 mt-4 text-sm",
                            theme === "dark" ? "text-slate-400" : "text-slate-600"
                          )}>
                            <Calendar className={cn(
                              "h-4.5 w-4.5",
                              theme === "dark" ? "text-slate-500" : ""
                            )} />
                            <span className="font-medium">
                              {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : "Just now"}
                            </span>
                            {c.latestForward?.sender?.name && (
                              <span className={cn(
                                "text-xs ml-2",
                                theme === "dark" ? "text-slate-500" : "text-muted-foreground"
                              )}>
                                • forwarded by {c.latestForward.sender.name}
                              </span>
                            )}
                            <Badge className={cn(
                              "ml-auto text-xs font-medium border",
                              theme === "dark" 
                                ? "bg-emerald-900/50 text-emerald-300 border-emerald-800/50" 
                                : "bg-emerald-100 text-emerald-700 border-emerald-200"
                            )}>
                              {c.subStatus?.label || "Sent to Client"}
                            </Badge>
                          </div>

                          <div className="absolute right-4 top-4">
                            <Button
                              size="sm"
                              className={cn(
                                "h-8 px-3 text-xs shadow-sm hover:shadow-md transition-colors",
                                theme === "dark"
                                  ? "bg-amber-700 hover:bg-amber-600 text-white"
                                  : "bg-amber-600 hover:bg-amber-700 text-white"
                              )}
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

              {/* Shortlisted Candidates */}
              <Card className={cn(
                "border-0 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden h-full min-h-72 backdrop-blur-sm",
                theme === "dark" ? "bg-slate-900/80" : "bg-white/80"
              )}>
                <CardHeader className={cn(
                  "pb-5",
                  theme === "dark" 
                    ? "bg-gradient-to-r from-teal-950/40 to-transparent" 
                    : "bg-gradient-to-r from-teal-50/80 to-transparent"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-3.5 rounded-2xl shadow-md border",
                        theme === "dark" 
                          ? "bg-gradient-to-br from-teal-900/60 to-teal-950/60 border-teal-800/50" 
                          : "bg-gradient-to-br from-teal-100 to-teal-50 border-teal-200/60"
                      )}>
                        <CheckCircle2 className={cn(
                          "h-7 w-7",
                          theme === "dark" ? "text-teal-400" : "text-teal-600"
                        )} />
                      </div>
                      <div>
                        <CardTitle className={cn(
                          "text-xl font-bold",
                          theme === "dark" ? "text-slate-100" : "text-slate-900"
                        )}>
                          Shortlisted Candidates
                        </CardTitle>
                        <CardDescription className={cn(
                          "text-sm mt-1.5",
                          theme === "dark" ? "text-slate-400" : "text-slate-600"
                        )}>
                          {shortlistedCountPreview} shortlisted candidate{shortlistedCountPreview !== 1 ? "s" : ""} ready to schedule
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (shortlistedPreview[0]?.id) {
                          navigate("/interviews/shortlisted", { state: { selectedId: shortlistedPreview[0]?.id } });
                        } else {
                          navigate("/interviews/shortlisted");
                        }
                      }}
                      disabled={shortlistedCountPreview === 0}
                      className={cn(
                        "group text-sm font-medium transition-colors",
                        theme === "dark" 
                          ? "text-teal-400 hover:bg-teal-950/50 hover:text-teal-300" 
                          : "text-teal-600 hover:bg-teal-50 hover:text-teal-700"
                      )}
                    >
                      View All
                      <ArrowRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-4">
                  {shortlistedCountPreview === 0 ? (
                    <div className={cn(
                      "text-center py-12",
                      theme === "dark" ? "text-slate-500" : "text-slate-500"
                    )}>
                      <Calendar className={cn(
                        "h-14 w-14 mx-auto mb-5 opacity-40",
                        theme === "dark" ? "text-slate-600" : ""
                      )} />
                      <p className={cn(
                        "font-semibold text-lg",
                        theme === "dark" ? "text-slate-200" : ""
                      )}>No shortlisted candidates</p>
                      <p className="text-sm mt-2">Shortlisted candidates will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {shortlistedPreview.slice(0, 3).map((c) => (
                        <div
                          key={c.id}
                          onClick={() => navigate(`/interviews/shortlisted`, { state: { selectedId: c.id } })}
                          className={cn(
                            "group relative p-5 rounded-2xl border transition-all duration-300 cursor-pointer",
                            theme === "dark"
                              ? "border-slate-700/70 hover:border-teal-700/70 hover:bg-teal-950/30"
                              : "border-slate-200/80 hover:border-teal-300 hover:bg-teal-50/60 hover:shadow-lg"
                          )}
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
                                <p className={cn(
                                  "text-lg font-semibold truncate",
                                  theme === "dark" ? "text-slate-100" : "text-slate-900"
                                )}>
                                  {c.candidate ? `${c.candidate.firstName} ${c.candidate.lastName}` : "Unknown"}
                                </p>
                                <p className={cn(
                                  "text-sm truncate mt-1",
                                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                                )}>
                                  {c.roleNeeded?.designation || "Unknown Role"}
                                  {c.candidate?.qualifications?.[0]?.qualification?.shortName || c.candidate?.qualifications?.[0]?.qualification?.name ? (
                                    <span className={cn(
                                      "text-xs ml-2",
                                      theme === "dark" ? "text-slate-500" : "text-muted-foreground"
                                    )}>
                                      • {c.candidate.qualifications[0].qualification.shortName || c.candidate.qualifications[0].qualification.name}
                                    </span>
                                  ) : null}
                                  <span className={cn(
                                    "ml-2",
                                    theme === "dark" ? "text-slate-500" : "text-slate-500"
                                  )}>
                                    • {c.project?.title || "No Project"}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className={cn(
                            "flex items-center gap-3 mt-4 text-sm",
                            theme === "dark" ? "text-slate-400" : "text-slate-600"
                          )}>
                            <Calendar className={cn(
                              "h-4.5 w-4.5",
                              theme === "dark" ? "text-slate-500" : ""
                            )} />
                            <span className="font-medium">
                              {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : "Just now"}
                            </span>
                            {c.latestForward?.sender?.name && (
                              <span className={cn(
                                "text-xs ml-2",
                                theme === "dark" ? "text-slate-500" : "text-muted-foreground"
                              )}>
                                • forwarded by {c.latestForward.sender.name}
                              </span>
                            )}
                            <Badge className={cn(
                              "ml-auto text-xs font-medium border",
                              theme === "dark" 
                                ? "bg-emerald-900/50 text-emerald-300 border-emerald-800/50" 
                                : "bg-emerald-100 text-emerald-700 border-emerald-200"
                            )}>
                              {c.subStatus?.label || "Shortlisted"}
                            </Badge>
                          </div>

                          <div className="absolute right-4 top-4">
                            <Button
                              size="sm"
                              className={cn(
                                "h-8 px-3 text-xs shadow-sm hover:shadow-md transition-colors",
                                theme === "dark"
                                  ? "bg-teal-700 hover:bg-teal-600 text-white"
                                  : "bg-teal-600 hover:bg-teal-700 text-white"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate('/interviews/shortlisted', { state: { selectedId: c.id } });
                              }}
                              aria-label={`Schedule interview for ${c.candidate?.firstName ?? 'candidate'}`}
                            >
                              Schedule
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Not Shortlisted Candidates */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className={cn(
                "border-0 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden h-full min-h-72 backdrop-blur-sm",
                theme === "dark" ? "bg-slate-900/80" : "bg-white/80"
              )}>
                <CardHeader className={cn(
                  "pb-5",
                  theme === "dark" 
                    ? "bg-gradient-to-r from-rose-950/40 to-transparent" 
                    : "bg-gradient-to-r from-rose-50/80 to-transparent"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-3.5 rounded-2xl shadow-md border",
                        theme === "dark" 
                          ? "bg-gradient-to-br from-rose-900/60 to-rose-950/60 border-rose-800/50" 
                          : "bg-gradient-to-br from-rose-100 to-rose-50 border-rose-200/60"
                      )}>
                        <X className={cn(
                          "h-7 w-7",
                          theme === "dark" ? "text-rose-400" : "text-rose-600"
                        )} />
                      </div>
                      <div>
                        <CardTitle className={cn(
                          "text-xl font-bold",
                          theme === "dark" ? "text-slate-100" : "text-slate-900"
                        )}>
                          Not Shortlisted Candidates
                        </CardTitle>
                        <CardDescription className={cn(
                          "text-sm mt-1.5",
                          theme === "dark" ? "text-slate-400" : "text-slate-600"
                        )}>
                          {notShortlistedCountPreview} candidate{notShortlistedCountPreview !== 1 ? 's' : ''} marked not shortlisted
                        </CardDescription>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => navigate('/interviews/not-shortlisted')} 
                      disabled={notShortlistedCountPreview === 0} 
                      className={cn(
                        "group text-sm font-medium transition-colors",
                        theme === "dark" 
                          ? "text-rose-400 hover:bg-rose-950/50 hover:text-rose-300" 
                          : "text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      )}
                    >
                      View All
                      <ArrowRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {notShortlistedCountPreview === 0 ? (
                    <div className={cn(
                      "text-center py-12",
                      theme === "dark" ? "text-slate-500" : "text-slate-500"
                    )}>
                      <Calendar className={cn(
                        "h-14 w-14 mx-auto mb-5 opacity-40",
                        theme === "dark" ? "text-slate-600" : ""
                      )} />
                      <p className={cn(
                        "font-semibold text-lg",
                        theme === "dark" ? "text-slate-200" : ""
                      )}>No not-shortlisted items</p>
                      <p className="text-sm mt-2">Not-shortlisted candidates will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {notShortlistedPreview.slice(0, 3).map((c) => (
                        <div 
                          key={c.id} 
                          onClick={() => navigate('/interviews/not-shortlisted', { state: { selectedId: c.id } })} 
                          className={cn(
                            "group relative p-5 rounded-2xl border transition-all duration-300 cursor-pointer",
                            theme === "dark"
                              ? "border-slate-700/70 hover:border-rose-700/70 hover:bg-rose-950/30"
                              : "border-slate-200/80 hover:border-rose-300 hover:bg-rose-50/60 hover:shadow-lg"
                          )}
                        >
                          <div className="flex items-start justify-between pr-28">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <ImageViewer 
                                src={c.candidate?.profileImage} 
                                title={c.candidate ? `${c.candidate.firstName} ${c.candidate.lastName}` : 'Unknown'} 
                                className="h-12 w-12 shrink-0 shadow-sm" 
                                enableHoverPreview={false} 
                              />
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  "text-lg font-semibold truncate",
                                  theme === "dark" ? "text-slate-100" : "text-slate-900"
                                )}>
                                  {c.candidate ? `${c.candidate.firstName} ${c.candidate.lastName}` : 'Unknown'}
                                </p>
                                <p className={cn(
                                  "text-sm truncate mt-1",
                                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                                )}>
                                  {c.roleNeeded?.designation || 'Unknown Role'}
                                  {c.candidate?.qualifications?.[0]?.qualification?.shortName || c.candidate?.qualifications?.[0]?.qualification?.name ? (
                                    <span className={cn(
                                      "text-xs ml-2",
                                      theme === "dark" ? "text-slate-500" : "text-muted-foreground"
                                    )}>
                                      • {c.candidate.qualifications[0].qualification.shortName || c.candidate.qualifications[0].qualification.name}
                                    </span>
                                  ) : null}
                                  <span className={cn(
                                    "ml-2",
                                    theme === "dark" ? "text-slate-500" : "text-slate-500"
                                  )}>
                                    • {c.project?.title || 'No Project'}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className={cn(
                            "flex items-center gap-3 mt-4 text-sm",
                            theme === "dark" ? "text-slate-400" : "text-slate-600"
                          )}>
                            <Calendar className={cn(
                              "h-4.5 w-4.5",
                              theme === "dark" ? "text-slate-500" : ""
                            )} />
                            <span className="font-medium">
                              {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : 'Just now'}
                            </span>
                            {c.latestForward?.sender?.name && (
                              <span className={cn(
                                "text-xs ml-2",
                                theme === "dark" ? "text-slate-500" : "text-muted-foreground"
                              )}>
                                • forwarded by {c.latestForward.sender.name}
                              </span>
                            )}
                            <Badge className={cn(
                              "ml-auto text-xs font-medium border",
                              theme === "dark" 
                                ? "bg-rose-900/50 text-rose-300 border-rose-800/50" 
                                : "bg-rose-100 text-rose-700 border-rose-200"
                            )}>
                              {c.subStatus?.label || 'Not Shortlisted'}
                            </Badge>
                          </div>

                          <div className="absolute right-4 top-4">
                            <Button
                              size="sm"
                              className={cn(
                                "h-8 px-3 text-xs shadow-sm hover:shadow-md transition-colors",
                                theme === "dark"
                                  ? "bg-amber-700 hover:bg-amber-600 text-white"
                                  : "bg-amber-600 hover:bg-amber-700 text-white"
                              )}
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
            </div>

            {interviews.length > 0 && (
              <div className={cn(
                "text-center pt-6 text-sm font-medium",
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              )}>
                Showing {interviews.length} of {totalInterviews} total interviews
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
