import { useMemo, useState, useEffect } from "react";
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
import {
  useGetMockInterviewsQuery,
  useGetAssignedMockInterviewsQuery,
  useCreateMockInterviewMutation,
} from "../data";
import { MOCK_INTERVIEW_DECISION } from "../../types";
import { startOfWeek, endOfWeek, isWithinInterval, format } from "date-fns";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// note: using native <select> for simplicity in modal
import { Button as UiButton } from "@/components/ui/button";
import { useUsersLookup } from "@/shared/hooks/useUsersLookup";
import { useGetTemplatesByRoleQuery, useGetTemplatesQuery } from "@/features/mock-interview-coordination/templates/data";

export default function MockInterviewsDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useGetMockInterviewsQuery();
  const interviews = data?.data || [];

  // Assigned candidate-projects for mock interviews (these are different
  // from scheduled MockInterview resources). We'll fetch these and merge
  // into the upcoming list so coordinators can see assignments that haven't
  // been scheduled into an interview yet.
  const { data: assignedData, refetch: refetchAssigned } = useGetAssignedMockInterviewsQuery({
    page: 1,
    limit: 10,
  });

  const assignedItems = assignedData?.data?.items || [];

  // UI state for scheduling modal
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [createMockInterview, createState] = useCreateMockInterviewMutation();
  const { users, getUsersByRole } = useUsersLookup();

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
      }))
      .slice(0, 10);

    return [...scheduled, ...assignedNormalized]
      .sort((a, b) => new Date(a.scheduledTime!).getTime() - new Date(b.scheduledTime!).getTime())
      .slice(0, 5);
  }, [interviews]);

  // Open schedule modal for an assigned candidate-project
  const openScheduleModal = (assignment: any) => {
    setSelectedAssignment(assignment);
    setIsScheduleOpen(true);
  };

  // Zod schema for schedule form
  const scheduleSchema = z.object({
    candidateProjectMapId: z.string().min(1, "Candidate selection is required"),
    coordinatorId: z.string().min(1, "Coordinator is required"),
    templateId: z.string().optional(),
    scheduledTime: z
      .string()
      .optional()
      .refine((v) => !v || !Number.isNaN(Date.parse(v)), {
        message: "Invalid date/time",
      }),
    duration: z.number().min(15).max(240).optional(),
    meetingLink: z.string().optional(),
    mode: z.enum(["video", "phone", "in_person"]).optional(),
  });

  type ScheduleFormValues = z.infer<typeof scheduleSchema>;

  // form state for the schedule modal
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    mode: "onChange",
    defaultValues: {
      candidateProjectMapId: selectedAssignment?.candidateProjectMap?.id || "",
      coordinatorId: "",
      templateId: undefined,
      scheduledTime: "",
      duration: 60,
      meetingLink: "",
      mode: "video",
    },
  });

  // reset/initialize form whenever selected assignment changes
  useEffect(() => {
    if (!selectedAssignment) return;
    const initialScheduled = selectedAssignment?.scheduledTime
      ? (() => {
          const iso = new Date(selectedAssignment.scheduledTime);
          // convert to local 'YYYY-MM-DDTHH:mm' suitable for datetime-local input
          const tzOffset = iso.getTimezoneOffset();
          const local = new Date(iso.getTime() - tzOffset * 60000);
          return local.toISOString().slice(0, 16);
        })()
      : "";

    form.reset({
      candidateProjectMapId: selectedAssignment?.candidateProjectMap?.id || "",
      coordinatorId: "",
      templateId: undefined,
      scheduledTime: initialScheduled,
      duration: 60,
      meetingLink: "",
      mode: "video",
    });
  }, [selectedAssignment]);

  // fetch templates and coordinator list so users can select
  const roleId = selectedAssignment?.candidateProjectMap?.roleNeeded?.id;
  const { data: templatesByRole } = useGetTemplatesByRoleQuery(
    { roleId: roleId || "", isActive: true },
    { skip: !roleId }
  );
  const { data: allTemplates } = useGetTemplatesQuery(undefined, { skip: !isScheduleOpen });
  const templateOptions = (roleId ? templatesByRole?.data : allTemplates?.data) || [];
  const coordinators = getUsersByRole("coordinator").length
    ? getUsersByRole("coordinator")
    : users || [];

  const onSubmitSchedule = async (values: ScheduleFormValues) => {
    try {
      // convert scheduledTime to ISO if present
      const payload: any = { ...values };
      if (values.scheduledTime) {
        payload.scheduledTime = new Date(values.scheduledTime).toISOString();
      }

      await createMockInterview(payload).unwrap();
      toast.success("Mock interview scheduled");
      setIsScheduleOpen(false);
      form.reset();
      // ensure assigned list refreshes so UI shows update
      refetchAssigned?.();
    } catch (err: any) {
      // RTK Query error object often has status
      const status = err?.status;
      if (status === 409) {
        toast.error("Conflict: mock interview already exists for this assignment.");
      } else if (status === 404) {
        toast.error("Resource not found. Please try again.");
      } else {
        toast.error("Failed to schedule interview. Please try again.");
      }
    }
  };


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

  const getDecisionBadge = (decision: string | null | undefined) => {
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
                Assigned Interviews
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
                    <div
                      key={interview.id}
                      className="relative w-full p-4 rounded-lg border hover:border-primary/50 hover:bg-accent/50 transition-all duration-200 text-left group hover:shadow-sm"
                      onClick={() => {
                        // If this is an assigned candidate-project (not an actual mock interview)
                        // and it has the mock_interview_assigned substatus, open the schedule modal
                        if (
                          (interview?.id || "").toString().startsWith("assignment-") ||
                          (typeof interview === "object" && "subStatusName" in interview && (interview as any).subStatusName === "mock_interview_assigned")
                        ) {
                          openScheduleModal(interview);
                          return;
                        }
                        navigate(`/mock-interviews/${interview.id}/conduct`);
                      }}
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
                        <div className="flex items-center gap-2 ml-2">
                              <Badge variant="outline">{interview.mode}</Badge>
                            </div>
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
                      {/* floating action on assignment cards */}
                      {(typeof interview === "object" && "subStatusName" in interview && (interview as any).subStatusName === "mock_interview_assigned") && (
                        <div className="absolute bottom-3 right-3">
                          <UiButton
                            onClick={(e) => {
                              e.stopPropagation();
                              openScheduleModal(interview);
                            }}
                            size="sm"
                            className="h-8 px-3 text-sm bg-primary text-white hover:bg-primary/90 shadow-sm rounded-full"
                          >
                            Schedule Mock Interview
                          </UiButton>
                        </div>
                      )}
                    </div>
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

      {/* Schedule modal */}
      <Dialog
        open={isScheduleOpen}
        onOpenChange={(open) => {
          setIsScheduleOpen(open);
          if (!open) setSelectedAssignment(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              Schedule Mock Interview
            </DialogTitle>
            <DialogDescription>
              Set a date/time, coordinator and optional template for the mock
              interview.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(onSubmitSchedule)}
            className="space-y-4 pt-4"
          >
            {/* Candidate / Project (read-only) */}
            <div>
              <Label className="text-sm font-medium">Candidate</Label>
              <Input
                disabled
                value={
                  selectedAssignment &&
                  selectedAssignment.candidateProjectMap?.candidate
                    ? `${selectedAssignment.candidateProjectMap.candidate.firstName} ${selectedAssignment.candidateProjectMap.candidate.lastName} — ${selectedAssignment.candidateProjectMap.project?.title}`
                    : ""
                }
                className="h-11 mt-1 bg-muted/40"
              />
            </div>

            {/* Coordinator select */}
            <div>
              <Label htmlFor="coordinatorId" className="text-sm font-medium">
                Coordinator *
              </Label>
              <select
                id="coordinatorId"
                {...form.register("coordinatorId")}
                className="w-full mt-1 h-11 rounded-md border px-3"
              >
                <option value="">Select coordinator</option>
                {coordinators.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.email ? `— ${c.email}` : ""}
                  </option>
                ))}
              </select>
              {form.formState.errors.coordinatorId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.coordinatorId.message}
                </p>
              )}
            </div>

            {/* Template select (optional) */}
            <div>
              <Label htmlFor="templateId" className="text-sm font-medium">
                Template (optional)
              </Label>
              <select
                id="templateId"
                {...form.register("templateId")}
                className="w-full mt-1 h-11 rounded-md border px-3"
              >
                <option value="">No template</option>
                {templateOptions.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="scheduledTime" className="text-sm font-medium">
                  Date & time
                </Label>
                <Input
                  id="scheduledTime"
                  type="datetime-local"
                  {...form.register("scheduledTime")}
                  className="mt-1 h-11"
                />
                {form.formState.errors.scheduledTime && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.scheduledTime.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="duration" className="text-sm font-medium">
                  Duration (minutes)
                </Label>
                <Input
                  id="duration"
                  type="number"
                  {...form.register("duration", { valueAsNumber: true })}
                  min={15}
                  max={240}
                  className="mt-1 h-11"
                />
                {form.formState.errors.duration && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.duration.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="meetingLink" className="text-sm font-medium">
                Meeting link (optional)
              </Label>
              <Input
                id="meetingLink"
                {...form.register("meetingLink")}
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                className="mt-1 h-11"
              />
            </div>

            <div>
              <Label htmlFor="mode" className="text-sm font-medium">
                Mode
              </Label>
              <select
                id="mode"
                {...form.register("mode")}
                className="w-full mt-1 h-11 rounded-md border px-3"
              >
                <option value="video">Video</option>
                <option value="phone">Phone</option>
                <option value="in_person">In-person</option>
              </select>
            </div>

            <DialogFooter>
              <div className="flex gap-3 w-full pt-2">
                <UiButton
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsScheduleOpen(false);
                    setSelectedAssignment(null);
                  }}
                  className="flex-1"
                  disabled={createState.isLoading}
                >
                  Cancel
                </UiButton>
                <UiButton
                  type="submit"
                  className="flex-1"
                  disabled={createState.isLoading || !form.formState.isValid}
                >
                  {createState.isLoading ? "Scheduling..." : "Schedule Interview"}
                </UiButton>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
