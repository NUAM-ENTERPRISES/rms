import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  GraduationCap,
  Search,
  Loader2,
  AlertCircle,
  User,
  Briefcase,
  Calendar,
  CheckCircle2,
  Target,
  X,
  ChevronRight,
  Send,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useGetTrainingAssignmentsQuery } from "../data";
import { useCan } from "@/hooks/useCan";
import { useCompleteTrainingMutation } from "../data";
import { ConfirmationDialog } from "@/components/ui";
import { Textarea } from "@/components/ui/textarea";
import { useAppSelector } from "@/app/hooks";
import { useSendForInterviewMutation } from "../data";
import { TRAINING_STATUS, TRAINING_PRIORITY } from "../../types";
import { cn } from "@/lib/utils";
import InterviewHistory from "@/components/molecules/InterviewHistory";
import { useGetCandidateProjectHistoryQuery } from "../../interviews/data";

export default function TrainingListPage() {
  const canWrite = useCan("write:training");

  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    priority: "all",
  });

  const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(
    null
  );
  // Removed session dialog/state: sessions are not editable from this view

  const { data, isLoading, error } = useGetTrainingAssignmentsQuery();
  const [completeTraining, { isLoading: isCompleting }] =
    useCompleteTrainingMutation();

  const trainings = data?.data || [];

  // Filter trainings
  const filteredTrainings = useMemo(() => {
    let filtered = trainings;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.candidateProjectMap?.candidate?.firstName
            ?.toLowerCase()
            .includes(searchLower) ||
          t.candidateProjectMap?.candidate?.lastName
            ?.toLowerCase()
            .includes(searchLower) ||
          t.candidateProjectMap?.project?.title
            ?.toLowerCase()
            .includes(searchLower) ||
          t.trainingType?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.status && filters.status !== "all") {
      filtered = filtered.filter((t) => t.status === filters.status);
    }

    if (filters.priority && filters.priority !== "all") {
      filtered = filtered.filter((t) => t.priority === filters.priority);
    }

    // Array.sort mutates the array in-place which can cause errors if the
    // source array is frozen/immutable (for example, data returned from
    // some query libraries). Copy the array before sorting to avoid
    // modifying the original.
    return [...filtered].sort(
      (a, b) =>
        new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
    );
  }, [trainings, filters]);

  // Auto-select first training
  const selectedTraining = useMemo(() => {
    if (selectedTrainingId) {
      return filteredTrainings.find((t) => t.id === selectedTrainingId);
    }
    return filteredTrainings[0];
  }, [filteredTrainings, selectedTrainingId]);

  // Load interview history for the selected training's candidate-project
  const { data: historyData, isLoading: isLoadingHistory } = useGetCandidateProjectHistoryQuery(
    selectedTraining?.candidateProjectMap?.id
      ? { candidateProjectMapId: selectedTraining.candidateProjectMap.id, page: 1, limit: 15 }
      : undefined,
    { skip: !selectedTraining?.candidateProjectMap?.id }
  );

  // Normalized sessions (some responses use `sessions`, others `trainingSessions`)
  const getTrainingSessions = (training: any) =>
    training?.sessions || training?.trainingSessions || [];

  const formatAssignedBy = (assignedBy: any) => {
    if (!assignedBy) return "-";
    if (typeof assignedBy === "string") return assignedBy;
    // object case: prefer name, then email, then id
    return assignedBy.name || assignedBy.email || assignedBy.id || JSON.stringify(assignedBy);
  };

  const [sendForInterview, { isLoading: isSendingInterview }] =
    useSendForInterviewMutation();
  const { user } = useAppSelector((state) => state.auth);

  const [interviewConfirm, setInterviewConfirm] = useState<{
    isOpen: boolean;
    candidateId: string;
    candidateName: string;
    projectId?: string;
    type: "screening" | "interview" | "";
    notes: string;
  }>({
    isOpen: false,
    candidateId: "",
    candidateName: "",
    projectId: undefined,
    // Start with no selection (no default)
    type: "",
    notes: "",
  });

  const showInterviewConfirmation = (
    candidateId?: string,
    candidateName?: string,
    projectId?: string
  ) => {
    setInterviewConfirm({
      isOpen: true,
      candidateId: candidateId || "",
      candidateName: candidateName || "",
      projectId,
      // no default selection — require user to pick radio
      type: "",
      notes: "",
    });
  };

  const handleSendForInterview = async () => {
    try {
      if (!interviewConfirm.type) {
        toast.error("Please select one");
        return;
      }

      if (!interviewConfirm.projectId || !interviewConfirm.candidateId) return;

      const mappedType =
        interviewConfirm.type === "screening"
          ? "screening_assigned"
          : "interview_assigned";

      await sendForInterview({
        projectId: interviewConfirm.projectId,
        candidateId: interviewConfirm.candidateId,
        type: mappedType as "screening_assigned" | "interview_assigned",
        recruiterId: user?.id,
        notes: interviewConfirm.notes || undefined,
      }).unwrap();

      toast.success("Candidate sent for interview successfully");
      setInterviewConfirm({ isOpen: false, candidateId: "", candidateName: "", projectId: undefined, type: "interview", notes: "" });
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to send candidate for interview");
    }
  };

  const trainingCompletedCount = (t: any) =>
    getTrainingSessions(t).filter((s: any) => s.completedAt).length;

  const trainingTotalCount = (t: any) => getTrainingSessions(t).length;

  const trainingPercent = (t: any) => {
    const total = trainingTotalCount(t);
    if (!total) return 0;
    return Math.round((trainingCompletedCount(t) / total) * 100);
  };

  // Calculate stats
  const stats = useMemo(() => {
    const active = trainings.filter(
      (t) => t.status === TRAINING_STATUS.IN_PROGRESS
    ).length;
    const completed = trainings.filter(
      (t) => t.status === TRAINING_STATUS.COMPLETED
    ).length;
    const total = trainings.length;
    return { active, completed, total };
  }, [trainings]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case TRAINING_STATUS.ASSIGNED:
        return {
          label: "Assigned",
          color: "text-slate-600 dark:text-slate-400",
          bgColor: "bg-slate-100 dark:bg-slate-900",
          borderColor: "border-slate-300 dark:border-slate-700",
        };
      case TRAINING_STATUS.IN_PROGRESS:
        return {
          label: "In Progress",
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-950",
          borderColor: "border-blue-300 dark:border-blue-700",
        };
      case TRAINING_STATUS.COMPLETED:
        return {
          label: "Completed",
          color: "text-green-600 dark:text-green-400",
          bgColor: "bg-green-50 dark:bg-green-950",
          borderColor: "border-green-300 dark:border-green-700",
        };
      case TRAINING_STATUS.CANCELLED:
        return {
          label: "Cancelled",
          color: "text-red-600 dark:text-red-400",
          bgColor: "bg-red-50 dark:bg-red-950",
          borderColor: "border-red-300 dark:border-red-700",
        };
      case TRAINING_STATUS.SCREENING_ASSIGNED:
        return {
          label: "Screening Assigned",
          color: "text-green-600 dark:text-green-400",
          bgColor: "bg-green-50 dark:bg-green-950",
          borderColor: "border-green-300 dark:border-green-700",
        };
      case TRAINING_STATUS.INTERVIEW_ASSIGNED:
        return {
          label: "Interview Assigned",
          color: "text-green-600 dark:text-green-400",
          bgColor: "bg-green-50 dark:bg-green-950",
          borderColor: "border-green-300 dark:border-green-700",
        };
      default:
        return {
          label: status,
          color: "text-muted-foreground",
          bgColor: "bg-muted",
          borderColor: "border-muted",
        };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case TRAINING_PRIORITY.HIGH:
        return (
          <Badge variant="destructive" className="text-xs">
            High
          </Badge>
        );
      case TRAINING_PRIORITY.MEDIUM:
        return (
          <Badge className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-950 dark:text-orange-300">
            Medium
          </Badge>
        );
      case TRAINING_PRIORITY.LOW:
        return (
          <Badge variant="secondary" className="text-xs">
            Low
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleCompleteTraining = async () => {
    if (!selectedTraining) return;

    const sessions = getTrainingSessions(selectedTraining);
    const allSessionsCompleted = sessions.every((s: any) => s.completedAt);

    if (!allSessionsCompleted) {
      toast.error(
        "Please complete all training sessions before marking the training as complete"
      );
      return;
    }

    if (
      !confirm(
        "Are you sure you want to mark this training program as complete?"
      )
    ) {
      return;
    }

    try {
      await completeTraining({
        id: selectedTraining.id,
        data: {
          overallPerformance: "satisfactory",
          recommendations: "",
        },
      }).unwrap();
      toast.success("Training program marked as complete");
    } catch (error: any) {
      toast.error(
        error?.data?.message || "Failed to complete training program"
      );
    }
  };

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: TRAINING_STATUS.ASSIGNED, label: "Assigned" },
    { value: TRAINING_STATUS.IN_PROGRESS, label: "In Progress" },
    { value: TRAINING_STATUS.COMPLETED, label: "Completed" },
    { value: TRAINING_STATUS.CANCELLED, label: "Cancelled" },
  ];

  const priorityOptions = [
    { value: "all", label: "All Priorities" },
    { value: TRAINING_PRIORITY.HIGH, label: "High" },
    { value: TRAINING_PRIORITY.MEDIUM, label: "Medium" },
    { value: TRAINING_PRIORITY.LOW, label: "Low" },
  ];

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
            Failed to load training programs. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
  <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
    {/* Premium Header */}
    <header className="border-b bg-white/90 backdrop-blur-xl shadow-sm sticky top-0 z-20">
      <div className="px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl blur-lg opacity-30 animate-pulse-slow"></div>
              <div className="relative p-3 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-lg">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent tracking-tight">
                Screening Training Programs
              </h1>
              <p className="text-sm text-slate-600 mt-0.5">
                Manage candidate training and development
              </p>
            </div>
          </div>

          {/* Compact Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{stats.active}</div>
              <div className="text-xs text-slate-500">Active</div>
            </div>
            <Separator orientation="vertical" className="h-8 opacity-50" />
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-xs text-slate-500">Completed</div>
            </div>
            <Separator orientation="vertical" className="h-8 opacity-50" />
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.total}</div>
              <div className="text-xs text-slate-500">Total</div>
            </div>
          </div>
        </div>

        {/* Filters - Compact & Premium */}
        <div className="flex items-center gap-3 mt-4">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" />
            <Input
              placeholder="Search candidates, projects, type..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="pl-12 h-10 rounded-xl border-indigo-200/50 bg-white/80 shadow-inner focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-300"
            />
          </div>

          <Select
            value={filters.status}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
          >
            <SelectTrigger className="w-36 h-10 rounded-xl border-indigo-200/50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.priority}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, priority: value }))}
          >
            <SelectTrigger className="w-36 h-10 rounded-xl border-indigo-200/50">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(filters.search || filters.status !== "all" || filters.priority !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 px-4 rounded-xl hover:bg-indigo-50"
              onClick={() => setFilters({ search: "", status: "all", priority: "all" })}
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>
    </header>

    {/* Master-Detail Layout */}
<div className="flex-1 flex overflow-hidden">
  {/* Left Panel - Training List */}
  <div className="w-96 border-r bg-white/90 backdrop-blur-2xl shadow-2xl rounded-l-2xl overflow-hidden flex flex-col ring-1 ring-indigo-200/30">
    <ScrollArea className="flex-1">
      {filteredTrainings.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-10">
          {/* Premium Empty State */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full blur-3xl opacity-40 animate-pulse-slow"></div>
            <GraduationCap className="h-24 w-24 text-indigo-500/70 relative z-10 drop-shadow-lg" />
          </div>
          <p className="text-2xl font-bold text-slate-800 mb-3">No Training Programs</p>
          <p className="text-base text-slate-600 max-w-xs leading-relaxed">
            {filters.search || filters.status !== "all" || filters.priority !== "all"
              ? "Try adjusting your filters to find matches"
              : "Training programs will appear here once assigned to candidates"}
          </p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {filteredTrainings.map((training) => {
            const candidate = training.candidateProjectMap?.candidate;
            const statusConfig = getStatusConfig(training.status);
            const isSelected = training.id === (selectedTraining?.id || filteredTrainings[0]?.id);
            const sessions = getTrainingSessions(training);
            const completedSessions = sessions.filter((s) => s.completedAt).length;
            const progress = sessions.length > 0 ? (completedSessions / sessions.length) * 100 : 0;
            const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown";

            return (
              <button
                key={training.id}
                onClick={() => setSelectedTrainingId(training.id)}
                className={cn(
                  "w-full text-left p-5 rounded-2xl border transition-all duration-300 group relative overflow-hidden shadow-sm",
                  isSelected
                    ? "bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-400/50 shadow-2xl ring-2 ring-indigo-300/40 scale-[1.02]"
                    : "bg-white border-slate-200/70 hover:border-indigo-300 hover:shadow-xl hover:scale-[1.02] hover:shadow-indigo-100/50"
                )}
              >
                {/* Subtle gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/10 group-hover:to-purple-500/10 transition-opacity duration-500" />

                <div className="relative flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <p className="font-bold text-lg text-slate-900 truncate group-hover:text-indigo-700 transition-colors">
                        {candidateName}
                      </p>
                      {training.priority && getPriorityBadge(training.priority)}
                      {(training.status === TRAINING_STATUS.SCREENING_ASSIGNED ||
                        training.status === TRAINING_STATUS.INTERVIEW_ASSIGNED) && (
                        <Badge className="text-xs bg-green-100 text-green-700 shadow-sm">
                          {training.status === TRAINING_STATUS.SCREENING_ASSIGNED ? "Screening Assigned" : "Interview Assigned"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 truncate">{training.trainingType}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {candidate && training.candidateProjectMap?.project?.id && canWrite &&
                      training.status !== TRAINING_STATUS.SCREENING_ASSIGNED &&
                      training.status !== TRAINING_STATUS.INTERVIEW_ASSIGNED && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl hover:bg-indigo-50 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            showInterviewConfirmation(
                              candidate.id,
                              candidateName,
                              training.candidateProjectMap?.project?.id
                            );
                          }}
                        >
                          <Send className="h-5 w-5 text-indigo-600" />
                        </Button>
                      )}
                    <ChevronRight
                      className={cn(
                        "h-5 w-5 transition-all duration-300",
                        isSelected ? "text-indigo-600 translate-x-1 scale-110" : "text-slate-400 group-hover:text-slate-600"
                      )}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium shadow-sm",
                      statusConfig.bgColor,
                      statusConfig.borderColor,
                      "border"
                    )}
                  >
                    <div className={cn("h-2.5 w-2.5 rounded-full", statusConfig.dotColor)} />
                    <span className={statusConfig.color}>{statusConfig.label}</span>
                  </div>
                </div>

                {sessions.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500 font-medium">Progress</span>
                      <span className="font-semibold text-slate-700">
                        {completedSessions}/{sessions.length}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{format(new Date(training.assignedAt), "MMM d, yyyy")}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </ScrollArea>
  </div>

      {/* Right Panel - Training Details */}
    <div className="flex-1 overflow-hidden bg-gradient-to-b from-white to-indigo-50/20 min-w-0 min-h-0">
    {selectedTraining ? (
      <ScrollArea className="h-full">
        <div className="p-8 max-w-5xl mx-auto space-y-8">
          {/* Premium Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 pb-6 border-b border-indigo-200/50">
            <div className="space-y-2 flex-1 min-w-0">
              <h2 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent truncate">
                {selectedTraining.trainingType}
              </h2>
              <p className="text-lg text-slate-600 font-medium">
                Assigned on {format(new Date(selectedTraining.assignedAt), "MMMM d, yyyy")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 flex-shrink-0">
              {selectedTraining.status === TRAINING_STATUS.SCREENING_ASSIGNED || selectedTraining.status === TRAINING_STATUS.INTERVIEW_ASSIGNED ? (
                <Badge className="text-lg px-6 py-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 shadow-md">
                  {selectedTraining.status === TRAINING_STATUS.SCREENING_ASSIGNED ? "Screening Assigned" : "Interview Assigned"}
                </Badge>
              ) : canWrite && selectedTraining.candidateProjectMap?.candidate && selectedTraining.candidateProjectMap?.project?.id && (
                <Button
                  variant="outline"
                  size="xl"
                  className="h-12 px-6 rounded-xl border-indigo-300 hover:bg-indigo-50 hover:shadow-lg transition-all duration-300 text-base"
                  onClick={() =>
                    showInterviewConfirmation(
                      selectedTraining.candidateProjectMap?.candidate?.id,
                      `${selectedTraining.candidateProjectMap?.candidate?.firstName} ${selectedTraining.candidateProjectMap?.candidate?.lastName}`,
                      selectedTraining.candidateProjectMap?.project?.id
                    )
                  }
                  disabled={isSendingInterview}
                >
                  <Send className="h-5 w-5 mr-2" />
                  Send for Interview
                </Button>
              )}

              {canWrite &&
                selectedTraining.status === TRAINING_STATUS.IN_PROGRESS &&
                getTrainingSessions(selectedTraining).length > 0 &&
                getTrainingSessions(selectedTraining).every((s) => s.completedAt) && (
                  <Button
                    size="xl"
                    className="h-12 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] text-base"
                    onClick={handleCompleteTraining}
                    disabled={isCompleting}
                  >
                    {isCompleting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Completing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                        Complete Training
                      </>
                    )}
                  </Button>
                )}
            </div>
          </div>

          {/* Progress Card */}
          {getTrainingSessions(selectedTraining).length > 0 && (
            <Card className="border-0 shadow-2xl bg-white/85 backdrop-blur-lg rounded-2xl overflow-hidden ring-1 ring-indigo-200/30">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-200/30">
                      <Target className="h-8 w-8 text-indigo-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-indigo-800">Training Progress</h3>
                  </div>
                  <div className="text-5xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {trainingPercent(selectedTraining)}%
                  </div>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-3 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-700 ease-out"
                    style={{ width: `${trainingPercent(selectedTraining)}%` }}
                  />
                </div>
                <p className="text-base text-slate-600 font-medium">
                  {trainingCompletedCount(selectedTraining)} of {trainingTotalCount(selectedTraining)} sessions completed
                </p>
              </CardContent>
            </Card>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Candidate */}
            <Card className="border-0 shadow-2xl bg-gradient-to-br from-indigo-50/90 to-purple-50/90 rounded-2xl overflow-hidden ring-1 ring-indigo-200/30">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-indigo-700 mb-6 flex items-center gap-3">
                  <User className="h-6 w-6" />
                  Candidate
                </h3>
                <div className="space-y-4 text-base">
                  {(() => {
                    const candidate = selectedTraining.candidateProjectMap?.candidate as any;
                    return (
                      <>
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Name</p>
                          <p className="font-semibold text-slate-900">
                            {candidate?.firstName} {candidate?.lastName}
                          </p>
                          <p className="text-sm text-slate-500">ID: {candidate?.id || "-"}</p>
                        </div>
                        {candidate?.email && (
                          <div>
                            <p className="text-sm text-slate-500 mb-1">Email</p>
                            <p className="font-medium text-slate-900 break-all">{candidate?.email}</p>
                          </div>
                        )}
                        {candidate?.phone && (
                          <div>
                            <p className="text-sm text-slate-500 mb-1">Phone</p>
                            <p className="font-medium text-slate-900">{candidate?.phone}</p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Project */}
            <Card className="border-0 shadow-2xl bg-gradient-to-br from-purple-50/90 to-pink-50/90 rounded-2xl overflow-hidden ring-1 ring-purple-200/30">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-purple-700 mb-6 flex items-center gap-3">
                  <Briefcase className="h-6 w-6" />
                  Project & Role
                </h3>
                <div className="space-y-4 text-base">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Project</p>
                    <p className="font-semibold text-slate-900">
                      {selectedTraining.candidateProjectMap?.project?.title || "N/A"}
                    </p>
                    <p className="text-sm text-slate-500">
                      ID: {selectedTraining.candidateProjectMap?.project?.id || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Role</p>
                    <p className="font-semibold text-slate-900">
                      {selectedTraining.candidateProjectMap?.roleNeeded?.designation || "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Focus Areas */}
            {selectedTraining.focusAreas && (
              <div className="lg:col-span-2">
                <Card className="border-0 shadow-2xl bg-gradient-to-br from-teal-50/90 to-emerald-50/90 rounded-2xl overflow-hidden ring-1 ring-teal-200/30">
                  <CardContent className="p-8">
                    <h3 className="text-2xl font-bold text-teal-700 mb-6 flex items-center gap-3">
                      <Target className="h-6 w-6" />
                      Focus Areas
                    </h3>
                    <p className="text-base text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {Array.isArray(selectedTraining.focusAreas)
                        ? selectedTraining.focusAreas.join("\n")
                        : selectedTraining.focusAreas}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Final Assessment */}
          {selectedTraining.completedAt && selectedTraining.overallPerformance && (
            <Card className="border-0 shadow-2xl bg-gradient-to-br from-green-50/90 to-emerald-50/90 rounded-2xl overflow-hidden ring-1 ring-green-200/30">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-green-700 mb-6 flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6" />
                  Final Assessment
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-base">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Performance</p>
                    <Badge
                      variant={selectedTraining.overallPerformance === "excellent" ? "default" : "secondary"}
                      className="text-xl px-6 py-2 shadow-sm"
                    >
                      {selectedTraining.overallPerformance}
                    </Badge>
                  </div>
                  {selectedTraining.recommendations && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-slate-500 mb-2">Recommendations</p>
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {selectedTraining.recommendations}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Completed</p>
                    <p className="font-semibold text-slate-900">
                      {format(new Date(selectedTraining.completedAt), "MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* History */}
          {selectedTraining?.candidateProjectMap?.id && (
            <div className="pt-6">
              <InterviewHistory items={historyData?.data?.items} isLoading={isLoadingHistory} />
            </div>
          )}
        </div>
      </ScrollArea>
    ) : (
      <div className="h-full flex items-center justify-center text-center">
        <div className="space-y-6 max-w-md">
          <div className="relative mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full blur-3xl opacity-40 animate-pulse-slow"></div>
            <GraduationCap className="h-28 w-28 text-indigo-500/70 relative z-10 mx-auto" />
          </div>
          <p className="text-3xl font-bold text-slate-800">No Training Selected</p>
          <p className="text-lg text-slate-600 leading-relaxed">
            Choose a training program from the list on the left to view details, progress, and actions
          </p>
        </div>
      </div>
    )}
  </div>
</div>

    {/* Confirmation Dialog */}
    <ConfirmationDialog
      isOpen={interviewConfirm.isOpen}
      onClose={() =>
        setInterviewConfirm({
          isOpen: false,
          candidateId: "",
          candidateName: "",
          projectId: undefined,
          type: "",
          notes: "",
        })
      }
      onConfirm={handleSendForInterview}
      title="Send for Interview"
      description={
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to send {interviewConfirm.candidateName} for an interview? Please select the type and optionally add notes.
          </p>

          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">Type</label>
            <div className="space-y-2">
              {[
                { value: "screening", label: "Screening" },
                { value: "interview", label: "Interview" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-3 p-3 rounded-xl border hover:bg-indigo-50 cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="interview-type"
                    value={opt.value}
                    checked={interviewConfirm.type === opt.value}
                    onChange={() =>
                      setInterviewConfirm((prev) => ({ ...prev, type: opt.value as any }))
                    }
                    className="accent-indigo-600"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="text-base font-medium">{opt.label}</div>
                </label>
              ))}
              {!interviewConfirm.type && (
                <p className="text-sm text-red-600 mt-1">Please select one</p>
              )}
            </div>

            <label htmlFor="interview-notes" className="text-sm font-medium text-slate-700">
              Notes (Optional)
            </label>
            <Textarea
              id="interview-notes"
              placeholder="Add any notes for the interview team..."
              value={interviewConfirm.notes}
              onChange={(e) => setInterviewConfirm((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="rounded-xl border-indigo-200/50"
            />
          </div>
        </div>
      }
      confirmDisabled={!interviewConfirm.type}
      confirmText="Send for Interview"
      cancelText="Cancel"
      isLoading={isSendingInterview}
      variant="default"
      icon={
        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
          <Send className="h-6 w-6 text-white" />
        </div>
      }
    />
  </div>
);
};