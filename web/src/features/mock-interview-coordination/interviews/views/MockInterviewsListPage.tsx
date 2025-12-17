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
} from "lucide-react";
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
import { useGetMockInterviewsQuery } from "../data";
import { useCreateTrainingAssignmentMutation } from "../../training/data";
import { MOCK_INTERVIEW_MODE, MOCK_INTERVIEW_DECISION } from "../../types";
import { cn } from "@/lib/utils";
import { AssignToTrainerDialog } from "../../training/components/AssignToTrainerDialog";
import { ConfirmationDialog } from "@/components/ui";
import { Textarea } from "@/components/ui/textarea";
import { useAssignToMainInterviewMutation } from "../data";
import InterviewHistory from "@/components/molecules/InterviewHistory";
import { useGetCandidateProjectHistoryQuery } from "../data";

export default function MockInterviewsListPage() {
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
    mockInterviewId?: string;
    notes?: string;
  }>({ isOpen: false, candidateId: undefined, candidateName: undefined, projectId: undefined, mockInterviewId: undefined, notes: "" });

  const [assignToMainInterview, { isLoading: isAssigningMain }] = useAssignToMainInterviewMutation();

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

  const { data, isLoading, error, refetch } = useGetMockInterviewsQuery(
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
      (i) => i.decision === MOCK_INTERVIEW_DECISION.NEEDS_TRAINING
    ).length;
    const completed = interviews.filter((i) => i.conductedAt).length;
    const approved = interviews.filter(
      (i) => i.decision === MOCK_INTERVIEW_DECISION.APPROVED
    ).length;
    return { needsTraining, completed, approved };
  }, [interviews]);

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case MOCK_INTERVIEW_MODE.VIDEO:
        return Video;
      case MOCK_INTERVIEW_MODE.PHONE:
        return Phone;
      case MOCK_INTERVIEW_MODE.IN_PERSON:
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
      case MOCK_INTERVIEW_DECISION.APPROVED:
        return (
          <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/50 dark:text-green-300">
            Approved
          </Badge>
        );
      case MOCK_INTERVIEW_DECISION.NEEDS_TRAINING:
        return (
          <Badge className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/50 dark:text-orange-300">
            Needs Training
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

  // Mode filter options (UI for mode filter not currently rendered)

  const decisionOptions = [
    { value: "all", label: "All Decisions" },
    { value: MOCK_INTERVIEW_DECISION.APPROVED, label: "Approved" },
    { value: MOCK_INTERVIEW_DECISION.NEEDS_TRAINING, label: "Needs Training" },
    { value: MOCK_INTERVIEW_DECISION.REJECTED, label: "Rejected" },
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
        mockInterviewId: selectedInterviewForTraining.id,
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
      <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Clipboard className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mock Interviews</h1>
            <p className="text-sm text-gray-600">Manage and track candidate mock interview sessions</p>
          </div>
        </div>
      </div>

      {/* Search & Filters Section */}
      <div className="w-full mx-auto pt-2 pb-4 px-4">
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent>
            <div className="space-y-6">
              {/* Premium Search Bar with Enhanced Styling */}
              <div className="relative group">
                <div
                  className={`absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-all duration-300 ${
                    filters.search ? "text-blue-600" : "text-gray-400"
                  }`}
                >
                  <Search
                    className={`h-5 w-5 transition-transform duration-300 ${
                      filters.search ? "scale-110" : "scale-100"
                    }`}
                  />
                </div>
                <Input
                  placeholder="Search candidates, projects, roles..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-14 h-14 text-base border-0 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 focus:from-white focus:to-white focus:ring-2 focus:ring-blue-500/30 focus:shadow-lg transition-all duration-300 rounded-2xl shadow-sm hover:shadow-md"
                />
                <div
                  className={`absolute inset-0 rounded-2xl transition-all duration-300 pointer-events-none ${
                    filters.search ? "ring-2 ring-blue-500/20" : ""
                  }`}
                />
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Decision Filter */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold text-gray-700 tracking-wide">
                      Decision
                    </span>
                  </div>
                  <Select
                    value={filters.decision}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, decision: value }))
                    }
                  >
                    <SelectTrigger className="h-11 px-4 border-0 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 focus:from-white focus:to-white focus:ring-2 focus:ring-blue-500/30 transition-all duration-300 rounded-xl shadow-sm hover:shadow-md min-w-[140px]">
                      <SelectValue placeholder="All Decisions" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
                      {decisionOptions.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="rounded-lg hover:bg-blue-50"
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
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setFilters({
                        search: "",
                        mode: "all",
                        decision: "all",
                        status: "all",
                      })
                    }
                    className="h-10 px-3 text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-300 rounded-lg shadow-sm hover:shadow-md gap-2 text-sm"
                  >
                    <X className="h-3 w-3" />
                    Clear
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
        <Card className="w-96 border-r border-0 shadow-lg bg-white/80 backdrop-blur-sm rounded-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-800">
                  Mock Interviews
                </CardTitle>
                <CardDescription>
                  {displayedInterviews.length} interview
                  {displayedInterviews.length !== 1 ? "s" : ""} found
                </CardDescription>
              </div>
              {/* Compact Stats */}
              <div className="flex items-center gap-2">
                <div className="text-center">
                  <div className="text-base font-bold text-orange-600">
                    {stats.needsTraining}
                  </div>
                  <div className="text-xs text-muted-foreground">Training</div>
                </div>
                <Separator orientation="vertical" className="h-6" />
                <div className="text-center">
                  <div className="text-base font-bold text-green-600">
                    {stats.approved}
                  </div>
                  <div className="text-xs text-muted-foreground">Approved</div>
                </div>
                <Separator orientation="vertical" className="h-6" />
                <div className="text-center">
                  <div className="text-base font-bold">{stats.completed}</div>
                  <div className="text-xs text-muted-foreground">Done</div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-full">
              {displayedInterviews.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm font-medium mb-1">
                    No interviews found
                  </p>
                  <p className="text-xs">
                    {filters.search ||
                    filters.mode !== "all" ||
                    filters.decision !== "all" ||
                    filters.status !== "all"
                      ? "Try adjusting your filters"
                      : "Interviews will appear here once scheduled"}
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {displayedInterviews.map((interview) => {
                    const candidate = interview.candidateProjectMap?.candidate;
                    const role = interview.candidateProjectMap?.roleNeeded;
                    const ModeIcon = getModeIcon(interview.mode);
                    const isSelected =
                      interview.id ===
                      (selectedInterview?.id || displayedInterviews[0]?.id);
                    const isCompleted = !!interview.conductedAt;

                    return (
                      <button
                        key={interview.id}
                        onClick={() => setSelectedInterviewId(interview.id)}
                        className={cn(
                          "w-full text-left p-2.5 rounded-lg border transition-all",
                          "hover:bg-accent/50",
                          isSelected
                            ? "bg-accent border-primary shadow-sm"
                            : "bg-card border-transparent"
                        )}
                      >
                        <div className="flex items-start justify-between mb-1.5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm truncate">
                                {candidate
                                  ? `${candidate.firstName} ${candidate.lastName}`
                                  : "Unknown Candidate"}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {role?.designation || "Unknown Role"}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {(() => {
                              const isTrainingAssigned =
                                interview.candidateProjectMap?.subStatus?.name ===
                                "training_assigned";
                              const trainerName = getAssignedTrainerName(interview);
                              const isMainAssigned =
                                interview.status === "assigned" ||
                                !!interview.candidateProjectMap?.mainInterviewId;

                              if (isTrainingAssigned) {
                                return (
                                  <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/50 dark:text-green-300">
                                    {trainerName ? `Trainer: ${trainerName}` : "Training Assigned"}
                                  </Badge>
                                );
                              }

                              // If this mock interview has been linked to a main interview,
                              // show a clear badge and allow assigning to trainer if needed.
                              if (isMainAssigned) {
                                return (
                                  <div className="flex items-center gap-2">
                                    <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/50 dark:text-green-300">
                                      Assigned to Main Interview
                                    </Badge>
                                    {/* Only allow Assign to Trainer when decision indicates training is needed or when rejected */}
                                    {(interview.decision === MOCK_INTERVIEW_DECISION.NEEDS_TRAINING ||
                                      interview.decision === MOCK_INTERVIEW_DECISION.REJECTED) && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAssignToTrainer(interview);
                                        }}
                                        title="Assign to Trainer"
                                      >
                                        <UserPlus className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                );
                              }

                              // Only show 'Assign Main Interview' when the candidate is ready:
                              // decision must be APPROVED and interview status should be completed
                              if (
                                interview.decision === MOCK_INTERVIEW_DECISION.APPROVED &&
                                interview.status === "completed"
                              ) {
                                return (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSendForInterviewConfirm({
                                        isOpen: true,
                                        candidateId:
                                          interview.candidateProjectMap?.candidate?.id,
                                        candidateName:
                                          interview.candidateProjectMap?.candidate?.firstName +
                                          " " +
                                          interview.candidateProjectMap?.candidate?.lastName,
                                        projectId: interview.candidateProjectMap?.project?.id,
                                        mockInterviewId: interview.id,
                                        notes: "",
                                      });
                                    }}
                                    title="Assign Main Interview"
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                  </Button>
                                );
                              }

                              // Fallback: allow assigning to trainer for needs training / rejected
                              if (
                                interview.decision ===
                                  MOCK_INTERVIEW_DECISION.NEEDS_TRAINING ||
                                interview.decision ===
                                  MOCK_INTERVIEW_DECISION.REJECTED
                              ) {
                                return (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAssignToTrainer(interview);
                                    }}
                                    title="Assign to Trainer"
                                  >
                                    <UserPlus className="h-3.5 w-3.5" />
                                  </Button>
                                );
                              }

                              return null;
                            })()}
                            <ChevronRight
                              className={cn(
                                "h-4 w-4 flex-shrink-0 transition-transform",
                                isSelected && "text-primary"
                              )}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-1.5">
                          <div
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs",
                              isCompleted
                                ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300"
                                : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                            )}
                          >
                            <ModeIcon className="h-3 w-3" />
                            <span className="capitalize">
                              {interview.mode.replace("_", " ")}
                            </span>
                          </div>
                          {interview.decision &&
                            getDecisionBadge(interview.decision)}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {interview.scheduledTime
                              ? format(
                                  new Date(interview.scheduledTime),
                                  "MMM d, yyyy"
                                )
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
        <div className="flex-1 overflow-hidden bg-muted/20 min-w-0 min-h-0">
          {selectedInterview ? (
            <ScrollArea className="h-full">
              <div className="p-4 max-w-2xl mx-auto space-y-4 min-w-0">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <h2 className="text-xl font-semibold truncate">
                      Mock Interview Details
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {selectedInterview.scheduledTime
                        ? `Scheduled for ${format(
                            new Date(selectedInterview.scheduledTime),
                            "MMMM d, yyyy 'at' h:mm a"
                          )}`
                        : "Not scheduled"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!selectedInterview.conductedAt && (
                      <Button
                        size="sm"
                        onClick={() =>
                          navigate(
                            `/mock-interviews/${selectedInterview.id}/conduct`
                          )
                        }
                      >
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
                          <Badge className="text-sm bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/50 dark:text-green-300">
                            {trainerName ? `Trainer: ${trainerName}` : "Training Assigned"}
                          </Badge>
                        );
                      }

                      if (isMainAssigned) {
                        return (
                          <div className="flex items-center gap-2">
                            <Badge className="text-sm bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/50 dark:text-green-300">
                              Assigned to Main Interview
                            </Badge>
                            {/* Only show Assign to Trainer when decision is NEEDS_TRAINING or REJECTED */}
                            {(selectedInterview.decision === MOCK_INTERVIEW_DECISION.NEEDS_TRAINING ||
                              selectedInterview.decision === MOCK_INTERVIEW_DECISION.REJECTED) && (
                              <Button
                                size="sm"
                                onClick={() => handleAssignToTrainer(selectedInterview)}
                                variant="outline"
                              >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Assign to Trainer
                              </Button>
                            )}
                          </div>
                        );
                      }

                      if (
                        selectedInterview.decision === MOCK_INTERVIEW_DECISION.APPROVED &&
                        selectedInterview.status === "completed"
                      ) {
                        return (
                          <Button
                            size="sm"
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
                                mockInterviewId: selectedInterview.id,
                                notes: "",
                              })
                            }
                            variant="outline"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Assign Main Interview
                          </Button>
                        );
                      }

                      if (
                        selectedInterview.decision ===
                          MOCK_INTERVIEW_DECISION.NEEDS_TRAINING ||
                        selectedInterview.decision ===
                          MOCK_INTERVIEW_DECISION.REJECTED
                      ) {
                        return (
                          <Button
                            size="sm"
                            onClick={() => handleAssignToTrainer(selectedInterview)}
                            variant="outline"
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
                  <Card className="min-w-0">
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-primary" />
                        Candidate Information
                      </h3>
                      <div className="space-y-2.5 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Name
                          </p>
                          <p className="font-medium">
                            {
                              selectedInterview.candidateProjectMap?.candidate
                                ?.firstName
                            }{" "}
                            {
                              selectedInterview.candidateProjectMap?.candidate
                                ?.lastName
                            }
                          </p>
                        </div>
                        {selectedInterview.candidateProjectMap?.candidate
                          ?.email && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Email
                            </p>
                            <p className="font-medium text-xs break-all">
                              {
                                selectedInterview.candidateProjectMap?.candidate
                                  ?.email
                              }
                            </p>
                          </div>
                        )}
                        {selectedInterview.candidateProjectMap?.candidate
                          ?.phone && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Phone
                            </p>
                            <p className="font-medium">
                              {
                                selectedInterview.candidateProjectMap?.candidate
                                  ?.phone
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Project & Role */}
                  <Card className="min-w-0">
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                        <Briefcase className="h-4 w-4 text-primary" />
                        Project & Role
                      </h3>
                      <div className="space-y-2.5 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Project
                          </p>
                          <p className="font-medium">
                            {
                              selectedInterview.candidateProjectMap?.project
                                ?.title
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Role
                          </p>
                          <p className="font-medium">
                            {
                              selectedInterview.candidateProjectMap?.roleNeeded
                                ?.designation
                            }
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Interview Details */}
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3 text-sm">
                      Interview Details
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Mode
                        </p>
                        <p className="font-medium capitalize">
                          {selectedInterview.mode.replace("_", " ")}
                        </p>
                      </div>
                      {selectedInterview.conductedAt && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Conducted At
                            </p>
                            <p className="font-medium">
                              {format(
                                new Date(selectedInterview.conductedAt),
                                "MMM d, yyyy h:mm a"
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Decision
                            </p>
                            <div>
                              {getDecisionBadge(selectedInterview.decision)}
                            </div>
                          </div>
                          {selectedInterview.overallRating != null && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">
                                Overall Score
                              </p>
                              <p className="font-medium text-lg">
                                {selectedInterview.overallRating}%
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {selectedInterview.notes && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-2">
                          Notes
                        </p>
                        <p className="text-sm whitespace-pre-wrap">
                          {selectedInterview.notes}
                        </p>
                      </div>
                    )}

                    {/* Checklist Items */}
                    {Array.isArray(selectedInterview.checklistItems) &&
                      selectedInterview.checklistItems.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <h3 className="font-semibold mb-2 text-sm">
                            Checklist Evaluation
                          </h3>
                          {/* Group by category */}
                          {(() => {
                            type ChecklistItem = NonNullable<
                              typeof selectedInterview.checklistItems
                            >[number];
                            const grouped =
                              selectedInterview.checklistItems.reduce(
                                (
                                  acc: Record<string, ChecklistItem[]>,
                                  item: ChecklistItem
                                ) => {
                                  const key = item.category || "misc";
                                  (acc[key] ||= []).push(item);
                                  return acc;
                                },
                                {}
                              );

                            return (
                              Object.entries(grouped) as [
                                string,
                                ChecklistItem[]
                              ][]
                            ).map(([category, items]) => (
                              <div key={category} className="mb-3">
                                <div className="text-xs font-medium text-primary mb-2 capitalize">
                                  {category.replace(/_/g, " ")}
                                </div>
                                <div className="space-y-1.5">
                                  {items.map((ci: ChecklistItem) => (
                                    <div
                                      key={ci.id}
                                      className="flex items-start justify-between rounded border p-2.5 bg-card"
                                    >
                                      <div className="pr-2 flex-1">
                                        <div className="text-xs font-medium">
                                          {ci.criterion}
                                        </div>
                                        {ci.notes ? (
                                          <div className="text-xs text-muted-foreground mt-1">
                                            {ci.notes}
                                          </div>
                                        ) : null}
                                      </div>
                                      <div className="flex items-center gap-3 text-xs">
                                        <div className="text-right">
                                          <div className="font-semibold">
                                            {ci.score != null
                                              ? `${ci.score}%`
                                              : "—"}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            Score
                                          </div>
                                        </div>

                                        <div>
                                          <Badge
                                            variant={
                                              ci.passed
                                                ? "secondary"
                                                : "destructive"
                                            }
                                            className="text-xs"
                                          >
                                            {ci.passed ? "Passed" : "Failed"}
                                          </Badge>
                                        </div>
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
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <ClipboardCheck className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No interview selected</p>
                <p className="text-sm">
                  Select an interview from the list to view details
                </p>
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
        mockInterviewId={selectedInterviewForTraining?.id}
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
            <p className="text-sm text-muted-foreground">
              Send this candidate for the main interview. You can add notes to
              include with the assignment.
            </p>
            <Textarea
              value={sendForInterviewConfirm.notes}
              onChange={(e) =>
                setSendForInterviewConfirm((s) => ({ ...s, notes: e.target.value }))
              }
              placeholder="Notes (optional)"
              rows={4}
            />
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
            await assignToMainInterview({
              projectId: sendForInterviewConfirm.projectId!,
              candidateId: sendForInterviewConfirm.candidateId!,
              mockInterviewId: sendForInterviewConfirm.mockInterviewId,
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
