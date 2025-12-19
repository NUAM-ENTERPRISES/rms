import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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
  GraduationCap,
  CalendarCheck,
  CheckCircle2,
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
// Select components not used in Basic Training
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGetBasicTrainingAssignmentsQuery } from "../data";
import { useCreateTrainingAssignmentMutation } from "../data";
import { SCREENING_MODE, TrainingAssignment } from "../../types";
import { cn } from "@/lib/utils";
import { AssignToTrainerDialog } from "../components/AssignToTrainerDialog";
import { ConfirmationDialog } from "@/components/ui";
import { Textarea } from "@/components/ui/textarea";
// Select not required here anymore
import { useSendForInterviewMutation } from "../data";
import InterviewHistory from "@/components/molecules/InterviewHistory";
import { useGetTrainingHistoryQuery } from "../data";

export default function BasicTrainingPage() {

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
    type?: "screening" | "interview" | "";
  }>({ isOpen: false, candidateId: undefined, candidateName: undefined, projectId: undefined, screeningId: undefined, notes: "", type: "" });

  const [sendForInterview, { isLoading: isSendingInterview }] = useSendForInterviewMutation();

  // Query basic training assignments (trainingType === "basic" and screeningInterviewId IS NULL)
  const apiParams = {
    page: 1,
    limit: 20,
    search: filters.search || undefined,
    assignedBy: searchParams.get("assignedBy") || undefined,
    status: filters.status && filters.status !== "all" ? filters.status : undefined,
  } as any;

  const { data, isLoading, error, refetch } = useGetBasicTrainingAssignmentsQuery(
    apiParams
  );
  const [createTrainingAssignment, { isLoading: isCreatingTraining }] =
    useCreateTrainingAssignmentMutation();
  // Backend returns paginated data: data.data.items
  const interviewsRaw: any[] = Array.isArray(data?.data?.items) ? data.data.items : [];

  // Normalize API shape -> ensure `sessions` exists, assignedByUser is populated, and phone is available
  const interviews: TrainingAssignment[] = useMemo(() =>
    interviewsRaw.map((i: any) => {
      const sessions = i.sessions || i.trainingSessions || [];
      const assignedByUser = i.assignedByUser || i.assignedBy || undefined;
      const candidate = i.candidateProjectMap?.candidate
        ? {
          ...i.candidateProjectMap.candidate,
          phone:
            i.candidateProjectMap.candidate?.phone ||
              i.candidateProjectMap.candidate?.mobileNumber ||
              i.candidateProjectMap.candidate?.countryCode && i.candidateProjectMap.candidate?.mobileNumber
              ? `${i.candidateProjectMap.candidate.countryCode} ${i.candidateProjectMap.candidate.mobileNumber}`
              : i.candidateProjectMap.candidate?.phone,
        }
        : undefined;

      return {
        ...i,
        sessions,
        assignedByUser,
        candidateProjectMap: i.candidateProjectMap
          ? { ...i.candidateProjectMap, candidate }
          : i.candidateProjectMap,
      } as TrainingAssignment;
    }),
    [interviewsRaw]
  );

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

      // Status filter (upcoming/completed/all)
      if (filters.status && filters.status !== "all") {
        filtered = filtered.filter((i) => i.status === filters.status);
      }

      const upcoming = filtered
        .filter((i) => i.sessions && i.sessions.length && !i.completedAt)
        .sort((a, b) => {
          const aDate = a.sessions?.[0]?.sessionDate
            ? new Date(a.sessions[0].sessionDate).getTime()
            : 0;
          const bDate = b.sessions?.[0]?.sessionDate
            ? new Date(b.sessions[0].sessionDate).getTime()
            : 0;
          return aDate - bDate;
        });

      const completed = filtered
        .filter((i) => i.status === "completed" || i.completedAt)
        .sort((a, b) => {
          const aDate = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const bDate = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return bDate - aDate;
        });

      return {
        upcomingInterviews: upcoming,
        completedInterviews: completed,
        // include assignments that are assigned but have no sessions yet
        allInterviews: [
          ...filtered.filter((i) => {
            const hasNoSessions = !i.sessions || i.sessions.length === 0;
            const assignedLike = !!i.status && i.status.toString().toLowerCase().includes("assign");
            return hasNoSessions && assignedLike && !i.completedAt;
          }),
          ...upcoming,
          ...completed,
        ],
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

  // Load training history for the selected interview's candidate-project
  const { data: historyData, isLoading: isLoadingHistory } = useGetTrainingHistoryQuery(
    selectedInterview?.candidateProjectMap?.id
      ? { candidateProjectMapId: selectedInterview.candidateProjectMap.id, page: 1, limit: 20 }
      : undefined,
    { skip: !selectedInterview?.candidateProjectMap?.id }
  );

  const stats = useMemo(() => {
    const needsTraining = interviews.filter((i) => !!i.status && i.status.toString().toLowerCase().includes("assign")).length;
    const completed = interviews.filter((i) => !!i.status && i.status.toString().toLowerCase().includes("complete")).length;
    const approved = completed;
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
    // depending on API shape: sessions[0].trainer, assignedByUser?.name, assignedToUser?.name
    const ta = interview.trainingAssignment || interview;
    const sessionTrainer = ta?.sessions && ta.sessions.length ? ta.sessions[0].trainer : undefined;
    const trainerFromAssignment = (ta as any)?.trainer || sessionTrainer;
    const assignedToUserName = (ta as any)?.assignedToUser?.name;
    const assignedByName = (ta as any)?.assignedByUser?.name || (ta as any)?.assignedByName;

    return trainerFromAssignment || assignedToUserName || assignedByName || undefined;
  };

  const getStatusLabel = (status?: string) => {
    if (!status) return "Unknown";
     switch (status) {
       case "basic_training_assigned":
         return "Basic Training Assigned";
       case "mock_assigned":
       case "screening_assigned":
         return "Screening Assigned";
       case "interview_assigned":
         return "Interview Assigned";
       case "assigned":
         return "Assigned";
       case "in_progress":
         return "In Progress";
       case "completed":
         return "Completed";
       case "cancelled":
         return "Cancelled";
       default:
         return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
  };

  const getStatusBadgeClass = (status?: string) => {
    if (!status) return "text-xs bg-muted text-muted-foreground";
    switch (status) {
      case "basic_training_assigned":
        return "text-xs bg-orange-100 text-orange-800";
      case "screening_assigned":
      case "interview_assigned":
        return "text-xs bg-green-100 text-green-800";
      case "assigned":
        return "text-xs bg-slate-100 text-slate-700";
      case "in_progress":
        return "text-xs bg-blue-100 text-blue-700";
      case "completed":
        return "text-xs bg-green-100 text-green-800";
      case "cancelled":
        return "text-xs bg-red-100 text-red-700";
      default:
        return "text-xs bg-muted text-muted-foreground";
    }
  };

  // Decisions are not used on the Basic Training list - status badge is shown instead

  // Mode filter options (UI for mode filter not currently rendered)

  // Decision filter not applicable to basic training assignments

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
            Failed to load training data. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Page Title */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Basic Training</h1>
            <p className="text-sm text-gray-600">Manage candidate training sessions and progress</p>
          </div>
        </div>
      </div>

      {/* Search & Filters Section */}
      <div className="w-full max-w-full mx-auto pt-2 pb-4 px-4 overflow-x-hidden">
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent>
            <div className="space-y-6">
              {/* Premium Search Bar with Enhanced Styling */}
              <div className="relative group">
                <div
                  className={`absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-all duration-300 ${filters.search ? "text-blue-600" : "text-gray-400"
                    }`}
                >
                  <Search
                    className={`h-5 w-5 transition-transform duration-300 ${filters.search ? "scale-110" : "scale-100"
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
                  className={`absolute inset-0 rounded-2xl transition-all duration-300 pointer-events-none ${filters.search ? "ring-2 ring-blue-500/20" : ""
                    }`}
                />
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Status and search filters (decision filter not applicable) */}

                {/* Clear Filters Button */}
                {(filters.search || filters.status !== "all") && (
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
      <div className="flex-1 flex overflow-hidden px-4 min-h-0">
        {/* Left Panel - Interview List */}
        <Card className="w-96 border-r border-0 shadow-lg bg-white/80 backdrop-blur-sm rounded-none min-w-0 min-h-0 h-full flex flex-col">
          <CardHeader className="pb-3">
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        <CalendarCheck className="h-4 w-4 text-slate-600 flex-shrink-0" />
        <CardTitle className="text-base sm:text-lg font-semibold text-slate-800">
          Training Sessions
        </CardTitle>
      </div>
      <CardDescription className="text-xs sm:text-sm pl-6">
        {displayedInterviews.length} session{displayedInterviews.length !== 1 ? "s" : ""} found
      </CardDescription>
    </div>

    {/* Ultra-compact stats row - wraps only if absolutely necessary */}
    <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
      <div className="flex items-center gap-1.5">
        <AlertCircle className="h-3.5 w-3.5 text-orange-600 flex-shrink-0" />
        <div className="text-center">
          <div className="text-sm font-bold text-orange-600">{stats.needsTraining}</div>
          <div className="text-xs text-muted-foreground hidden xs:block">Training</div>
        </div>
      </div>

      <div className="hidden sm:block w-px h-8 bg-border" />

      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
        <div className="text-center">
          <div className="text-sm font-bold text-green-600">{stats.approved}</div>
          <div className="text-xs text-muted-foreground hidden xs:block">Approved</div>
        </div>
      </div>

      <div className="hidden sm:block w-px h-8 bg-border" />

      <div className="flex items-center gap-1.5">
        <CalendarCheck className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
        <div className="text-center">
          <div className="text-sm font-bold text-blue-600">{stats.completed}</div>
          <div className="text-xs text-muted-foreground hidden xs:block">Done</div>
        </div>
      </div>
    </div>
  </div>
</CardHeader>
         <CardContent className="p-0 flex-1 overflow-hidden">
  <ScrollArea className="h-full">
    {displayedInterviews.length === 0 ? (
      <div className="p-12 text-center">
        <div className="mx-auto w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
          <ClipboardCheck className="h-9 w-9 text-muted-foreground/70" />
        </div>
        <p className="text-lg font-semibold text-foreground mb-1">
          No training sessions found
        </p>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          {filters.search || filters.mode !== "all" || filters.status !== "all"
            ? "Try adjusting your filters to see more results"
            : "Training sessions will appear here once scheduled"}
        </p>
      </div>
    ) : (
      <div className="p-3 space-y-2">
        {displayedInterviews.map((interview) => {
          const candidate = interview.candidateProjectMap?.candidate;
          const role = interview.candidateProjectMap?.roleNeeded;
          const sessionType = interview.sessions?.[0]?.sessionType;
          const ModeIcon = getModeIcon(sessionType || "");
          const isSelected =
            interview.id === (selectedInterview?.id || displayedInterviews[0]?.id);
          const isCompleted =
            !!interview.completedAt ||
            !!interview.sessions?.some((s) => s.completedAt);

          const candidateName = candidate
            ? `${candidate.firstName} ${candidate.lastName}`
            : "Unknown Candidate";

          return (
            <button
              key={interview.id}
              onClick={() => setSelectedInterviewId(interview.id)}
              className={cn(
                "w-full text-left rounded-xl border bg-card p-4 transition-all duration-200",
                "hover:shadow-md hover:border-primary/30",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20"
                  : "border-transparent"
              )}
            >
              {/* Top row: Name, Role, Actions */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {candidateName}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {role?.designation || "Unknown Role"}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Action Buttons */}
                  {interview.status === "completed" || 
                   interview.status === "basic_training_assigned" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 rounded-full hover:bg-orange-100 hover:text-orange-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSendForInterviewConfirm({
                          isOpen: true,
                          candidateId: interview.candidateProjectMap?.candidate?.id,
                          candidateName,
                          projectId: interview.candidateProjectMap?.project?.id,
                          mockInterviewId: undefined,
                          notes: "",
                          type: "interview",
                        });
                      }}
                      title="Send for Interview"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  ) : (interview.status === "assigned" || 
                       interview.status === "in_progress") ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 rounded-full hover:bg-blue-100 hover:text-blue-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAssignToTrainer(interview);
                      }}
                      title="Assign to Trainer"
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  ) : null}

                  <ChevronRight
                    className={cn(
                      "h-5 w-5 text-muted-foreground transition-transform",
                      isSelected && "text-primary translate-x-1"
                    )}
                  />
                </div>
              </div>

              {/* Middle row: Session Type + Status */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                    isCompleted
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  )}
                >
                  <ModeIcon className="h-3.5 w-3.5" />
                  {sessionType
                    ? sessionType.replace("_", " ")
                    : interview.trainingType || "basic"}
                </div>

                <Badge
                  variant="outline"
                  className={cn("text-xs font-medium", getStatusBadgeClass(interview.status))}
                >
                  {getStatusLabel(interview.status)}
                </Badge>
              </div>

              {/* Bottom row: Date */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {interview.sessions?.[0]?.sessionDate
                    ? format(new Date(interview.sessions[0].sessionDate), "MMM d, yyyy")
                    : interview.assignedAt
                    ? format(new Date(interview.assignedAt), "MMM d, yyyy")
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
        <div className="flex-1 overflow-hidden bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-900/50 dark:to-black min-w-0 min-h-0">
  {selectedInterview ? (
    <ScrollArea className="h-full">
      <div className="p-5 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Training Session Details
              </h2>
              {selectedInterview.status && (
                <Badge className={cn("px-3 py-1 text-sm font-medium shadow-sm", getStatusBadgeClass(selectedInterview.status))}>
                  {getStatusLabel(selectedInterview.status)}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedInterview.sessions?.[0]?.sessionDate
                ? `Scheduled for ${format(new Date(selectedInterview.sessions[0].sessionDate), "MMMM d, yyyy • h:mm a")}`
                : selectedInterview.assignedAt
                  ? `Assigned on ${format(new Date(selectedInterview.assignedAt), "MMMM d, yyyy")}`
                  : "Not scheduled"}
            </p>
          </div>

          <div className="flex-shrink-0">
            {selectedInterview.status === "basic_training_assigned" && (
              <Button
                size="sm"
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
                onClick={() =>
                  setSendForInterviewConfirm({
                    isOpen: true,
                    candidateId: selectedInterview.candidateProjectMap?.candidate?.id,
                    candidateName:
                      `${selectedInterview.candidateProjectMap?.candidate?.firstName || ""} ${selectedInterview.candidateProjectMap?.candidate?.lastName || ""}`.trim(),
                    projectId: selectedInterview.candidateProjectMap?.project?.id,
                    mockInterviewId: undefined,
                    notes: "",
                    type: "interview",
                  })
                }
              >
                <Send className="h-4 w-4 mr-2" />
                Send for Interview
              </Button>
            )}
          </div>
        </div>

        {/* Candidate + Project & Role */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Candidate Card */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-indigo-50/70 to-purple-50/70 dark:from-indigo-900/20 dark:to-purple-900/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-5">
                <Avatar className="h-14 w-14 ring-4 ring-white dark:ring-gray-900 shadow-xl">
                  <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                    {selectedInterview.candidateProjectMap?.candidate
                      ? `${selectedInterview.candidateProjectMap.candidate.firstName?.[0] || ""}${selectedInterview.candidateProjectMap.candidate.lastName?.[0] || ""}`.toUpperCase()
                      : "??"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                    <User className="h-5 w-5" />
                    Candidate
                  </h3>
                  <p className="text-lg font-semibold mt-1 text-gray-900 dark:text-gray-100">
                    {selectedInterview.candidateProjectMap?.candidate
                      ? `${selectedInterview.candidateProjectMap.candidate.firstName} ${selectedInterview.candidateProjectMap.candidate.lastName}`
                      : "Unknown Candidate"}
                  </p>
                  {selectedInterview.candidateProjectMap?.candidate?.email && (
                    <p className="text-sm text-muted-foreground mt-2 break-all">
                      {selectedInterview.candidateProjectMap.candidate.email}
                    </p>
                  )}
                  {(selectedInterview.candidateProjectMap?.candidate as any)?.phone && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {(selectedInterview.candidateProjectMap?.candidate as any).phone}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project & Role Card */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50/70 to-pink-50/70 dark:from-purple-900/20 dark:to-pink-900/20">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-5 text-purple-700 dark:text-purple-400">
                <Briefcase className="h-5 w-5" />
                Project & Role
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Project</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {selectedInterview.candidateProjectMap?.project?.title || "Unknown Project"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Role</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {selectedInterview.candidateProjectMap?.roleNeeded?.designation || "Unknown Role"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Training Details Card */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50/70 to-teal-50/70 dark:from-emerald-900/20 dark:to-teal-900/20">
          <CardContent className="p-6 space-y-6">
            <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
              Training Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
              <div>
                <p className="text-muted-foreground font-medium mb-1">Training Mode</p>
                <p className="font-semibold text-lg capitalize text-gray-900 dark:text-gray-100">
                  {selectedInterview.sessions?.[0]?.sessionType
                    ? selectedInterview.sessions[0].sessionType.replace("_", " ")
                    : selectedInterview.trainingType || "Basic"}
                </p>
              </div>

              {(selectedInterview.completedAt || selectedInterview.sessions?.some(s => s.completedAt)) && (
                <>
                  <div>
                    <p className="text-muted-foreground font-medium mb-1">Conducted On</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {selectedInterview.completedAt
                        ? format(new Date(selectedInterview.completedAt), "MMM d, yyyy • h:mm a")
                        : selectedInterview.sessions?.find(s => s.completedAt)?.completedAt
                          ? format(new Date(selectedInterview.sessions.find(s => s.completedAt)!.completedAt!), "MMM d, yyyy • h:mm a")
                          : "—"}
                    </p>
                  </div>

                  {selectedInterview.overallPerformance != null && (
                    <div>
                      <p className="text-muted-foreground font-medium mb-1">Performance</p>
                      <p className="font-bold text-xl text-emerald-800 dark:text-emerald-300">
                        {selectedInterview.overallPerformance}
                      </p>
                    </div>
                  )}
                </>
              )}

              {getAssignedTrainerName(selectedInterview) && (
                <div>
                  <p className="text-muted-foreground font-medium mb-1">Trainer</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {getAssignedTrainerName(selectedInterview)}
                  </p>
                </div>
              )}

              <div>
                <p className="text-muted-foreground font-medium mb-1">Status</p>
                <Badge className={cn("px-4 py-2 text-sm font-bold shadow-md", getStatusBadgeClass(selectedInterview.status))}>
                  {getStatusLabel(selectedInterview.status)}
                </Badge>
              </div>
            </div>

            {selectedInterview.notes && (
              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-muted-foreground font-medium mb-3">Notes</p>
                <p className="text-base leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {selectedInterview.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Interview History */}
        {selectedInterview?.candidateProjectMap?.id && (
          <div className="mt-8">
            <InterviewHistory items={historyData?.data?.items} isLoading={isLoadingHistory} />
          </div>
        )}
      </div>
    </ScrollArea>
  ) : (
    <div className="h-full flex items-center justify-center text-muted-foreground">
      <div className="text-center space-y-4">
        <ClipboardCheck className="h-20 w-20 mx-auto opacity-30 text-indigo-500" />
        <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">
          No training session selected
        </p>
        <p className="text-sm">Select a session from the list to view details</p>
      </div>
    </div>
  )}
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

        {/* Send For Interview Confirmation */}
        <ConfirmationDialog
          isOpen={sendForInterviewConfirm.isOpen}
          onClose={() =>
            setSendForInterviewConfirm((s) => ({ ...s, isOpen: false }))
          }
          title={"Send for Interview"}
          description={
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to send {sendForInterviewConfirm.candidateName} for an interview? Please select the type and optionally add notes.
              </p>

              <div className="space-y-2">
                <label
                  htmlFor="interview-type"
                  className="text-sm font-medium text-gray-700"
                >
                  Type
                </label>
                <Select
                  value={sendForInterviewConfirm.type}
                  onValueChange={(value) =>
                    setSendForInterviewConfirm((prev) => ({ ...prev, type: value as any }))
                  }
                >
                  <SelectTrigger id="interview-type" className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mock">Mock Interview</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                  </SelectContent>
                </Select>

                <label
                  htmlFor="interview-notes"
                  className="text-sm font-medium text-gray-700"
                >
                  Notes (Optional)
                </label>
                <Textarea
                  id="interview-notes"
                  placeholder="Add any notes for the interview team..."
                  value={sendForInterviewConfirm.notes}
                  onChange={(e) =>
                    setSendForInterviewConfirm((s) => ({ ...s, notes: e.target.value }))
                  }
                  rows={3}
                  className="w-full"
                />
              </div>
            </div>
          }
          confirmText={isSendingInterview ? "Sending..." : "Send"}
          cancelText="Cancel"
          isLoading={isSendingInterview}
          onConfirm={async () => {
            if (!sendForInterviewConfirm.projectId || !sendForInterviewConfirm.candidateId) {
              toast.error("Missing candidate or project information");
              return;
            }

            try {
              const mappedType = sendForInterviewConfirm.type === "mock" ? "mock_interview_assigned" : "interview_assigned";
              await sendForInterview({
                projectId: sendForInterviewConfirm.projectId!,
                candidateId: sendForInterviewConfirm.candidateId!,
                type: mappedType as "mock_interview_assigned" | "interview_assigned",
                recruiterId: currentUser?.id,
                notes: sendForInterviewConfirm.notes || undefined,
              }).unwrap();

              // Ensure the list is refreshed from server before closing modal so UI updates immediately
              try {
                await refetch?.();
              } catch (e) {
                // ignore
              }

              toast.success("Candidate sent for interview");
              setSendForInterviewConfirm((s) => ({ ...s, isOpen: false }));
            } catch (error: any) {
              toast.error(error?.data?.message || "Failed to send candidate for interview");
            }
          }}
        />
      </div>
    </div>
  );

}