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
  ChevronDown,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useGetTrainingAssignmentsQuery, useCreateTrainingAssignmentMutation } from "../data";
import { useCan } from "@/hooks/useCan";
import { useCompleteTrainingMutation } from "../data";
import { useUpdateScreeningDecisionMutation } from "@/features/screening-coordination/interviews/data";
import { ConfirmationDialog } from "@/components/ui";
import { Textarea } from "@/components/ui/textarea";
import { useAppSelector } from "@/app/hooks";
import { useSendForInterviewMutation } from "../data";
import { TRAINING_STATUS, TRAINING_PRIORITY, TRAINING_TYPE, TrainingAssignment, SCREENING_DECISION } from "../../types";
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

  const [needsTrainingType, setNeedsTrainingType] = useState<string>(TRAINING_TYPE.TECHNICAL);
  const [needsTrainingFocusAreas, setNeedsTrainingFocusAreas] = useState<string[]>([]);
  const [needsTrainingFocusAreaInput, setNeedsTrainingFocusAreaInput] = useState("");
  const [needsTrainingPriority, setNeedsTrainingPriority] = useState<string>(TRAINING_PRIORITY.MEDIUM);
  const [needsTrainingTargetCompletionDate, setNeedsTrainingTargetCompletionDate] = useState<string>("");
  const [needsTrainingNotes, setNeedsTrainingNotes] = useState<string>("");

  // Removed session dialog/state: sessions are not editable from this view

  const { data, isLoading, error, refetch } = useGetTrainingAssignmentsQuery();
  const [completeTraining, { isLoading: isCompleting }] =
    useCompleteTrainingMutation();
  const [updateScreeningDecision, { isLoading: isUpdatingDecision }] =
    useUpdateScreeningDecisionMutation();
  const [createTrainingAssignment, { isLoading: isCreatingTraining }] =
    useCreateTrainingAssignmentMutation();

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
      if (decisionValue === SCREENING_DECISION.NEEDS_TRAINING) {
        if (!needsTrainingType) {
          toast.error('Please select a training type for Needs Training');
          return;
        }
        if (!needsTrainingFocusAreas.length) {
          toast.error('Please add at least one focus area for Needs Training');
          return;
        }
      }

      await updateScreeningDecision({
        id: screeningId,
        data: {
          decision: decisionValue,
          remarks: decisionRemarks || undefined,
          trainingType: decisionValue === SCREENING_DECISION.NEEDS_TRAINING ? needsTrainingType : undefined,
          focusAreas: decisionValue === SCREENING_DECISION.NEEDS_TRAINING ? needsTrainingFocusAreas : undefined,
          priority: decisionValue === SCREENING_DECISION.NEEDS_TRAINING ? needsTrainingPriority : undefined,
          targetCompletionDate:
            decisionValue === SCREENING_DECISION.NEEDS_TRAINING
              ? needsTrainingTargetCompletionDate || undefined
              : undefined,
          trainingNotes: decisionValue === SCREENING_DECISION.NEEDS_TRAINING ? needsTrainingNotes : undefined,
        },
      }).unwrap();

      toast.success("Screening decision updated successfully");
      setIsDecisionModalOpen(false);
      setDecisionValue(null);
      setDecisionRemarks("");
      setNeedsTrainingType("");
      setNeedsTrainingFocusAreas([]);
      setNeedsTrainingFocusAreaInput("");
      setNeedsTrainingPriority(TRAINING_PRIORITY.MEDIUM);
      setNeedsTrainingTargetCompletionDate("");
      setNeedsTrainingNotes("");
      refetch?.();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update screening decision");
    }
  };

  const openDecisionModal = (value: SCREENING_DECISION) => {
    setDecisionValue(value);
    setDecisionRemarks("");
    if (value !== SCREENING_DECISION.NEEDS_TRAINING) {
      setNeedsTrainingType(TRAINING_TYPE.TECHNICAL);
      setNeedsTrainingFocusAreas([]);
      setNeedsTrainingFocusAreaInput("");
      setNeedsTrainingPriority(TRAINING_PRIORITY.MEDIUM);
      setNeedsTrainingTargetCompletionDate("");
      setNeedsTrainingNotes("");
    }
    setIsDecisionModalOpen(true);
  };

  const handleAddNeedsTrainingFocusArea = () => {
    const trimmed = needsTrainingFocusAreaInput.trim();
    if (trimmed && !needsTrainingFocusAreas.includes(trimmed)) {
      setNeedsTrainingFocusAreas((prev) => [...prev, trimmed]);
      setNeedsTrainingFocusAreaInput("");
    }
  };

  const handleRemoveNeedsTrainingFocusArea = (area: string) => {
    setNeedsTrainingFocusAreas((prev) => prev.filter((a) => a !== area));
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
  <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-2xl shadow-sm sticky top-0 z-50">
  <div className="px-8 py-5 max-w-7xl mx-auto">
    <div className="flex items-center justify-between">
      {/* Logo + Title Section */}
      <div className="flex items-center gap-5">
        <div className="relative group">
          {/* Glow Effect */}
          <div className="absolute -inset-3 bg-gradient-to-br from-indigo-500 via-purple-600 to-violet-600 rounded-2xl blur-xl opacity-25 group-hover:opacity-40 transition-all duration-500"></div>
          
          {/* Icon Container */}
          <div className="relative p-3.5 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl shadow-xl shadow-indigo-500/30 flex items-center justify-center">
            <GraduationCap className="h-7 w-7 text-white drop-shadow-sm" />
          </div>
        </div>

        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold bg-gradient-to-r from-slate-900 via-indigo-700 to-violet-700 bg-clip-text text-transparent tracking-tighter">
            Training Programs
          </h1>
          <p className="text-sm text-slate-500 font-medium flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Candidate Development Hub
          </p>
        </div>
      </div>

      {/* Compact Stats with Glass Cards */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-8 bg-white/70 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
          <div className="text-center">
            <div className="text-2xl font-semibold text-indigo-600 tabular-nums">{stats.active}</div>
            <div className="text-[10px] font-semibold tracking-[0.5px] text-slate-400 uppercase">Active</div>
          </div>

          <Separator orientation="vertical" className="h-9 bg-slate-200" />

          <div className="text-center">
            <div className="text-2xl font-semibold text-emerald-600 tabular-nums">{stats.completed}</div>
            <div className="text-[10px] font-semibold tracking-[0.5px] text-slate-400 uppercase">Completed</div>
          </div>

          <Separator orientation="vertical" className="h-9 bg-slate-200" />

          <div className="text-center">
            <div className="text-2xl font-semibold text-slate-700 tabular-nums">{stats.total}</div>
            <div className="text-[10px] font-semibold tracking-[0.5px] text-slate-400 uppercase">Total</div>
          </div>
        </div>
      </div>
    </div>

    {/* Enhanced Filters Bar */}
    <div className="mt-6 flex items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 max-w-lg group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
        <Input
          placeholder="Search programs, candidates, or mentors..."
          value={filters.search}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          className="pl-11 h-11 bg-white border-slate-200 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 rounded-2xl text-sm placeholder:text-slate-400 transition-all shadow-sm"
        />
      </div>

      {/* Status Filter */}
      <Select
        value={filters.status}
        onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
      >
        <SelectTrigger className="w-40 h-11 border-slate-200 bg-white rounded-2xl text-sm focus:ring-1 focus:ring-indigo-200">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent className="rounded-2xl">
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-sm py-3">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Priority Filter */}
      <Select
        value={filters.priority}
        onValueChange={(value) => setFilters((prev) => ({ ...prev, priority: value }))}
      >
        <SelectTrigger className="w-40 h-11 border-slate-200 bg-white rounded-2xl text-sm focus:ring-1 focus:ring-indigo-200">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent className="rounded-2xl">
          {priorityOptions.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-sm py-3">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Button */}
      {(filters.search || filters.status !== "all" || filters.priority !== "all") && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFilters({ search: "", status: "all", priority: "all" })}
          className="h-11 px-5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-2xl transition-all"
        >
          <X className="h-4 w-4 mr-2" />
          Clear Filters
        </Button>
      )}

      {/* Bulk Actions - Right Aligned */}
      {selectedIds.length > 0 && (
        <div className="ml-auto flex items-center gap-3 animate-in slide-in-from-right-3 duration-300">
          <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 text-sm font-medium text-slate-600 flex items-center gap-2 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
            {selectedIds.length} selected
          </div>

          <Button
            size="lg"
            className="h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-500/30 text-white rounded-2xl px-6 font-medium transition-all active:scale-[0.985]"
            onClick={() => {
              const selected = trainings.filter((t) => selectedIds.includes(t.id));
              setScheduledAssignments(selected);
              setIsScheduleOpen(true);
            }}
            disabled={trainings.filter(t => selectedIds.includes(t.id) && (getTrainingSessions(t).length > 0 || t.status === TRAINING_STATUS.COMPLETED)).length > 0}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Training
          </Button>

          {trainings.filter(t => selectedIds.includes(t.id) && getTrainingSessions(t).length > 0 && t.status !== TRAINING_STATUS.COMPLETED).length > 0 && (
            <Button
              size="lg"
              className="h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/30 text-white rounded-2xl px-6 font-medium transition-all active:scale-[0.985]"
              onClick={() => {
                const selected = trainings.filter((t) => selectedIds.includes(t.id) && getTrainingSessions(t).length > 0 && t.status !== TRAINING_STATUS.COMPLETED);
                navigate("/screening-coordination/training/conduct", { state: { assignments: selected } });
              }}
            >
              <Users className="h-4 w-4 mr-2" />
              Conduct Sessions
            </Button>
          )}
        </div>
      )}
    </div>
  </div>
</header>
    {/* Master-Detail Layout */}
<div className="flex-1 flex overflow-hidden bg-slate-50">
  {/* Left Panel - Training List */}
  <div className="w-80 border-r border-slate-200 bg-white/95 backdrop-blur-2xl overflow-hidden flex flex-col shadow-sm">
    <div className="px-5 py-4 border-b bg-white">
      <div className="text-xs font-semibold tracking-widest text-slate-500">TRAINING PROGRAMS</div>
      <div className="text-sm text-slate-600 font-medium mt-0.5">{filteredTrainings.length} candidates</div>
    </div>

    <ScrollArea className="flex-1">
      {filteredTrainings.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
          <GraduationCap className="h-12 w-12 mb-2 opacity-20" />
          <p className="text-sm font-medium">No programs</p>
        </div>
      ) : (
        <div className="p-3 space-y-2">
          {filteredTrainings.map((training) => {
            const candidate = training.candidateProjectMap?.candidate;
            const statusConfig = getStatusConfig(training.status);
            const isSelected = training.id === (selectedTraining?.id || filteredTrainings[0]?.id);
            const sessions = getTrainingSessions(training);
            const completedSessions = sessions.filter((s:any) => s.completedAt).length;
            const progress = sessions.length > 0 ? (completedSessions / sessions.length) * 100 : 0;
            const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown";
            const trainingAttempt = (training as any).trainingAttempt;
            const trainingAttemptTotal = (training as any).trainingAttemptTotal;
            const trainerName = (training as any).trainer?.name || training.assignedBy?.name || training.assignedBy;

            return (
              <div key={training.id} className="relative group">
                {training.status !== TRAINING_STATUS.COMPLETED && (
                  <div className="absolute left-4 top-5 z-10">
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
                    "w-full text-left p-4 rounded-2xl border transition-all duration-200 relative",
                    training.status !== TRAINING_STATUS.COMPLETED ? "pl-12" : "pl-4",
                    isSelected
                      ? "bg-white border-indigo-200 shadow-md ring-1 ring-indigo-50"
                      : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={cn(
                          "font-semibold text-base truncate",
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
                      <p className="text-sm text-slate-600 truncate font-medium">
                        {training.trainingType}
                      </p>
                      {(trainingAttempt || trainingAttemptTotal) && (
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-indigo-500 font-semibold">
                            Training #{trainingAttempt}
                          </p>
                          {trainingAttemptTotal > 1 && (
                            <Badge className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-amber-200 text-amber-800 border border-amber-300">
                              Attempt {trainingAttempt}
                            </Badge>
                          )}
                        </div>
                      )}
                      {trainerName && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          Trainer: {trainerName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-lg",
                      statusConfig.color
                    )}>
                      {statusConfig.shortLabel || statusConfig.label}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(training.assignedAt), "MMM d")}
                    </div>
                  </div>

                  {sessions.length > 0 && progress > 0 && (
                    <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
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
        <div className="p-8 max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 pb-6 border-b">
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2">
               <h2 className="text-4xl font-semibold tracking-tighter bg-gradient-to-r from-slate-900 via-indigo-700 to-violet-700 bg-clip-text text-transparent">
                {selectedTraining.trainingType}
               </h2>
                {selectedTraining.trainingAttemptTotal > 1 && (
                  <Badge className="text-[10px] uppercase tracking-wider px-3 py-1 bg-amber-100 text-amber-700 border border-amber-200">
                    Attempt {selectedTraining.trainingAttempt}/{selectedTraining.trainingAttemptTotal}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-500 font-medium">
                Assigned on {format(new Date(selectedTraining.assignedAt), "MMM d, yyyy")}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {canWrite && (
                <div className="flex items-center gap-2 mr-2">
                  {getTrainingSessions(selectedTraining).length === 0 && selectedTraining.status !== TRAINING_STATUS.COMPLETED && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 text-xs font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      onClick={() => {
                        setScheduledAssignments([selectedTraining]);
                        setIsScheduleOpen(true);
                      }}
                    >
                      <Calendar className="h-3.5 w-3.5 mr-1.5" />
                      Schedule
                    </Button>
                  )}
                  {getTrainingSessions(selectedTraining).length > 0 &&
                   selectedTraining.status !== TRAINING_STATUS.COMPLETED &&
                   !getTrainingSessions(selectedTraining).every((s: any) => s.completedAt) && (
                    <Button
                      size="sm"
                      className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                      onClick={() => {
                        navigate("/screening-coordination/training/conduct", { state: { assignments: [selectedTraining] } });
                      }}
                    >
                      <Users className="h-3.5 w-3.5 mr-1.5" />
                      Conduct
                    </Button>
                  )}
                </div>
              )}

              {(selectedTraining.status === TRAINING_STATUS.COMPLETED || 
                (getTrainingSessions(selectedTraining).length > 0 && 
                 getTrainingSessions(selectedTraining).every((s: any) => s.completedAt))) && (
                <Badge className="text-xs uppercase tracking-wider px-4 py-1.5 bg-green-100 text-green-700 border-green-200">
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Training Completed
                </Badge>
              )}

              {selectedTraining.status === TRAINING_STATUS.SCREENING_ASSIGNED || selectedTraining.status === TRAINING_STATUS.INTERVIEW_ASSIGNED ? (
                <Badge className="text-xs uppercase tracking-wider px-4 py-1.5 bg-green-50 text-green-700 border-green-200">
                  {selectedTraining.status === TRAINING_STATUS.SCREENING_ASSIGNED ? "Screening Assigned" : "Interview Assigned"}
                </Badge>
              ) : null}

              {canWrite &&
                selectedTraining.status === TRAINING_STATUS.IN_PROGRESS &&
                getTrainingSessions(selectedTraining).length > 0 &&
                getTrainingSessions(selectedTraining).every((s: any) => s.completedAt) && (
                  <Button
                    size="sm"
                    className="h-9 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                    onClick={handleCompleteTraining}
                    disabled={isCompleting}
                  >
                    {isCompleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        Finish
                      </>
                    )}
                  </Button>
                )}

              {selectedTraining.status === TRAINING_STATUS.COMPLETED && selectedTraining.screening && canWrite && (
                (() => {
                  const hasFinalDecision = [
                    SCREENING_DECISION.APPROVED,
                    SCREENING_DECISION.REJECTED,
                    SCREENING_DECISION.ON_HOLD,
                  ].includes(selectedTraining.screening?.decision as SCREENING_DECISION)

                  if (hasFinalDecision) {
                    return (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-100 gap-2 px-4 shadow-none"
                          >
                            Update Decision
                            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 p-1 rounded-2xl shadow-lg border-slate-200">
                          <div className="px-3 py-2 border-b border-slate-100 mb-1">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Outcome</p>
                          </div>
                          {[
                            { 
                              value: SCREENING_DECISION.APPROVED, 
                              label: "Approve Candidate", 
                              icon: CheckCircle2,
                              color: "text-emerald-600",
                              hoverBg: "hover:bg-emerald-50",
                              description: "Mark as qualified"
                            },
                            { 
                              value: SCREENING_DECISION.NEEDS_TRAINING, 
                              label: "Needs Training", 
                              icon: AlertCircle,
                              color: "text-amber-600",
                              hoverBg: "hover:bg-amber-50",
                              description: "Assign new training"
                            },
                            { 
                              value: SCREENING_DECISION.REJECTED, 
                              label: "Reject Candidate", 
                              icon: X,
                              color: "text-red-600",
                              hoverBg: "hover:bg-red-50",
                              description: "Not suitable now"
                            },
                            { 
                              value: SCREENING_DECISION.ON_HOLD, 
                              label: "Keep On Hold", 
                              icon: Calendar,
                              color: "text-amber-600",
                              hoverBg: "hover:bg-amber-50",
                              description: "Review later"
                            },
                          ].map((option) => (
                            <DropdownMenuItem
                              key={option.value}
                              onClick={() => openDecisionModal(option.value as SCREENING_DECISION)}
                              className={cn(
                                "flex flex-col items-start gap-1 py-2.5 px-3 cursor-pointer rounded-xl transition-colors",
                                option.hoverBg
                              )}
                            >
                              <div className="flex items-center gap-2 w-full">
                                <option.icon className={cn("h-4 w-4", option.color)} />
                                <span className={cn("text-sm font-semibold", option.color)}>{option.label}</span>
                              </div>
                              <span className="text-xs text-slate-400 pl-6 leading-none">
                                {option.description}
                              </span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  }

                  return (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-100 gap-2 px-4 shadow-none"
                        >
                          Process Outcome
                          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 p-1 rounded-2xl shadow-lg border-slate-200">
                        <div className="px-3 py-2 border-b border-slate-100 mb-1">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Final Outcome</p>
                        </div>
                        {[
                          { 
                            value: SCREENING_DECISION.APPROVED, 
                            label: "Approve Candidate", 
                            icon: CheckCircle2,
                            color: "text-emerald-600",
                            hoverBg: "hover:bg-emerald-50",
                            description: "Proceed to hiring pipeline"
                          },
                          { 
                            value: SCREENING_DECISION.NEEDS_TRAINING, 
                            label: "Needs Training", 
                            icon: AlertCircle,
                            color: "text-amber-600",
                            hoverBg: "hover:bg-amber-50",
                            description: "Reassign to training"
                          },
                          { 
                            value: SCREENING_DECISION.REJECTED, 
                            label: "Reject Candidate", 
                            icon: X,
                            color: "text-red-600",
                            hoverBg: "hover:bg-red-50",
                            description: "Not suitable right now"
                          },
                          { 
                            value: SCREENING_DECISION.ON_HOLD, 
                            label: "Keep On Hold", 
                            icon: Calendar,
                            color: "text-amber-600",
                            hoverBg: "hover:bg-amber-50",
                            description: "Consider later"
                          },
                        ].map((option) => (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() => openDecisionModal(option.value as SCREENING_DECISION)}
                            className={cn(
                              "flex flex-col items-start gap-1 py-2.5 px-3 cursor-pointer rounded-xl transition-colors",
                              option.hoverBg
                            )}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <option.icon className={cn("h-4 w-4", option.color)} />
                              <span className={cn("text-sm font-semibold", option.color)}>{option.label}</span>
                            </div>
                            <span className="text-xs text-slate-400 pl-6 leading-none">
                              {option.description}
                            </span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                })()
              )}
            </div>
          </div>

          {/* Progress Card */}
          {getTrainingSessions(selectedTraining).length > 0 && (
            <Card className="border-0 bg-blue-50/70 shadow-sm border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-blue-700">
                      {getTrainingSessions(selectedTraining)[0]?.performanceRating ? "Performance Rating" : "Progress"}
                    </h3>
                  </div>
                  <div className="text-2xl font-bold text-blue-700">
                    {getTrainingSessions(selectedTraining)[0]?.performanceRating 
                      ? `${getTrainingSessions(selectedTraining)[0].performanceRating}/100`
                      : `${trainingPercent(selectedTraining)}%`}
                  </div>
                </div>
                <div className="h-2 bg-blue-100 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-blue-600 transition-all duration-500"
                    style={{ 
                      width: getTrainingSessions(selectedTraining)[0]?.performanceRating 
                        ? `${getTrainingSessions(selectedTraining)[0].performanceRating}%`
                        : `${trainingPercent(selectedTraining)}%` 
                    }}
                  />
                </div>
                <p className="text-xs text-blue-500 font-medium">
                  {getTrainingSessions(selectedTraining)[0]?.performanceRating 
                    ? "Evaluation Complete" 
                    : `${trainingCompletedCount(selectedTraining)} / ${trainingTotalCount(selectedTraining)} sessions`}
                </p>
                {getTrainingSessions(selectedTraining)[0]?.notes && (
                  <div className="mt-4 pt-4 border-t border-blue-100">
                    <p className="text-xs text-blue-500 font-medium mb-1">Trainer Remarks</p>
                    <p className="text-sm text-blue-900/80 italic leading-relaxed">
                      "{getTrainingSessions(selectedTraining)[0].notes}"
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Candidate */}
            <Card className="border-indigo-100 bg-indigo-50/50 shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  CANDIDATE
                </h3>
                <div className="space-y-3">
                  {(() => {
                    const candidate = selectedTraining.candidateProjectMap?.candidate as any;
                    return (
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 text-lg font-bold border border-indigo-200">
                          {candidate?.firstName?.[0]}{candidate?.lastName?.[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {candidate?.firstName} {candidate?.lastName}
                          </p>
                          <p className="text-sm text-slate-500">{candidate?.email || 'email'}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Project */}
            <Card className="border-purple-100 bg-purple-50/50 shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-xs font-bold text-purple-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  CONTEXT
                </h3>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900 truncate">
                    {selectedTraining.candidateProjectMap?.project?.title || "N/A"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {selectedTraining.candidateProjectMap?.roleNeeded?.designation || "N/A"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Screening Details */}
          {selectedTraining.screening && (
            <Card className="border-amber-100 bg-amber-50/50 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4" />
                    SCREENING CONTEXT
                  </h3>
                  {selectedTraining.screening.overallRating && (
                    <div className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium border border-amber-200">
                      Score: {selectedTraining.screening.overallRating}/100
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-amber-500 font-medium mb-1">Observation</p>
                    <p className="text-sm text-amber-900/80 italic">
                      "{selectedTraining.screening.remarks || "No evaluation notes provided"}"
                    </p>
                  </div>
                  {selectedTraining.screening.areasOfImprovement && (
                    <div>
                      <p className="text-xs text-amber-500 font-medium mb-1">Areas of Improvement</p>
                      <p className="text-sm text-amber-900/80">
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
            <Card className="border-emerald-100 bg-emerald-50/50 shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  FOCUS AREAS
                </h3>
                <p className="text-sm text-emerald-900/80 whitespace-pre-wrap leading-relaxed">
                  {Array.isArray(selectedTraining.focusAreas)
                    ? selectedTraining.focusAreas.join("\n")
                    : selectedTraining.focusAreas}
                </p>
              </CardContent>
            </Card>
          )}

          {/* History */}
          {selectedTraining?.candidateProjectMap?.id && (
            <div className="pt-4">
              <div className="flex items-center gap-3 mb-5 px-1">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">GLOBAL HISTORY</h3>
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
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full blur-3xl opacity-40"></div>
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
      className="sm:max-w-2xl"
      isOpen={isDecisionModalOpen}
      onClose={() => {
        setIsDecisionModalOpen(false);
        setDecisionValue(null);
        setDecisionRemarks("");
      }}
      onConfirm={handleUpdateDecision}
      confirmButtonClassName={
        decisionValue === SCREENING_DECISION.NEEDS_TRAINING
          ? "bg-black text-white hover:bg-slate-800"
          : ""
      }
      title={
        decisionValue === SCREENING_DECISION.NEEDS_TRAINING
          ? "Confirm Training Assignment"
          : "Confirm Screening Decision"
      }
      description={
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selected Decision</span>
                <Badge className={cn("text-[10px] uppercase font-bold", 
                  decisionValue === SCREENING_DECISION.APPROVED ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" :
                  decisionValue === SCREENING_DECISION.REJECTED ? "bg-red-100 text-red-700 hover:bg-red-100" :
                  "bg-amber-100 text-amber-700 hover:bg-amber-100"
                )}>
                  {decisionValue}
                </Badge>
             </div>
             <div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Are you sure you want to {decisionValue?.toLowerCase()} this candidate? This action will update the screening status and notify relevant stakeholders.
                </p>
             </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Remarks & Feedback</label>
            <Textarea
              placeholder="Provide detailed reasons for this decision..."
              value={decisionRemarks}
              onChange={(e) => setDecisionRemarks(e.target.value)}
              rows={4}
              className="rounded-xl border-slate-200 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm p-3"
            />
          </div>

          {decisionValue === SCREENING_DECISION.NEEDS_TRAINING && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Training Details</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Training Type *</label>
                  <Select
                    value={needsTrainingType}
                    onValueChange={(value) => setNeedsTrainingType(value)}
                    disabled={isUpdatingDecision}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select training type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TRAINING_TYPE.INTERVIEW_SKILLS}>Interview Skills</SelectItem>
                      <SelectItem value={TRAINING_TYPE.TECHNICAL}>Technical</SelectItem>
                      <SelectItem value={TRAINING_TYPE.COMMUNICATION}>Communication</SelectItem>
                      <SelectItem value={TRAINING_TYPE.ROLE_SPECIFIC}>Role Specific</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Priority</label>
                  <Select
                    value={needsTrainingPriority}
                    onValueChange={(value) => setNeedsTrainingPriority(value)}
                    disabled={isUpdatingDecision}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TRAINING_PRIORITY.LOW}>Low</SelectItem>
                      <SelectItem value={TRAINING_PRIORITY.MEDIUM}>Medium</SelectItem>
                      <SelectItem value={TRAINING_PRIORITY.HIGH}>High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600">Focus Areas *</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Add focus area"
                    value={needsTrainingFocusAreaInput}
                    onChange={(e) => setNeedsTrainingFocusAreaInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNeedsTrainingFocusArea();
                      }
                    }}
                    disabled={isUpdatingDecision}
                  />
                  <Button
                    size="sm"
                    type="button"
                    onClick={handleAddNeedsTrainingFocusArea}
                    disabled={!needsTrainingFocusAreaInput.trim() || isUpdatingDecision}
                  >
                    Add
                  </Button>
                </div>
                {needsTrainingFocusAreas.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {needsTrainingFocusAreas.map((foa) => (
                      <span
                        key={foa}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs"
                      >
                        {foa}
                        <button
                          type="button"
                          onClick={() => handleRemoveNeedsTrainingFocusArea(foa)}
                          className="text-indigo-500 hover:text-indigo-700"
                          disabled={isUpdatingDecision}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Target completion date</label>
                  <Input
                    type="date"
                    value={needsTrainingTargetCompletionDate}
                    onChange={(e) => setNeedsTrainingTargetCompletionDate(e.target.value)}
                    disabled={isUpdatingDecision}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Training Notes</label>
                  <Textarea
                    value={needsTrainingNotes}
                    onChange={(e) => setNeedsTrainingNotes(e.target.value)}
                    rows={2}
                    disabled={isUpdatingDecision}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      }
      confirmDisabled={!decisionValue}
      confirmText={`Confirm ${
        decisionValue === SCREENING_DECISION.APPROVED ? 'Approval' :
        decisionValue === SCREENING_DECISION.REJECTED ? 'Rejection' :
        decisionValue === SCREENING_DECISION.NEEDS_TRAINING ? 'Needs Training' :
        decisionValue === SCREENING_DECISION.ON_HOLD ? 'Hold' :
        'Update'
      }`}
      cancelText="Go Back"
      isLoading={isUpdatingDecision}
      variant={
        decisionValue === SCREENING_DECISION.REJECTED ? "destructive" :
        decisionValue === SCREENING_DECISION.NEEDS_TRAINING ? "secondary" :
        "default"
      }
      icon={
        <div className={cn(
          "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center shadow-lg",
          decisionValue === SCREENING_DECISION.APPROVED ? "bg-gradient-to-br from-emerald-500 to-teal-600" :
          decisionValue === SCREENING_DECISION.REJECTED ? "bg-gradient-to-br from-red-500 to-rose-600" :
          "bg-gradient-to-br from-amber-500 to-orange-600"
        )}>
          {decisionValue === SCREENING_DECISION.APPROVED ? <CheckCircle2 className="h-6 w-6 text-white" /> :
           decisionValue === SCREENING_DECISION.REJECTED ? <X className="h-6 w-6 text-white" /> :
           <Calendar className="h-6 w-6 text-white" />}
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