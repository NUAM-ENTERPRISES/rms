import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  Send,
  ClipboardCheck,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useUpdateScreeningDecisionMutation } from "@/features/screening-coordination/interviews/data";
import { ConfirmationDialog } from "@/components/ui";
import { Textarea } from "@/components/ui/textarea";
import { useAppSelector } from "@/app/hooks";
import { useSendForInterviewMutation } from "../data";
import { TRAINING_STATUS, TRAINING_PRIORITY, TrainingAssignment, SCREENING_DECISION } from "../../types";
import { cn } from "@/lib/utils";
import InterviewHistory from "@/components/molecules/InterviewHistory";
import { useGetCandidateProjectHistoryQuery } from "../../interviews/data";
import ScheduleTrainingModal from "../components/ScheduleTrainingModal";

export default function TrainingListPage() {
  const canWrite = useCan("write:training");
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    priority: "all",
  });

  const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(
    null
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduledAssignments, setScheduledAssignments] = useState<TrainingAssignment[]>([]);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionValue, setDecisionValue] = useState<SCREENING_DECISION | null>(null);
  const [decisionRemarks, setDecisionRemarks] = useState("");
  // Removed session dialog/state: sessions are not editable from this view

  const { data, isLoading, error, refetch } = useGetTrainingAssignmentsQuery();
  const [completeTraining, { isLoading: isCompleting }] =
    useCompleteTrainingMutation();
  const [updateScreeningDecision, { isLoading: isUpdatingDecision }] =
    useUpdateScreeningDecisionMutation();

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
      filtered = filtered.filter((t) => t.status === (filters.status === "completed" ? TRAINING_STATUS.COMPLETED : filters.status));
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

  const handleUpdateDecision = async () => {
    const screeningId = selectedTraining?.screening?.id;
    if (!screeningId) {
      toast.error("No screening attached to this training.");
      return;
    }

    if (!decisionValue) {
      toast.error("Please choose a decision.");
      return;
    }

    try {
      await updateScreeningDecision({
        id: screeningId,
        data: {
          decision: decisionValue,
          remarks: decisionRemarks || undefined,
        },
      }).unwrap();

      toast.success("Screening decision updated successfully");
      setIsDecisionModalOpen(false);
      setDecisionValue(null);
      setDecisionRemarks("");
      refetch?.();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update screening decision");
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
          shortLabel: "Assigned",
          color: "text-slate-600 dark:text-slate-400",
          bgColor: "bg-slate-100 dark:bg-slate-900",
          borderColor: "border-slate-200 dark:border-slate-800",
          dotColor: "bg-slate-400",
        };
      case TRAINING_STATUS.SCHEDULED:
        return {
          label: "Scheduled",
          shortLabel: "Scheduled",
          color: "text-amber-600 dark:text-amber-400",
          bgColor: "bg-amber-50 dark:bg-amber-950",
          borderColor: "border-amber-200 dark:border-amber-800",
          dotColor: "bg-amber-500",
        };
      case TRAINING_STATUS.IN_PROGRESS:
        return {
          label: "In Progress",
          shortLabel: "Progress",
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-950",
          borderColor: "border-blue-200 dark:border-blue-800",
          dotColor: "bg-blue-500",
        };
      case TRAINING_STATUS.COMPLETED:
        return {
          label: "Completed",
          shortLabel: "Done",
          color: "text-green-600 dark:text-green-400",
          bgColor: "bg-green-50 dark:bg-green-950",
          borderColor: "border-green-200 dark:border-green-800",
          dotColor: "bg-green-500",
        };
      case TRAINING_STATUS.CANCELLED:
        return {
          label: "Cancelled",
          shortLabel: "Cancelled",
          color: "text-red-600 dark:text-red-400",
          bgColor: "bg-red-50 dark:bg-red-950",
          borderColor: "border-red-200 dark:border-red-800",
          dotColor: "bg-red-500",
        };
      case TRAINING_STATUS.SCREENING_ASSIGNED:
        return {
          label: "Screening Assigned",
          shortLabel: "Screening",
          color: "text-emerald-600 dark:text-emerald-400",
          bgColor: "bg-emerald-50 dark:bg-emerald-950",
          borderColor: "border-emerald-200 dark:border-emerald-800",
          dotColor: "bg-emerald-500",
        };
      case TRAINING_STATUS.INTERVIEW_ASSIGNED:
        return {
          label: "Interview Assigned",
          shortLabel: "Interview",
          color: "text-indigo-600 dark:text-indigo-400",
          bgColor: "bg-indigo-50 dark:bg-indigo-950",
          borderColor: "border-indigo-200 dark:border-indigo-800",
          dotColor: "bg-indigo-500",
        };
      default:
        return {
          label: status,
          shortLabel: status,
          color: "text-muted-foreground",
          bgColor: "bg-muted",
          borderColor: "border-muted",
          dotColor: "bg-slate-300",
        };
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
    { value: TRAINING_STATUS.SCHEDULED, label: "Scheduled" },
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
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
                Training Programs
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                Manage candidate development
              </p>
            </div>
          </div>

          {/* Compact Stats */}
          <div className="flex items-center gap-5">
            <div className="text-center">
              <div className="text-lg font-bold text-indigo-600">{stats.active}</div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Active</div>
            </div>
            <Separator orientation="vertical" className="h-6 opacity-50" />
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{stats.completed}</div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Done</div>
            </div>
            <Separator orientation="vertical" className="h-6 opacity-50" />
            <div className="text-center">
              <div className="text-lg font-bold text-slate-600">{stats.total}</div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Total</div>
            </div>
          </div>
        </div>

        {/* Filters - Compact & Premium */}
        <div className="flex items-center gap-2 mt-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="pl-9 h-8 text-xs rounded-lg border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
            />
          </div>

          <Select
            value={filters.status}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
          >
            <SelectTrigger className="w-28 h-8 text-xs rounded-lg border-slate-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.priority}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, priority: value }))}
          >
            <SelectTrigger className="w-28 h-8 text-xs rounded-lg border-slate-200">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(filters.search || filters.status !== "all" || filters.priority !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs rounded-lg hover:bg-slate-100"
              onClick={() => setFilters({ search: "", status: "all", priority: "all" })}
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}

              {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 ml-auto animate-in fade-in slide-in-from-right-2">
              <span className="text-xs font-semibold text-slate-600">
                {selectedIds.length} Selected
              </span>
              <Button
                size="sm"
                className="h-8 bg-indigo-600 hover:bg-indigo-700 shadow-md text-xs py-1 px-2"
                onClick={() => {
                  const selected = trainings.filter((t) => selectedIds.includes(t.id));
                  setScheduledAssignments(selected);
                  setIsScheduleOpen(true);
                }}
                disabled={trainings.filter(t => selectedIds.includes(t.id) && (getTrainingSessions(t).length > 0 || t.status === TRAINING_STATUS.COMPLETED)).length > 0}
              >
                <Calendar className="h-3.5 w-3.5 mr-1" />
                Schedule
              </Button>
              {trainings.filter(t => selectedIds.includes(t.id) && getTrainingSessions(t).length > 0 && t.status !== TRAINING_STATUS.COMPLETED).length > 0 && (
                <Button
                  size="sm"
                  className="h-8 bg-emerald-600 hover:bg-emerald-700 shadow-md text-xs py-1 px-2"
                  onClick={() => {
                    const selected = trainings.filter((t) => selectedIds.includes(t.id) && getTrainingSessions(t).length > 0 && t.status !== TRAINING_STATUS.COMPLETED);
                    navigate("/screening-coordination/training/conduct", { state: { assignments: selected } });
                  }}
                >
                  <Users className="h-3.5 w-3.5 mr-1" />
                  Conduct
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>

    {/* Master-Detail Layout */}
<div className="flex-1 flex overflow-hidden">
  {/* Left Panel - Training List */}
  <div className="w-80 border-r bg-slate-50/50 overflow-hidden flex flex-col">
    <ScrollArea className="flex-1">
      {filteredTrainings.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
          <GraduationCap className="h-12 w-12 mb-2 opacity-20" />
          <p className="text-sm font-medium">No programs</p>
        </div>
      ) : (
        <div className="p-2 space-y-1">
          {filteredTrainings.map((training) => {
            const candidate = training.candidateProjectMap?.candidate;
            const statusConfig = getStatusConfig(training.status);
            const isSelected = training.id === (selectedTraining?.id || filteredTrainings[0]?.id);
            const sessions = getTrainingSessions(training);
            const completedSessions = sessions.filter((s:any) => s.completedAt).length;
            const progress = sessions.length > 0 ? (completedSessions / sessions.length) * 100 : 0;
            const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown";

            return (
              <div key={training.id} className="relative group">
                {training.status !== TRAINING_STATUS.COMPLETED && (
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
                    <Checkbox
                      checked={selectedIds.includes(training.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedIds((prev) => [...prev, training.id]);
                        } else {
                          setSelectedIds((prev) => prev.filter((id) => id !== training.id));
                        }
                      }}
                      className="h-4 w-4 bg-white/80 border-slate-300"
                    />
                  </div>
                )}
                <button
                  onClick={() => setSelectedTrainingId(training.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-all duration-200 relative",
                    training.status !== TRAINING_STATUS.COMPLETED ? "pl-10" : "pl-3",
                    isSelected
                      ? "bg-white border-indigo-200 shadow-md ring-1 ring-indigo-50"
                      : "bg-transparent border-transparent hover:bg-white/50 hover:border-slate-200"
                  )}
                >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={cn(
                        "font-semibold text-sm truncate",
                        isSelected ? "text-indigo-700" : "text-slate-900"
                      )}>
                        {candidateName}
                      </p>
                      {training.priority && (
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          training.priority === 'high' ? 'bg-red-500' : training.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                        )} />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate font-medium">
                      {training.trainingType}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <div className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    statusConfig.color
                  )}>
                    {statusConfig.shortLabel || statusConfig.label}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(training.assignedAt), "MMM d")}
                  </div>
                </div>

                {sessions.length > 0 && progress > 0 && (
                  <div className="mt-2 h-0.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </button>
              </div>
            );
          })}
        </div>
      )}
    </ScrollArea>
  </div>

      {/* Right Panel - Training Details */}
    <div className="flex-1 overflow-hidden bg-white min-w-0 min-h-0">
    {selectedTraining ? (
      <ScrollArea className="h-full">
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-4 border-b">
            <div className="space-y-1 flex-1 min-w-0">
              <h2 className="text-xl font-bold text-slate-900 truncate">
                {selectedTraining.trainingType}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Assigned on {format(new Date(selectedTraining.assignedAt), "MMM d, yyyy")}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {canWrite && (
                <div className="flex items-center gap-2 mr-2">
                  {getTrainingSessions(selectedTraining).length === 0 && selectedTraining.status !== TRAINING_STATUS.COMPLETED && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[11px] font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      onClick={() => {
                        setScheduledAssignments([selectedTraining]);
                        setIsScheduleOpen(true);
                      }}
                    >
                      <Calendar className="h-3 w-3 mr-1.5" />
                      Schedule
                    </Button>
                  )}
                  {getTrainingSessions(selectedTraining).length > 0 &&
                   selectedTraining.status !== TRAINING_STATUS.COMPLETED &&
                   !getTrainingSessions(selectedTraining).every((s: any) => s.completedAt) && (
                    <Button
                      size="sm"
                      className="h-8 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                      onClick={() => {
                        navigate("/screening-coordination/training/conduct", { state: { assignments: [selectedTraining] } });
                      }}
                    >
                      <Users className="h-3 w-3 mr-1.5" />
                      Conduct
                    </Button>
                  )}
                </div>
              )}
              {(selectedTraining.status === TRAINING_STATUS.COMPLETED || 
                (getTrainingSessions(selectedTraining).length > 0 && 
                 getTrainingSessions(selectedTraining).every((s: any) => s.completedAt))) && (
                <Badge className="text-[10px] uppercase tracking-wider px-3 py-1 bg-green-100 text-green-700 border-green-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Training Completed
                </Badge>
              )}
              {selectedTraining.status === TRAINING_STATUS.COMPLETED && selectedTraining.screening && canWrite && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-[11px] font-bold border-slate-300 text-slate-700 hover:bg-slate-100"
                  onClick={() => {
                    setIsDecisionModalOpen(true);
                    setDecisionValue(
                      (selectedTraining.screening?.decision as SCREENING_DECISION) || null
                    );
                    setDecisionRemarks("");
                  }}
                >
                  Update Screening Decision
                </Button>
              )}
              {selectedTraining.status === TRAINING_STATUS.SCREENING_ASSIGNED || selectedTraining.status === TRAINING_STATUS.INTERVIEW_ASSIGNED ? (
                <Badge className="text-[10px] uppercase tracking-wider px-3 py-1 bg-green-50 text-green-700 border-green-200">
                  {selectedTraining.status === TRAINING_STATUS.SCREENING_ASSIGNED ? "Screening Assigned" : "Interview Assigned"}
                </Badge>
              ) : null}

              {canWrite &&
                selectedTraining.status === TRAINING_STATUS.IN_PROGRESS &&
                getTrainingSessions(selectedTraining).length > 0 &&
                getTrainingSessions(selectedTraining).every((s: any) => s.completedAt) && (
                  <Button
                    size="sm"
                    className="h-8 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                    onClick={handleCompleteTraining}
                    disabled={isCompleting}
                  >
                    {isCompleting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1.5" />
                        Finish
                      </>
                    )}
                  </Button>
                )}

              {selectedTraining.status === TRAINING_STATUS.COMPLETED &&
                selectedTraining.screening &&
                canWrite &&
                ![
                  SCREENING_DECISION.APPROVED,
                  SCREENING_DECISION.REJECTED,
                  SCREENING_DECISION.ON_HOLD,
                ].includes(selectedTraining.screening?.decision as any) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-[11px] font-bold border-slate-300 text-slate-700 hover:bg-slate-100"
                    onClick={() => {
                      setIsDecisionModalOpen(true);
                      setDecisionValue(
                        (selectedTraining.screening?.decision as SCREENING_DECISION) || null
                      );
                      setDecisionRemarks(selectedTraining.screening?.remarks || "");
                    }}
                  >
                    Update Screening Decision
                  </Button>
                )}
            </div>
          </div>

          {/* Progress Card */}
          {getTrainingSessions(selectedTraining).length > 0 && (
            <Card className="border-0 bg-blue-50/50 shadow-none border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-blue-500" />
                    <h3 className="text-xs font-bold text-blue-600 uppercase tracking-tight">
                      {getTrainingSessions(selectedTraining)[0]?.performanceRating ? "Performance Rating" : "Progress"}
                    </h3>
                  </div>
                  <div className="text-base font-extrabold text-blue-700">
                    {getTrainingSessions(selectedTraining)[0]?.performanceRating 
                      ? `${getTrainingSessions(selectedTraining)[0].performanceRating}/100`
                      : `${trainingPercent(selectedTraining)}%`}
                  </div>
                </div>
                <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden mb-1.5">
                  <div
                    className="h-full bg-blue-500 transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                    style={{ 
                      width: getTrainingSessions(selectedTraining)[0]?.performanceRating 
                        ? `${getTrainingSessions(selectedTraining)[0].performanceRating}%`
                        : `${trainingPercent(selectedTraining)}%` 
                    }}
                  />
                </div>
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                  {getTrainingSessions(selectedTraining)[0]?.performanceRating 
                    ? "Evaluation Complete" 
                    : `${trainingCompletedCount(selectedTraining)} / ${trainingTotalCount(selectedTraining)} sessions`}
                </p>
                {getTrainingSessions(selectedTraining)[0]?.notes && (
                  <div className="mt-3 pt-3 border-t border-blue-100">
                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-tight mb-1">Trainer Remarks</p>
                    <p className="text-xs text-blue-900/80 italic leading-relaxed">
                      "{getTrainingSessions(selectedTraining)[0].notes}"
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Candidate */}
            <Card className="border-indigo-100 bg-indigo-50/30 shadow-none">
              <CardContent className="p-4">
                <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <User className="h-3 w-3" />
                  Candidate
                </h3>
                <div className="space-y-3">
                  {(() => {
                    const candidate = selectedTraining.candidateProjectMap?.candidate as any;
                    return (
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-[10px] font-bold border border-indigo-200">
                          {candidate?.firstName?.[0]}{candidate?.lastName?.[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-indigo-950 truncate leading-none mb-1">
                            {candidate?.firstName} {candidate?.lastName}
                          </p>
                          <p className="text-[10px] text-indigo-400 font-medium">Available via {candidate?.email || 'email'}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Project */}
            <Card className="border-purple-100 bg-purple-50/30 shadow-none">
              <CardContent className="p-4">
                <h3 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Briefcase className="h-3 w-3" />
                  Context
                </h3>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-purple-900 truncate leading-none mb-1">
                    {selectedTraining.candidateProjectMap?.project?.title || "N/A"}
                  </p>
                  <p className="text-[10px] text-purple-500 font-medium">
                    {selectedTraining.candidateProjectMap?.roleNeeded?.designation || "N/A"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Screening Details */}
          {selectedTraining.screening && (
            <Card className="border-amber-100 bg-amber-50/30 shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2">
                    <ClipboardCheck className="h-3 w-3" />
                    Screening Context
                  </h3>
                  {selectedTraining.screening.overallRating && (
                    <div className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold border border-amber-200">
                      Score: {selectedTraining.screening.overallRating}/100
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-amber-500 font-bold uppercase tracking-tight mb-1">Observation</p>
                    <p className="text-xs text-amber-900/80 italic leading-relaxed">
                      "{selectedTraining.screening.remarks || "No evaluation notes provided"}"
                    </p>
                  </div>
                  {selectedTraining.screening.areasOfImprovement && (
                    <div>
                      <p className="text-[10px] text-amber-500 font-bold uppercase tracking-tight mb-1">Areas of Improvement</p>
                      <p className="text-xs text-amber-900/80 leading-relaxed font-medium">
                        {selectedTraining.screening.areasOfImprovement}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Focus Areas */}
          {selectedTraining.focusAreas && (
            <Card className="border-emerald-100 shadow-none bg-emerald-50/30">
              <CardContent className="p-4">
                <h3 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Target className="h-3 w-3" />
                  Focus Areas
                </h3>
                <p className="text-xs text-emerald-900/80 whitespace-pre-wrap leading-relaxed">
                  {Array.isArray(selectedTraining.focusAreas)
                    ? selectedTraining.focusAreas.join("\n")
                    : selectedTraining.focusAreas}
                </p>
              </CardContent>
            </Card>
          )}

          {/* History */}
          {selectedTraining?.candidateProjectMap?.id && (
            <div className="pt-2">
               <div className="flex items-center gap-2 mb-4 px-1">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global History</h3>
                  <div className="h-px bg-slate-100 flex-1"></div>
               </div>
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

    {/* Decision update dialog */}
    <ConfirmationDialog
      isOpen={isDecisionModalOpen}
      onClose={() => {
        setIsDecisionModalOpen(false);
        setDecisionValue(null);
        setDecisionRemarks("");
      }}
      onConfirm={handleUpdateDecision}
      title="Update Screening Decision"
      description={
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Current decision: <strong>{selectedTraining?.screening?.decision || 'None'}</strong>
          </p>
          <div className="space-y-2">
            {[
              { value: SCREENING_DECISION.APPROVED, label: "Approved" },
              { value: SCREENING_DECISION.REJECTED, label: "Rejected" },
              { value: SCREENING_DECISION.ON_HOLD, label: "On Hold" },
            ].map((option) => (
              <label key={option.value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="decision"
                  value={option.value}
                  checked={decisionValue === option.value}
                  onChange={() => setDecisionValue(option.value as SCREENING_DECISION)}
                  className="accent-indigo-600"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
          <Textarea
            placeholder="Remarks (optional)"
            value={decisionRemarks}
            onChange={(e) => setDecisionRemarks(e.target.value)}
            rows={3}
            className="rounded-lg"
          />
        </div>
      }
      confirmDisabled={!decisionValue}
      confirmText="Update Decision"
      cancelText="Cancel"
      isLoading={isUpdatingDecision}
      variant="default"
      icon={
        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
          <CheckCircle2 className="h-6 w-6 text-white" />
        </div>
      }
    />

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

    <ScheduleTrainingModal
      open={isScheduleOpen}
      onOpenChange={setIsScheduleOpen}
      selectedAssignments={scheduledAssignments}
    />
  </div>
);
}