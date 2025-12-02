import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Calendar,
  Video,
  PhoneCall,
  Building2,
  RefreshCw,
  Filter,
  Users,
} from "lucide-react";
import { useCan } from "@/hooks/useCan";
import { useGetInterviewsQuery, useDeleteInterviewMutation } from "../api";
import ScheduleInterviewDialog from "../components/ScheduleInterviewDialog";
import EditInterviewDialog from "../components/EditInterviewDialog";

const STATUS_KEYS = [
  "scheduled",
  "completed",
  "passed",
  "failed",
  "cancelled",
] as const;

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (dateString?: string | null) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ModeIcon = ({ mode }: { mode?: string | null }) => {
  switch ((mode || "").toLowerCase()) {
    case "online":
      return <Video className="h-4 w-4 text-blue-600" />;
    case "phone":
      return <PhoneCall className="h-4 w-4 text-emerald-600" />;
    case "in-person":
      return <Building2 className="h-4 w-4 text-violet-600" />;
    default:
      return <Calendar className="h-4 w-4 text-slate-500" />;
  }
};

export default function InterviewsPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedInterviewId, setSelectedInterviewId] = useState<string>("");

  const {
    data: interviewsData,
    isLoading,
    error,
    refetch,
  } = useGetInterviewsQuery({
    search: searchTerm || undefined,
    type: typeFilter === "all" ? undefined : typeFilter,
    mode: modeFilter === "all" ? undefined : modeFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    page: 1,
    limit: 50,
  });

  const [deleteInterview] = useDeleteInterviewMutation();
  type InterviewRecord = Record<string, any>;
  const interviews = (interviewsData?.data?.interviews ??
    []) as InterviewRecord[];
  const totalInterviews = interviewsData?.data?.pagination?.total ?? 0;

  const statusBreakdown = useMemo(() => {
    const base = STATUS_KEYS.reduce(
      (acc, key) => ({ ...acc, [key]: 0 }),
      {} as Record<(typeof STATUS_KEYS)[number], number>
    );

    interviews.forEach((interview) => {
      const status = (interview.status || "scheduled").toLowerCase();
      if (status in base) {
        base[status as (typeof STATUS_KEYS)[number]] += 1;
      } else {
        base.scheduled += 1;
      }
    });

    return base;
  }, [interviews]);

  const canScheduleInterviews = useCan("schedule:interviews");
  const canWriteInterviews = useCan("write:interviews");

  const handleDeleteInterview = async (id: string) => {
    if (window.confirm("Are you sure you want to cancel this interview?")) {
      await deleteInterview(id).unwrap();
      refetch();
    }
  };

  const handleEditInterview = (id: string) => {
    setSelectedInterviewId(id);
    setEditDialogOpen(true);
  };

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
                  Interview Workspace
                </p>
                <h1 className="text-2xl font-black text-slate-900">
                  Orchestrate every panel with clarity
                </h1>
                <p className="text-sm text-slate-500">
                  {totalInterviews} interviews tracked with live filters,
                  statuses, and actions.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              {canScheduleInterviews && (
                <Button size="sm" onClick={() => setScheduleDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule
                </Button>
              )}
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {STATUS_KEYS.map((key) => (
              <SummaryPill
                key={key}
                label={SUMMARY_META[key].label}
                description={SUMMARY_META[key].description}
                count={statusBreakdown[key]}
                accent={SUMMARY_META[key].accent}
              />
            ))}
          </div>
        </section>

        <Card className="border(border-slate-100) shadow-lg">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Interview pipeline
                </CardTitle>
                <p className="text-sm text-slate-500">
                  Filter by mode, status, and type without leaving this surface.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="secondary"
                  className="gap-2 rounded-full bg-slate-100 text-slate-600"
                >
                  <Filter className="h-3.5 w-3.5" />
                  Advanced filters
                </Badge>
                <Badge
                  variant="outline"
                  className="gap-2 rounded-full border-blue-200 text-blue-600"
                >
                  <Users className="h-3.5 w-3.5" />
                  {interviews.length} showing
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by project, candidate, or interviewer"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-11 rounded-2xl border-slate-200 bg-slate-50 pl-10 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2 md:flex-nowrap">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-11 w-full rounded-2xl border-slate-200 bg-slate-50 text-sm md:w-40">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="managerial">Managerial</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={modeFilter} onValueChange={setModeFilter}>
                  <SelectTrigger className="h-11 w-full rounded-2xl border-slate-200 bg-slate-50 text-sm md:w-36">
                    <SelectValue placeholder="Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modes</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="in-person">In-Person</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-11 w-full rounded-2xl border-slate-200 bg-slate-50 text-sm md:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-100">
              {interviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center space-y-3 py-16 text-center text-slate-500">
                  <Calendar className="h-10 w-10 text-slate-300" />
                  <p className="text-sm">
                    {searchTerm ||
                    typeFilter !== "all" ||
                    modeFilter !== "all" ||
                    statusFilter !== "all"
                      ? "No interviews match your filters."
                      : "No interviews scheduled yet."}
                  </p>
                  {canScheduleInterviews && (
                    <Button
                      size="sm"
                      className="rounded-full"
                      onClick={() => setScheduleDialogOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Schedule interview
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80">
                        <TableHead className="h-12 text-xs uppercase tracking-wide text-slate-500">
                          Project / Candidate
                        </TableHead>
                        <TableHead className="h-12 text-xs uppercase tracking-wide text-slate-500">
                          Date & Time
                        </TableHead>
                        <TableHead className="h-12 text-xs uppercase tracking-wide text-slate-500">
                          Mode
                        </TableHead>
                        <TableHead className="h-12 text-xs uppercase tracking-wide text-slate-500">
                          Status
                        </TableHead>
                        <TableHead className="h-12 text-xs uppercase tracking-wide text-slate-500">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {interviews.map((interview) => {
                        const projectTitle =
                          interview.candidateProjectMap?.project?.title ||
                          interview.project?.title ||
                          "Untitled project";

                        const candidateName = interview.candidateProjectMap
                          ?.candidate
                          ? [
                              interview.candidateProjectMap.candidate.firstName,
                              interview.candidateProjectMap.candidate.lastName,
                            ]
                              .filter(Boolean)
                              .join(" ")
                              .trim() ||
                            interview.candidateProjectMap.candidate.email ||
                            "Candidate"
                          : interview.candidate?.name || "Candidate";

                        return (
                          <TableRow
                            key={interview.id}
                            className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50/60"
                            onClick={(e) => {
                              if ((e.target as HTMLElement).closest("button")) {
                                return;
                              }
                              const projectId =
                                interview.candidateProjectMap?.project?.id ||
                                interview.project?.id;
                              if (projectId) {
                                navigate(`/projects/${projectId}`);
                              }
                            }}
                          >
                            <TableCell className="py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-50">
                                  <Building2 className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {projectTitle}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {candidateName}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="space-y-1 text-sm">
                                <p className="font-medium text-slate-900">
                                  {formatDate(interview.scheduledTime)}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {formatTime(interview.scheduledTime)}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex items-center gap-2 text-sm capitalize">
                                <ModeIcon mode={interview.mode} />
                                {interview.mode || "—"}
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <StatusBadge status={interview.status} />
                            </TableCell>
                            <TableCell className="py-4">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 rounded-full"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-44 rounded-2xl border-slate-100"
                                >
                                  {canWriteInterviews ? (
                                    <>
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditInterview(interview.id);
                                        }}
                                      >
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteInterview(interview.id);
                                        }}
                                        className="text-rose-600 focus:text-rose-600"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Cancel
                                      </DropdownMenuItem>
                                    </>
                                  ) : (
                                    <DropdownMenuItem disabled>
                                      No actions available
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
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
          onOpenChange={setScheduleDialogOpen}
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

const SUMMARY_META: Record<
  (typeof STATUS_KEYS)[number],
  { label: string; description: string; accent: string }
> = {
  scheduled: {
    label: "Scheduled",
    description: "Upcoming",
    accent: "from-blue-500/10 to-blue-500/5 text-blue-700",
  },
  completed: {
    label: "Completed",
    description: "Finished",
    accent: "from-emerald-500/10 to-emerald-500/5 text-emerald-700",
  },
  passed: {
    label: "Passed",
    description: "Cleared",
    accent: "from-violet-500/10 to-violet-500/5 text-violet-700",
  },
  failed: {
    label: "Failed",
    description: "Needs action",
    accent: "from-rose-500/10 to-rose-500/5 text-rose-700",
  },
  cancelled: {
    label: "Cancelled",
    description: "Dropped",
    accent: "from-slate-500/10 to-slate-500/5 text-slate-600",
  },
};

function SummaryPill({
  label,
  description,
  count,
  accent,
}: {
  label: string;
  description: string;
  count: number;
  accent: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white bg-gradient-to-br px-4 py-3 shadow-sm ${accent}`}
    >
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <div className="flex items-center justify-between pt-1">
        <span className="text-2xl font-bold">{count}</span>
        <span className="text-xs text-slate-500">{description}</span>
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  scheduled: {
    label: "Scheduled",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  completed: {
    label: "Completed",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  passed: {
    label: "Passed",
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
  },
  failed: {
    label: "Failed",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-200",
  },
};

function StatusBadge({ status }: { status?: string | null }) {
  const key = (status || "scheduled").toLowerCase();
  const style = STATUS_STYLES[key] ?? STATUS_STYLES.scheduled;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${style.bg} ${style.text} ${style.border}`}
    >
      {style.label}
    </span>
  );
}
