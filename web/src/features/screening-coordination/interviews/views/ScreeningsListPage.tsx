import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAppSelector } from "@/app/hooks";
import {
  ClipboardCheck,
  Search,
  Loader2,
  AlertCircle,
  User,
  Briefcase,
  Calendar,
  Video,
  Phone,
  Users,
  ChevronRight,
  X,
  UserPlus,
  Send,
  Clipboard,
  CalendarCheck,
  Plus
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useGetScreeningsQuery } from "../data";
import { useCreateTrainingAssignmentMutation } from "../../training/data";
import { SCREENING_MODE, SCREENING_DECISION } from "../../types";
import { cn } from "@/lib/utils";
import { AssignToTrainerDialog } from "../../training/components/AssignToTrainerDialog";
import { ConfirmationDialog } from "@/components/ui";
import { Textarea } from "@/components/ui/textarea";
import { useAssignToMainScreeningMutation } from "../data";
import { useSendForVerificationMutation } from "@/features/projects/api";
import InterviewHistory from "@/components/molecules/InterviewHistory";
import { useGetCandidateProjectHistoryQuery } from "../data";

export default function ScreeningsListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentUser = useAppSelector((state) => state.auth.user);

  const [filters, setFilters] = useState({
    search: "",
    mode: "all",
    decision: "all",
    status: "all", // upcoming, completed, all
  });

  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(
    null
  );
  const [assignToTrainerOpen, setAssignToTrainerOpen] = useState(false);
  const [selectedInterviewForTraining, setSelectedInterviewForTraining] =
    useState<any>(null);
  const [sendForInterviewConfirm, setSendForInterviewConfirm] = useState<{
    isOpen: boolean;
    candidateId?: string;
    candidateName?: string;
    projectId?: string;
    screeningId?: string;
    notes?: string;
    projectName?: string;
    projectRole?: string;
    scheduledTime?: string;
    overallRating?: number;
    decision?: string;
  }>({ isOpen: false, candidateId: undefined, candidateName: undefined, projectId: undefined, screeningId: undefined, notes: "" });

  const [sendForVerificationConfirm, setSendForVerificationConfirm] = useState<{
    isOpen: boolean;
    candidateId?: string;
    projectId?: string;
    screeningId?: string;
    notes?: string;
    roleId?: string;
    projectName?: string;
    projectRole?: string;
  }>({ isOpen: false, candidateId: undefined, projectId: undefined, screeningId: undefined, notes: "", roleId: undefined });

  const [assignToMainScreening, { isLoading: isAssigningMain }] = useAssignToMainScreeningMutation();
  const [sendForVerification, { isLoading: isSendingVerification }] = useSendForVerificationMutation();

  // Build query params from URL (coordinatorId, candidateProjectMapId, decision, etc.)
  const rawParams = {
    coordinatorId: searchParams.get("coordinatorId") || undefined,
    candidateProjectMapId:
      searchParams.get("candidateProjectMapId") || undefined,
    decision: searchParams.get("decision") || undefined,
    mode: searchParams.get("mode") || undefined,
    scheduledDate: searchParams.get("scheduledDate") || undefined,
    conductedDate: searchParams.get("conductedDate") || undefined,
  };
  // Remove undefined fields so we don't send empty keys
  const apiParams = Object.fromEntries(
    Object.entries(rawParams).filter(([, v]) => v != null)
  );

  const { data, isLoading, error, refetch } = useGetScreeningsQuery(
    Object.keys(apiParams).length ? (apiParams as any) : undefined
  );
  const [createTrainingAssignment, { isLoading: isCreatingTraining }] =
    useCreateTrainingAssignmentMutation();
  // Backend returns array directly or wrapped in { data: [...] }
  const interviews = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data)
    ? data
    : [];

  // Filter interviews
  const { upcomingInterviews, completedInterviews, allInterviews } =
    useMemo(() => {
      let filtered = interviews;

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(
          (i) =>
            i.candidateProjectMap?.candidate?.firstName
              ?.toLowerCase()
              .includes(searchLower) ||
            i.candidateProjectMap?.candidate?.lastName
              ?.toLowerCase()
              .includes(searchLower) ||
            i.candidateProjectMap?.project?.title
              ?.toLowerCase()
              .includes(searchLower) ||
            i.candidateProjectMap?.roleNeeded?.designation
              ?.toLowerCase()
              .includes(searchLower)
        );
      }

      // Mode filter
      if (filters.mode && filters.mode !== "all") {
        filtered = filtered.filter((i) => i.mode === filters.mode);
      }

      // Decision filter
      if (filters.decision && filters.decision !== "all") {
        filtered = filtered.filter((i) => i.decision === filters.decision);
      }

      const upcoming = filtered
        .filter((i) => i.scheduledTime && !i.conductedAt)
        .sort(
          (a, b) =>
            new Date(a.scheduledTime!).getTime() -
            new Date(b.scheduledTime!).getTime()
        );

      const completed = filtered
        .filter((i) => i.conductedAt)
        .sort(
          (a, b) =>
            new Date(b.conductedAt!).getTime() -
            new Date(a.conductedAt!).getTime()
        );

      return {
        upcomingInterviews: upcoming,
        completedInterviews: completed,
        allInterviews: [...upcoming, ...completed],
      };
    }, [interviews, filters]);

  const displayedInterviews =
    filters.status === "upcoming"
      ? upcomingInterviews
      : filters.status === "completed"
      ? completedInterviews
      : allInterviews;

  // Auto-select first interview
  const selectedInterview = useMemo(() => {
    if (selectedInterviewId) {
      return displayedInterviews.find((i) => i.id === selectedInterviewId);
    }
    return displayedInterviews[0];
  }, [displayedInterviews, selectedInterviewId]);

  // Load interview history for the selected interview's candidate-project
  const { data: historyData, isLoading: isLoadingHistory } = useGetCandidateProjectHistoryQuery(
    selectedInterview?.candidateProjectMap?.id
      ? { candidateProjectMapId: selectedInterview.candidateProjectMap.id, page: 1, limit: 20 }
      : undefined,
    { skip: !selectedInterview?.candidateProjectMap?.id }
  );

  const stats = useMemo(() => {
    const needsTraining = interviews.filter(
      (i) => i.decision === SCREENING_DECISION.NEEDS_TRAINING
    ).length;
    const completed = interviews.filter((i) => i.conductedAt).length;
    const approved = interviews.filter(
      (i) => i.decision === SCREENING_DECISION.APPROVED
    ).length;
    return { needsTraining, completed, approved };
  }, [interviews]);

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case SCREENING_MODE.VIDEO:
        return Video;
      case SCREENING_MODE.PHONE:
        return Phone;
      case SCREENING_MODE.IN_PERSON:
        return Users;
      default:
        return ClipboardCheck;
    }
  };

  const getAssignedTrainerName = (interview: any) => {
    // Try several possible places where trainer info might be present
    // depending on API shape: sessions[0].trainer, trainingAssignment.trainer,
    // trainingAssignment.assignedToUser?.name, fallback to assignedByUser if needed
    const ta = interview.trainingAssignment;
    const sessionTrainer = ta?.sessions && ta.sessions.length ? ta.sessions[0].trainer : undefined;
    const trainerFromAssignment = ta?.trainer || sessionTrainer;
    const assignedToUserName = (ta as any)?.assignedToUser?.name;
    const assignedByName = (ta as any)?.assignedByUser?.name;

    return (
      trainerFromAssignment || assignedToUserName || assignedByName || undefined
    );
  };

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
            Needs Training
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

  // Mode filter options (UI for mode filter not currently rendered)

  const decisionOptions = [
    { value: "all", label: "All Decisions" },
    { value: SCREENING_DECISION.APPROVED, label: "Approved" },
    { value: SCREENING_DECISION.NEEDS_TRAINING, label: "Needs Training" },
    { value: SCREENING_DECISION.REJECTED, label: "Rejected" },
  ];

  // Status filter options (UI for status filter not currently rendered)

  const handleAssignToTrainer = (interview: any) => {
    setSelectedInterviewForTraining(interview);
    setAssignToTrainerOpen(true);
  };
  const handleSubmitTraining = async (formData: any) => {
    if (!selectedInterviewForTraining) return;

    if (!currentUser?.id) {
      toast.error("User not authenticated");
      return;
    }

    try {
      await createTrainingAssignment({
        candidateProjectMapId:
          selectedInterviewForTraining.candidateProjectMapId,
        screeningId: selectedInterviewForTraining.id,
        assignedBy: currentUser.id,
        trainingType: formData.trainingType,
        focusAreas: formData.focusAreas,
        priority: formData.priority,
        targetCompletionDate: formData.targetCompletionDate || undefined,
        notes: formData.notes,
      }).unwrap();

      // Refresh the interviews list so the UI reflects the new training assignment
      // (backend will typically update the interview/candidate substatus)
      try {
        refetch?.();
      } catch (e) {
        // ignore
      }

      toast.success("Training assigned successfully!");
      setAssignToTrainerOpen(false);
      setSelectedInterviewForTraining(null);
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to assign training");
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
            Failed to load interviews. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Page Title */}
     <div className="px-6 py-5 border-b bg-gradient-to-r from-indigo-50/80 via-purple-50/80 to-pink-50/80 backdrop-blur-xl shadow-sm sticky top-0 z-20">
  <div className="flex items-center justify-between max-w-7xl mx-auto">
    {/* Logo + Title */}
    <div className="flex items-center gap-4">
      <div className="relative group">
        {/* Modern 2025 Aurora Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#6366f1] via-[#a855f7] to-[#ec4899] rounded-xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500 animate-pulse-slow"></div>
        {/* Icon container */}
        <div className="relative p-3.5 bg-gradient-to-br from-[#4f46e5] via-[#7c3aed] to-[#db2777] rounded-xl shadow-2xl transform transition-transform duration-300 group-hover:scale-105">
          <Clipboard className="h-7 w-7 text-white drop-shadow-md" />
        </div>
      </div>

      <div className="space-y-0.5">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-[#6366f1] via-[#a855f7] to-[#ec4899] bg-clip-text text-transparent tracking-tight leading-none">
          Screenings
        </h1>
        <p className="text-sm text-slate-600 font-medium">
          Manage and track candidate screening sessions
        </p>
      </div>
    </div>

    {/* Optional: Add a subtle call-to-action or indicator if needed */}
    <div className="text-sm font-medium text-indigo-600/80 flex items-center gap-2">
      <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
      Active Sessions
    </div>
  </div>
</div>

      {/* Search & Filters Section */}
     <div className="w-full mx-auto pt-3 pb-5 px-4 max-w-7xl">
  <Card className="border-0 shadow-2xl bg-white/75 backdrop-blur-2xl rounded-2xl ring-1 ring-indigo-200/30 overflow-hidden">
    <CardContent className="p-6">
      <div className="space-y-5">
        {/* Premium Search Bar */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10 transition-all duration-300">
            <div className="p-2 rounded-full bg-gradient-to-r from-indigo-100/80 to-purple-100/80 group-focus-within:from-indigo-200/80 group-focus-within:to-purple-200/80 transition-all duration-300 shadow-sm">
              <Search className="h-5 w-5 text-indigo-600 transition-transform duration-300 group-focus-within:scale-110" />
            </div>
          </div>
          <Input
            placeholder="Search candidates, projects, roles..."
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-16 h-12 text-base rounded-2xl border-indigo-200/50 bg-white/90 shadow-inner hover:shadow-xl focus:shadow-2xl transition-all duration-300 focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 placeholder:text-slate-400"
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full hover:bg-indigo-50"
              onClick={() => handleSearch("")}
            >
              <X className="h-4 w-4 text-slate-500" />
            </Button>
          )}
        </div>

        {/* Filters Row - Modern & Compact */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Decision Filter - Premium */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-slate-700 tracking-wide">Decision</span>
            </div>
            <Select
              value={filters.decision}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, decision: value }))}
            >
              <SelectTrigger className="h-11 px-5 border-indigo-200/50 bg-white/90 rounded-xl shadow-inner hover:shadow-md focus:ring-2 focus:ring-indigo-400/30 transition-all min-w-[160px]">
                <SelectValue placeholder="All Decisions" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-indigo-200/50 shadow-2xl bg-white/95 backdrop-blur-lg">
                {decisionOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="rounded-xl hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters Button */}
          {(filters.search ||
            filters.mode !== "all" ||
            filters.decision !== "all" ||
            filters.status !== "all") && (
            <Button
              variant="outline"
              size="sm"
              className="h-11 px-5 rounded-xl border-indigo-300 hover:bg-gradient-to-r hover:from-red-50 hover:to-rose-50 hover:text-red-700 transition-all duration-300 shadow-sm hover:shadow-md"
              onClick={() =>
                setFilters({
                  search: "",
                  mode: "all",
                  decision: "all",
                  status: "all",
                })
              }
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
</div>

      {/* Master-Detail Layout */}
      <div className="flex-1 flex overflow-hidden px-4">
        {/* Left Panel - Interview List */}
       <Card className="w-96 border-r border-0 shadow-2xl bg-white/80 backdrop-blur-2xl rounded-2xl overflow-hidden flex flex-col ring-1 ring-indigo-200/30">
  <CardHeader className="pb-3 border-b bg-gradient-to-r from-white to-indigo-50/40">
    <div className="flex items-center justify-between">
      <div>
        <CardTitle className="text-xl font-bold text-slate-800 tracking-tight">
          Screenings
        </CardTitle>
        <CardDescription className="text-sm text-slate-600 mt-1">
          {displayedInterviews.length} interview{displayedInterviews.length !== 1 ? "s" : ""} found
        </CardDescription>
      </div>

      {/* Premium Compact Stats */}
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-xl font-extrabold bg-gradient-to-br from-orange-600 to-amber-600 bg-clip-text text-transparent">
            {stats.needsTraining}
          </div>
          <div className="text-xs text-slate-500 font-medium">Training</div>
        </div>
        <Separator orientation="vertical" className="h-8 opacity-50" />
        <div className="text-center">
          <div className="text-xl font-extrabold bg-gradient-to-br from-green-600 to-emerald-600 bg-clip-text text-transparent">
            {stats.approved}
          </div>
          <div className="text-xs text-slate-500 font-medium">Approved</div>
        </div>
        <Separator orientation="vertical" className="h-8 opacity-50" />
        <div className="text-center">
          <div className="text-xl font-extrabold bg-gradient-to-br from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {stats.completed}
          </div>
          <div className="text-xs text-slate-500 font-medium">Done</div>
        </div>
      </div>
    </div>
  </CardHeader>

  <CardContent className="p-0 flex-1 overflow-hidden">
    <ScrollArea className="h-full px-3 py-2">
      {displayedInterviews.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-10 text-slate-500">
          <ClipboardCheck className="h-16 w-16 text-indigo-300/70 mb-4" />
          <p className="text-lg font-medium text-slate-700">No interviews found</p>
          <p className="text-sm mt-2 max-w-xs">
            {filters.search || filters.mode !== "all" || filters.decision !== "all" || filters.status !== "all"
              ? "Try adjusting your filters"
              : "Screenings will appear here once scheduled"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedInterviews.map((interview: any) => {
            const candidate = interview.candidateProjectMap?.candidate;
            const role = interview.candidateProjectMap?.roleNeeded;
            const ModeIcon = getModeIcon(interview.mode);

            const explicitVerificationRequired =
              interview.isDocumentVerificationRequired ||
              interview.candidateProjectMap?.isDocumentVerificationRequired;

            const verificationInProgress =
              !!interview.candidateProjectMap?.subStatus?.name?.includes("verification") ||
              interview.candidateProjectMap?.mainStatus?.name === "documents";

            const _docVerified =
              !!interview.isDocumentVerified ||
              !!interview.candidateProjectMap?.isDocumentVerified;

            const isSelected = interview.id === (selectedInterview?.id || displayedInterviews[0]?.id);
            const isCompleted = !!interview.conductedAt;
            const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown Candidate";

            return (
              <button
                key={interview.id}
                onClick={() => setSelectedInterviewId(interview.id)}
                className={cn(
                  "w-full text-left p-4 rounded-xl border transition-all duration-300 group relative overflow-hidden",
                  isSelected
                    ? "bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-400/50 shadow-lg ring-2 ring-indigo-300/30"
                    : "bg-white border-slate-200/70 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-100/50"
                )}
              >
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/5 group-hover:to-purple-500/5 transition-opacity duration-500" />

                <div className="relative flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base text-slate-900 truncate group-hover:text-indigo-700 transition-colors">
                      {candidateName}
                    </p>
                    <p className="text-sm text-slate-500 truncate mt-0.5">
                      {role?.designation || "Unknown Role"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(() => {
                      const isTrainingAssigned = interview.candidateProjectMap?.subStatus?.name === "training_assigned";
                      const trainerName = getAssignedTrainerName(interview);
                      const isMainAssigned = interview.status === "assigned" || !!interview.candidateProjectMap?.mainInterviewId;

                      if (isTrainingAssigned) {
                        return (
                          <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/50 dark:text-green-300">
                            {trainerName ? `Trainer: ${trainerName}` : "Training Assigned"}
                          </Badge>
                        );
                      }

                      if (isMainAssigned) {
                        return (
                          <div className="flex items-center gap-2">
                            <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/50 dark:text-green-300">
                              Assigned to Main Interview
                            </Badge>
                            {(interview.decision === SCREENING_DECISION.NEEDS_TRAINING ||
                              interview.decision === SCREENING_DECISION.REJECTED) && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-lg hover:bg-indigo-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAssignToTrainer(interview);
                                }}
                                title="Assign to Trainer"
                              >
                                <UserPlus className="h-4 w-4 text-indigo-600" />
                              </Button>
                            )}
                          </div>
                        );
                      }

                      if (_docVerified && interview.decision === SCREENING_DECISION.APPROVED && interview.status === "completed") {
                        return (
                          <div className="flex items-center gap-2">
                            <Badge className="text-xs bg-green-100 text-green-700">Document Verified</Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-lg hover:bg-indigo-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSendForInterviewConfirm({
                                  isOpen: true,
                                  candidateId: interview.candidateProjectMap?.candidate?.id,
                                  candidateName,
                                  projectId: interview.candidateProjectMap?.project?.id,
                                  projectName: interview.candidateProjectMap?.project?.title,
                                  projectRole: interview.candidateProjectMap?.roleNeeded?.designation,
                                  scheduledTime: interview.scheduledTime,
                                  overallRating: interview.overallRating,
                                  decision: interview.decision,
                                  screeningId: interview.id,
                                  notes: "",
                                });
                              }}
                              title="Assign Main Interview"
                            >
                              <Send className="h-4 w-4 text-indigo-600" />
                            </Button>
                          </div>
                        );
                      }

                      if (explicitVerificationRequired && !_docVerified && interview.decision === SCREENING_DECISION.APPROVED && interview.status === "completed") {
                        return (
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-lg hover:bg-amber-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSendForVerificationConfirm({
                                  isOpen: true,
                                  candidateId: interview.candidateProjectMap?.candidate?.id,
                                  projectId: interview.candidateProjectMap?.project?.id,
                                  screeningId: interview.id,
                                  projectName: interview.candidateProjectMap?.project?.title,
                                  projectRole: interview.candidateProjectMap?.roleNeeded?.designation,
                                  notes: "",
                                  roleId: interview.candidateProjectMap?.roleNeededId,
                                });
                              }}
                              title="Send for Verification"
                            >
                              <ClipboardCheck className="h-4 w-4 text-amber-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-lg opacity-50 cursor-not-allowed"
                              disabled
                              title="Assign Main Interview (disabled until verification complete)"
                            >
                              <Send className="h-4 w-4 text-slate-400" />
                            </Button>
                          </div>
                        );
                      }

                      if (verificationInProgress && !_docVerified && interview.decision === SCREENING_DECISION.APPROVED && interview.status === "completed") {
                        return (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-lg opacity-50 cursor-not-allowed"
                            disabled
                            title="Assign Main Interview (disabled until verification complete)"
                          >
                            <Send className="h-4 w-4 text-slate-400" />
                          </Button>
                        );
                      }

                      if (interview.decision === SCREENING_DECISION.APPROVED && interview.status === "completed") {
                        return (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-lg hover:bg-indigo-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSendForInterviewConfirm({
                                isOpen: true,
                                candidateId: interview.candidateProjectMap?.candidate?.id,
                                candidateName,
                                projectId: interview.candidateProjectMap?.project?.id,
                                projectName: interview.candidateProjectMap?.project?.title,
                                projectRole: interview.candidateProjectMap?.roleNeeded?.designation,
                                scheduledTime: interview.scheduledTime,
                                overallRating: interview.overallRating,
                                decision: interview.decision,
                                screeningId: interview.id,
                                notes: "",
                              });
                            }}
                            title="Assign Main Interview"
                          >
                            <Send className="h-4 w-4 text-indigo-600" />
                          </Button>
                        );
                      }

                      if (interview.decision === SCREENING_DECISION.NEEDS_TRAINING || interview.decision === SCREENING_DECISION.REJECTED) {
                        return (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-lg hover:bg-indigo-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssignToTrainer(interview);
                            }}
                            title="Assign to Trainer"
                          >
                            <UserPlus className="h-4 w-4 text-indigo-600" />
                          </Button>
                        );
                      }

                      return null;
                    })()}
                    <ChevronRight
                      className={cn(
                        "h-5 w-5 transition-all duration-300",
                        isSelected ? "text-indigo-600 translate-x-1 scale-110" : "text-slate-400 group-hover:text-slate-600"
                      )}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium shadow-sm",
                      isCompleted ? "bg-green-100 text-green-800" : "bg-indigo-100 text-indigo-800"
                    )}
                  >
                    <ModeIcon className="h-3.5 w-3.5" />
                    <span className="capitalize">{interview.mode.replace("_", " ")}</span>
                  </div>
                  {interview.decision && getDecisionBadge(interview.decision)}
                  {verificationInProgress && !_docVerified && (
                    <Badge className="text-xs bg-amber-100 text-amber-700">Verification in progress</Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {interview.scheduledTime
                      ? format(new Date(interview.scheduledTime), "MMM d, yyyy")
                      : "Not scheduled"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </ScrollArea>
  </CardContent>
</Card> 

        {/* Right Panel - Interview Details */}
        <div className="flex-1 overflow-hidden bg-gradient-to-b from-white to-indigo-50/20 min-w-0 min-h-0">
  {selectedInterview ? (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Premium Header */}
        <div className="flex items-start justify-between gap-6 pb-6 border-b border-indigo-200/50">
          <div className="space-y-2 flex-1 min-w-0">
            <h2 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent truncate">
              Screening Details
            </h2>
            <p className="text-base text-slate-600 font-medium">
              {selectedInterview.scheduledTime
                ? `Scheduled for ${format(new Date(selectedInterview.scheduledTime), "MMMM d, yyyy 'at' h:mm a")}`
                : "Not scheduled yet"}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {!selectedInterview.conductedAt && (
              <Button
                size="lg"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl shadow-lg px-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
                onClick={() => navigate(`/screenings/${selectedInterview.id}/conduct`)}
              >
                <CalendarCheck className="h-4 w-4 mr-2" />
                Conduct Interview
              </Button>
            )}

            {(() => {
              const isTrainingAssigned =
                selectedInterview.candidateProjectMap?.subStatus?.name ===
                "training_assigned";
              const trainerName = getAssignedTrainerName(selectedInterview);
              const isMainAssigned =
                selectedInterview.status === "assigned" ||
                !!selectedInterview.candidateProjectMap?.mainInterviewId;

              if (isTrainingAssigned) {
                return (
                  <Badge className="text-base px-5 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 shadow-sm">
                    {trainerName ? `Trainer: ${trainerName}` : "Training Assigned"}
                  </Badge>
                );
              }

              if (isMainAssigned) {
                return (
                  <div className="flex items-center gap-3">
                    <Badge className="text-base px-5 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 shadow-sm">
                      Assigned to Main Interview
                    </Badge>
                    {(selectedInterview.decision === SCREENING_DECISION.NEEDS_TRAINING ||
                      selectedInterview.decision === SCREENING_DECISION.REJECTED) && (
                      <Button
                        size="lg"
                        variant="outline"
                        className="rounded-xl border-indigo-300 hover:bg-indigo-50 hover:shadow-md transition-all duration-300"
                        onClick={() => handleAssignToTrainer(selectedInterview)}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Assign to Trainer
                      </Button>
                    )}
                  </div>
                );
              }

              const selected_explicitVerificationRequired =
                selectedInterview.isDocumentVerificationRequired ||
                selectedInterview.candidateProjectMap?.isDocumentVerificationRequired;

              const selected_verificationInProgress =
                !!selectedInterview.candidateProjectMap?.subStatus?.name?.includes("verification") ||
                selectedInterview.candidateProjectMap?.mainStatus?.name === "documents";

              const selected_docVerified =
                !!selectedInterview.isDocumentVerified ||
                !!selectedInterview.candidateProjectMap?.isDocumentVerified;

              if (
                selected_docVerified &&
                selectedInterview.decision === SCREENING_DECISION.APPROVED &&
                selectedInterview.status === "completed"
              ) {
                return (
                  <div className="flex items-center gap-3">
                    <Badge className="text-base px-5 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 shadow-sm">
                      Document Verified
                    </Badge>
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl shadow-lg px-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
                      onClick={() =>
                        setSendForInterviewConfirm({
                          isOpen: true,
                          candidateId:
                            selectedInterview.candidateProjectMap?.candidate?.id,
                          candidateName:
                            selectedInterview.candidateProjectMap?.candidate?.firstName +
                            " " +
                            selectedInterview.candidateProjectMap?.candidate?.lastName,
                          projectId:
                            selectedInterview.candidateProjectMap?.project?.id,
                          projectName: selectedInterview.candidateProjectMap?.project?.title,
                          projectRole: selectedInterview.candidateProjectMap?.roleNeeded?.designation,
                          scheduledTime: selectedInterview.scheduledTime,
                          overallRating: selectedInterview.overallRating,
                          decision: selectedInterview.decision,
                          screeningId: selectedInterview.id,
                          notes: "",
                        })
                      }
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Assign Main Interview
                    </Button>
                  </div>
                );
              }

              if (
                selected_explicitVerificationRequired &&
                !selected_docVerified &&
                selectedInterview.decision === SCREENING_DECISION.APPROVED &&
                selectedInterview.status === "completed"
              ) {
                return (
                  <div className="flex items-center gap-3">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl shadow-lg px-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
                      onClick={() =>
                        setSendForVerificationConfirm({
                          isOpen: true,
                          candidateId:
                            selectedInterview.candidateProjectMap?.candidate?.id,
                          projectId:
                            selectedInterview.candidateProjectMap?.project?.id,
                          screeningId: selectedInterview.id,
                          projectName: selectedInterview.candidateProjectMap?.project?.title,
                          projectRole: selectedInterview.candidateProjectMap?.roleNeeded?.designation,
                          notes: "",
                          roleId: selectedInterview.candidateProjectMap?.roleNeededId,
                        })
                      }
                    >
                      <ClipboardCheck className="h-4 w-4 mr-2" />
                      Send for Verification
                    </Button>

                    <Button
                      size="lg"
                      variant="outline"
                      className="opacity-60 cursor-not-allowed rounded-xl border-amber-300"
                      disabled
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Assign Main Interview
                    </Button>
                  </div>
                );
              }

              if (
                selected_verificationInProgress &&
                !selected_docVerified &&
                selectedInterview.decision === SCREENING_DECISION.APPROVED &&
                selectedInterview.status === "completed"
              ) {
                return (
                  <div className="flex items-center gap-3">
                    <Badge className="text-base px-5 py-1.5 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 shadow-sm">
                      Document Verification in progress
                    </Badge>
                    <Button
                      size="lg"
                      variant="outline"
                      className="opacity-60 cursor-not-allowed rounded-xl border-amber-300"
                      disabled
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Assign Main Interview
                    </Button>
                  </div>
                );
              }

              if (
                selectedInterview.decision === SCREENING_DECISION.APPROVED &&
                selectedInterview.status === "completed"
              ) {
                return (
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl shadow-lg px-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
                    onClick={() =>
                      setSendForInterviewConfirm({
                        isOpen: true,
                        candidateId:
                          selectedInterview.candidateProjectMap?.candidate?.id,
                        candidateName:
                          selectedInterview.candidateProjectMap?.candidate?.firstName +
                          " " +
                          selectedInterview.candidateProjectMap?.candidate?.lastName,
                        projectId:
                          selectedInterview.candidateProjectMap?.project?.id,
                        projectName: selectedInterview.candidateProjectMap?.project?.title,
                        projectRole: selectedInterview.candidateProjectMap?.roleNeeded?.designation,
                        scheduledTime: selectedInterview.scheduledTime,
                        overallRating: selectedInterview.overallRating,
                        decision: selectedInterview.decision,
                        screeningId: selectedInterview.id,
                        notes: "",
                      })
                    }
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Assign Main Interview
                  </Button>
                );
              }

              if (
                selectedInterview.decision ===
                  SCREENING_DECISION.NEEDS_TRAINING ||
                selectedInterview.decision ===
                  SCREENING_DECISION.REJECTED
              ) {
                return (
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-xl border-indigo-300 hover:bg-indigo-50 hover:shadow-md transition-all duration-300"
                    onClick={() => handleAssignToTrainer(selectedInterview)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign to Trainer
                  </Button>
                );
              }

              return null;
            })()}
          </div>
        </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Candidate Info */}
                 <Card className="border-0 shadow-xl bg-gradient-to-br from-indigo-50/80 to-purple-50/80 rounded-2xl overflow-hidden">
            <CardContent className="p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-indigo-700">
                <User className="h-5 w-5" />
                Candidate Information
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Name</p>
                  <p className="font-medium text-slate-900">
                    {selectedInterview.candidateProjectMap?.candidate?.firstName || ""}{" "}
                    {selectedInterview.candidateProjectMap?.candidate?.lastName || ""}
                  </p>
                </div>
                {selectedInterview.candidateProjectMap?.candidate?.email && (
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Email</p>
                    <p className="font-medium text-slate-900 break-all">
                      {selectedInterview.candidateProjectMap?.candidate?.email}
                    </p>
                  </div>
                )}
                {selectedInterview.candidateProjectMap?.candidate?.phone && (
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Phone</p>
                    <p className="font-medium text-slate-900">
                      {selectedInterview.candidateProjectMap?.candidate?.phone}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Project & Role */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50/80 to-pink-50/80 rounded-2xl overflow-hidden">
            <CardContent className="p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-purple-700">
                <Briefcase className="h-5 w-5" />
                Project & Role
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Project</p>
                  <p className="font-medium text-slate-900">
                    {selectedInterview.candidateProjectMap?.project?.title || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Role</p>
                  <p className="font-medium text-slate-900">
                    {selectedInterview.candidateProjectMap?.roleNeeded?.designation || "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Interview Details */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-indigo-50/80 to-purple-50/80 rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-indigo-700 mb-4">Interview Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
              <div>
                <p className="text-xs text-slate-500 mb-1">Mode</p>
                <p className="font-medium capitalize text-slate-900">
                  {selectedInterview.mode.replace("_", " ")}
                </p>
              </div>

              {selectedInterview.conductedAt && (
                <>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Conducted At</p>
                    <p className="font-medium text-slate-900">
                      {format(new Date(selectedInterview.conductedAt), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Decision</p>
                    <div>{getDecisionBadge(selectedInterview.decision)}</div>
                  </div>
                  {selectedInterview.overallRating != null && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Overall Score</p>
                      <p className="font-bold text-lg text-indigo-700">
                        {selectedInterview.overallRating}%
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {selectedInterview.notes && (
              <div className="mt-6 pt-6 border-t border-indigo-200/50">
                <p className="text-xs text-slate-500 mb-2">Notes</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {selectedInterview.notes}
                </p>
              </div>
            )}

            {/* Checklist Items */}
            {Array.isArray(selectedInterview.checklistItems) &&
              selectedInterview.checklistItems.length > 0 && (
                <div className="mt-6 pt-6 border-t border-indigo-200/50">
                  <h3 className="font-semibold text-lg text-indigo-700 mb-4">Checklist Evaluation</h3>
                  {(() => {
                    type ChecklistItem = NonNullable<
                      typeof selectedInterview.checklistItems
                    >[number];
                    const grouped = selectedInterview.checklistItems.reduce(
                      (acc: Record<string, ChecklistItem[]>, item: ChecklistItem) => {
                        const key = item.category || "misc";
                        (acc[key] ||= []).push(item);
                        return acc;
                      },
                      {}
                    );

                    return (
                      Object.entries(grouped) as [string, ChecklistItem[]][]
                    ).map(([category, items]) => (
                      <div key={category} className="mb-5">
                        <div className="text-sm font-medium text-indigo-600 mb-3 capitalize">
                          {category.replace(/_/g, " ")}
                        </div>
                        <div className="space-y-3">
                          {items.map((ci: ChecklistItem) => (
                            <div
                              key={ci.id}
                              className="flex items-start justify-between rounded-xl border bg-white/80 p-4 shadow-sm hover:shadow-md transition-shadow"
                            >
                              <div className="pr-4 flex-1">
                                <div className="text-sm font-medium text-slate-900">
                                  {ci.criterion}
                                </div>
                                {ci.notes && (
                                  <div className="text-xs text-slate-500 mt-1">
                                    {ci.notes}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <div className="text-right">
                                  <div className="font-semibold text-indigo-700">
                                    {ci.score != null ? `${ci.score}%` : "—"}
                                  </div>
                                  <div className="text-xs text-slate-500">Score</div>
                                </div>

                                <Badge
                                  variant={ci.passed ? "default" : "destructive"}
                                  className="text-xs px-3 py-1"
                                >
                                  {ci.passed ? "Passed" : "Failed"}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
          </CardContent>
        </Card>

                {/* Interview History (bottom) */}
                {selectedInterview?.candidateProjectMap?.id && (
                      <InterviewHistory items={historyData?.data?.items} isLoading={isLoadingHistory} />
                )}
              </div>
            </ScrollArea>
          ) : (
           <div className="h-full flex items-center justify-center text-center bg-gradient-to-b from-white to-indigo-50/20">
  <div className="space-y-5 max-w-md">
    {/* Premium Empty State Icon */}
    <div className="relative mx-auto">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full blur-2xl opacity-30 animate-pulse-slow"></div>
      <ClipboardCheck className="h-24 w-24 text-indigo-500/70 mx-auto relative z-10" />
    </div>

    <h3 className="text-2xl font-semibold text-slate-700 tracking-tight">
      No Interview Selected
    </h3>
    <p className="text-base text-slate-500 leading-relaxed">
      Select an interview from the list on the left to view detailed information, conduct the screening, or assign next steps.
    </p>

    {/* Subtle CTA Button */}
   
  </div>
</div>
          )}
        </div>
      </div>

      {/* Assign to Trainer Dialog */}
      <AssignToTrainerDialog
        open={assignToTrainerOpen}
        onOpenChange={setAssignToTrainerOpen}
        onSubmit={handleSubmitTraining}
        isLoading={isCreatingTraining}
        candidateName={
          selectedInterviewForTraining?.candidateProjectMap?.candidate
            ? `${selectedInterviewForTraining.candidateProjectMap.candidate.firstName} ${selectedInterviewForTraining.candidateProjectMap.candidate.lastName}`
            : undefined
        }
        screeningId={selectedInterviewForTraining?.id}
      />

      {/* Send For Verification Confirmation (Document Verification) */}
      <ConfirmationDialog
        isOpen={sendForVerificationConfirm.isOpen}
        onClose={() =>
          setSendForVerificationConfirm((s) => ({ ...s, isOpen: false }))
        }
        title={
          sendForVerificationConfirm.projectName
            ? `Send ${sendForVerificationConfirm.projectName} candidate for verification`
            : "Send for Document Verification"
        }
        description={
          <div className="space-y-3">
            {sendForVerificationConfirm.projectName && (
              <div className="space-y-2">
                <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-blue-600 font-medium">Project</div>
                  <div className="font-semibold text-sm">{sendForVerificationConfirm.projectName}</div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-purple-50 border border-purple-200 rounded-md px-2 py-1.5">
                    <div className="text-[9px] uppercase text-purple-600 font-medium mb-0.5">Role</div>
                    <div className="font-semibold text-purple-900">{sendForVerificationConfirm.projectRole || "—"}</div>
                  </div>
                  <div className="col-span-2">
                    {/* Role selector - defaults to provided role id */}
                    <div className="text-xs font-medium mb-1.5">Select Role</div>
                    <Select
                      value={sendForVerificationConfirm.roleId}
                      onValueChange={(value) => setSendForVerificationConfirm((s) => ({ ...s, roleId: value }))}
                    >
                      <SelectTrigger className="h-10 rounded-md">
                        <SelectValue placeholder={sendForVerificationConfirm.projectRole || "Select role"} />
                      </SelectTrigger>
                      <SelectContent>
                        {/* If role info exists include it as a single option. Expand later when API provides roles list. */}
                        {sendForVerificationConfirm.roleId && (
                          <SelectItem value={sendForVerificationConfirm.roleId}>{sendForVerificationConfirm.projectRole || sendForVerificationConfirm.roleId}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Notes (optional)</label>
              <Textarea
                value={sendForVerificationConfirm.notes}
                onChange={(e) =>
                  setSendForVerificationConfirm((s) => ({ ...s, notes: e.target.value }))
                }
                placeholder="Add notes for verification team..."
                rows={3}
                className="text-sm"
              />
            </div>
          </div>
        }
        confirmText={isSendingVerification ? "Sending..." : "Send for verification"}
        cancelText="Cancel"
        isLoading={isSendingVerification}
        onConfirm={async () => {
          if (!sendForVerificationConfirm.projectId || !sendForVerificationConfirm.candidateId) {
            toast.error("Missing candidate or project information");
            return;
          }

          if (!sendForVerificationConfirm.roleId) {
            toast.error("Please select a role");
            return;
          }

          try {
            await sendForVerification({
              projectId: sendForVerificationConfirm.projectId!,
              candidateId: sendForVerificationConfirm.candidateId!,
              roleNeededId: sendForVerificationConfirm.roleId,
              recruiterId: currentUser?.id,
              notes: sendForVerificationConfirm.notes,
            }).unwrap();
            toast.success("Candidate sent for document verification");
            setSendForVerificationConfirm((s) => ({ ...s, isOpen: false }));
            try {
              refetch?.();
            } catch (e) {
              // ignore
            }
          } catch (error: any) {
            toast.error(error?.data?.message || "Failed to send candidate for verification");
          }
        }}
      />

      {/* Send For Interview Confirmation (Assign Main Interview) */}
      <ConfirmationDialog
        isOpen={sendForInterviewConfirm.isOpen}
        onClose={() =>
          setSendForInterviewConfirm((s) => ({ ...s, isOpen: false }))
        }
        title={
          sendForInterviewConfirm.candidateName
            ? `Assign ${sendForInterviewConfirm.candidateName} to Main Interview`
            : "Assign to Main Interview"
        }
        description={
          <div className="space-y-3">
              {sendForInterviewConfirm.projectName && (
                <div className="space-y-2">
                  {/* Project Name */}
                  <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-blue-600 font-medium">Project</div>
                    <div className="font-semibold text-sm">{sendForInterviewConfirm.projectName}</div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-purple-50 border border-purple-200 rounded-md px-2 py-1.5">
                      <div className="text-[9px] uppercase text-purple-600 font-medium mb-0.5">Role</div>
                      <div className="font-semibold text-purple-900">{sendForInterviewConfirm.projectRole || "—"}</div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1.5">
                      <div className="text-[9px] uppercase text-emerald-600 font-medium mb-0.5">Scheduled</div>
                      <div className="font-semibold text-emerald-900">
                        {sendForInterviewConfirm.scheduledTime 
                          ? format(new Date(sendForInterviewConfirm.scheduledTime), "MMM d, h:mm a") 
                          : 'Not scheduled'}
                      </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                      <div className="text-[9px] uppercase text-amber-600 font-medium mb-0.5">Result</div>
                      <div className="font-semibold text-amber-900 flex items-center gap-1 flex-wrap">
                        {sendForInterviewConfirm.decision && (
                          <Badge variant={
                            sendForInterviewConfirm.decision === SCREENING_DECISION.APPROVED ? "default" :
                            sendForInterviewConfirm.decision === SCREENING_DECISION.NEEDS_TRAINING ? "secondary" :
                            "destructive"
                          } className="text-[10px] h-4 px-1">
                            {sendForInterviewConfirm.decision.replace(/_/g, ' ')}
                          </Badge>
                        )}
                        {sendForInterviewConfirm.overallRating != null && <span className="text-xs">{sendForInterviewConfirm.overallRating}%</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Notes (optional)</label>
                <Textarea
                  value={sendForInterviewConfirm.notes}
                  onChange={(e) =>
                    setSendForInterviewConfirm((s) => ({ ...s, notes: e.target.value }))
                  }
                  placeholder="Add notes for the interviewer..."
                  rows={3}
                  className="text-sm"
                />
              </div>
          </div>
        }
        confirmText={isAssigningMain ? "Sending..." : "Send"}
        cancelText="Cancel"
        isLoading={isAssigningMain}
        onConfirm={async () => {
          if (!sendForInterviewConfirm.projectId || !sendForInterviewConfirm.candidateId) {
            toast.error("Missing candidate or project information");
            return;
          }

          try {
            await assignToMainScreening({
              projectId: sendForInterviewConfirm.projectId!,
              candidateId: sendForInterviewConfirm.candidateId!,
              screeningId: sendForInterviewConfirm.screeningId,
              notes: sendForInterviewConfirm.notes,
            }).unwrap();
            toast.success("Candidate sent for main interview");
            setSendForInterviewConfirm((s) => ({ ...s, isOpen: false }));
            try {
              refetch?.();
            } catch (e) {
              // ignore
            }
          } catch (error: any) {
            toast.error(error?.data?.message || "Failed to send candidate for interview");
          }
        }}
      />
    </div>
  );
}
