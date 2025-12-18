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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGetBasicTrainingAssignmentsQuery } from "../data";
import { useCreateTrainingAssignmentMutation } from "../data";
import { SCREENING_MODE, TrainingAssignment } from "../../types";
import { cn } from "@/lib/utils";
import { AssignToTrainerDialog } from "../components/AssignToTrainerDialog";
import { ConfirmationDialog } from "@/components/ui";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    type?: "screening" | "interview";
  }>({ isOpen: false, candidateId: undefined, candidateName: undefined, projectId: undefined, screeningId: undefined, notes: "", type: "screening" });

  const [sendForInterview, { isLoading: isSendingInterview }] = useSendForInterviewMutation();

  // Query basic training assignments (trainingType === "basic" and mockInterviewId IS NULL)
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
      case "mock_assigned":
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-800">
                  Training Sessions
                </CardTitle>
                <CardDescription>
                  {displayedInterviews.length} session
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
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              {displayedInterviews.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm font-medium mb-1">
                    No training sessions found
                  </p>
                  <p className="text-xs">
                    {filters.search || filters.mode !== "all" || filters.status !== "all"
                      ? "Try adjusting your filters"
                      : "Training sessions will appear here once scheduled"}
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {displayedInterviews.map((interview) => {
                    const candidate = interview.candidateProjectMap?.candidate;
                    const role = interview.candidateProjectMap?.roleNeeded;
                    const sessionType = interview.sessions?.[0]?.sessionType;
                    const ModeIcon = getModeIcon(sessionType || "");
                    const isSelected =
                      interview.id ===
                      (selectedInterview?.id || displayedInterviews[0]?.id);
                    const isCompleted = !!interview.completedAt || !!interview.sessions?.some((s) => s.completedAt);

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

                              // If training already completed or basic training assigned, allow sending for interview
                              if (interview.status === "completed" || interview.status === "basic_training_assigned") {
                                return (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSendForInterviewConfirm({
                                        isOpen: true,
                                        candidateId: interview.candidateProjectMap?.candidate?.id,
                                        candidateName:
                                          interview.candidateProjectMap?.candidate?.firstName +
                                          " " +
                                          interview.candidateProjectMap?.candidate?.lastName,
                                        projectId: interview.candidateProjectMap?.project?.id,
                                        screeningId: undefined,
                                        notes: "",
                                        type: "interview",
                                      });
                                    }}
                                    title="Send for Interview"
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                  </Button>
                                );
                              }

                              // Fallback: allow assigning to trainer when assignment is active
                              if (interview.status === "assigned" || interview.status === "in_progress") {
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
                              {sessionType
                                ? sessionType.replace("_", " ")
                                : (interview.trainingType || "basic")}
                            </span>
                          </div>
                          <div>
                            <Badge className={getStatusBadgeClass(interview.status)}>{getStatusLabel(interview.status)}</Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {interview.sessions && interview.sessions.length && interview.sessions[0].sessionDate
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
        <div className="flex-1 overflow-hidden bg-muted/20 min-w-0 min-h-0">
          {selectedInterview ? (
            <ScrollArea className="h-full">
              {/*
                Reduced max width to avoid pushing header actions off-screen on
                narrower viewports and added `min-w-0` / truncation utility
                classes to allow the left content to wrap/truncate instead of
                forcing the Send button out of view.
              */}
              <div className="p-4 max-w-2xl mx-auto space-y-4 overflow-x-hidden">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-semibold truncate">
                        Training Session Details
                      </h2>
                      {selectedInterview.status && (
                        <Badge className={getStatusBadgeClass(selectedInterview.status)}>
                          {getStatusLabel(selectedInterview.status)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedInterview.sessions && selectedInterview.sessions.length && selectedInterview.sessions[0].sessionDate
                        ? `Scheduled for ${format(new Date(selectedInterview.sessions[0].sessionDate), "MMMM d, yyyy 'at' h:mm a")}`
                        : selectedInterview.assignedAt
                          ? `Assigned on ${format(new Date(selectedInterview.assignedAt), "MMMM d, yyyy")}`
                          : "Not scheduled"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {selectedInterview.status === "basic_training_assigned" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          setSendForInterviewConfirm({
                            isOpen: true,
                            candidateId: selectedInterview.candidateProjectMap?.candidate?.id,
                            candidateName:
                              selectedInterview.candidateProjectMap?.candidate?.firstName +
                              " " +
                              selectedInterview.candidateProjectMap?.candidate?.lastName,
                            projectId: selectedInterview.candidateProjectMap?.project?.id,
                            screeningId: undefined,
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
                  {/* Candidate Info */}
                  <Card className="min-w-0 w-full max-w-full">
                    <CardContent className="p-4 overflow-hidden w-full max-w-full">
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
                            {selectedInterview.candidateProjectMap?.candidate
                              ? `${selectedInterview.candidateProjectMap.candidate.firstName} ${selectedInterview.candidateProjectMap.candidate.lastName}`
                              : "Unknown Candidate"}
                          </p>
                        </div>
                        {selectedInterview.candidateProjectMap?.candidate
                          ?.email && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">
                                Email
                              </p>
                              <p className="font-medium break-all text-xs">
                                {
                                  selectedInterview.candidateProjectMap.candidate
                                    .email
                                }
                              </p>
                            </div>
                          )}
                        {(selectedInterview.candidateProjectMap?.candidate as any)
                          ?.phone && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">
                                Phone
                              </p>
                              <p className="font-medium">
                                {(selectedInterview.candidateProjectMap?.candidate as any).phone}
                              </p>
                            </div>
                          )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Project & Role */}
                  <Card className="min-w-0 w-full max-w-full">
                    <CardContent className="p-4 overflow-hidden w-full max-w-full">
                      <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                        <Briefcase className="h-4 w-4 text-primary" />
                        Project & Role
                      </h3>
                      <div className="space-y-2.5 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Project
                          </p>
                          <p className="font-medium break-words">
                            {selectedInterview.candidateProjectMap?.project
                              ?.title || "Unknown Project"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Role
                          </p>
                          <p className="font-medium break-words">
                            {selectedInterview.candidateProjectMap?.roleNeeded
                              ?.designation || "Unknown Role"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Interview Details */}
                <Card className="min-w-0 w-full max-w-full">
                  <CardContent className="p-4 overflow-hidden w-full max-w-full">
                    <h3 className="font-semibold mb-3 text-sm">
                      Training Details
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Mode
                        </p>
                        <p className="font-medium capitalize">
                          {selectedInterview.sessions?.[0]?.sessionType
                            ? selectedInterview.sessions[0].sessionType.replace("_", " ")
                            : (selectedInterview.trainingType || "basic")}
                        </p>
                      </div>
                      {(selectedInterview.completedAt || selectedInterview.sessions?.some((s) => s.completedAt)) && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Conducted On
                            </p>
                            <p className="font-medium">
                              {selectedInterview.completedAt
                                ? format(new Date(selectedInterview.completedAt), "MMM d, yyyy 'at' h:mm a")
                                : format(new Date(selectedInterview.sessions?.find((s) => s.completedAt)?.completedAt!), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                          {selectedInterview.overallPerformance != null && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">
                                Overall Performance
                              </p>
                              <p className="font-medium">{selectedInterview.overallPerformance}</p>
                            </div>
                          )}
                        </>
                      )}

                      {getAssignedTrainerName(selectedInterview) && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground mb-1">Trainer</p>
                          <p className="font-medium">{getAssignedTrainerName(selectedInterview)}</p>
                        </div>
                      )}

                      {/* Status */}
                      {selectedInterview.status && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground mb-1">Status</p>
                          <Badge className={getStatusBadgeClass(selectedInterview.status)}>{getStatusLabel(selectedInterview.status)}</Badge>
                        </div>
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

                    {/* No checklist items for Basic Training (training uses sessions/evaluations) */}
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
                <p className="text-lg font-medium">No training session selected</p>
                <p className="text-sm">
                  Select a training session from the list to view details
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
        screeningId={selectedInterviewForTraining?.id}
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
                  <SelectItem value="mock">Screening</SelectItem>
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
            const mappedType = sendForInterviewConfirm.type === "screening" || sendForInterviewConfirm.type === "mock"
              ? "screening_assigned"
              : "interview_assigned";
            await sendForInterview({
              projectId: sendForInterviewConfirm.projectId!,
              candidateId: sendForInterviewConfirm.candidateId!,
              type: mappedType as "screening_assigned" | "interview_assigned",
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
  );
}
