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
// import { Separator } from "@/components/ui/separator";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";


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
    limit: 15,
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
  <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/20">
    {/* Compact Header */}
    <header className="px-4 py-3 border-b bg-white/90 backdrop-blur-lg shadow-sm sticky top-0 z-20">
      <div className="flex items-center gap-3 max-w-7xl mx-auto">
        <div className="p-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-md">
          <GraduationCap className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Basic Training
          </h1>
          <p className="text-xs text-slate-600">Manage training sessions</p>
        </div>
      </div>
    </header>

    {/* Compact Search & Filters */}
    <div className="px-4 py-3 max-w-7xl mx-auto w-full">
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-md rounded-2xl ring-1 ring-indigo-200/20">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                <div className="p-1.5 rounded-full bg-indigo-100/80">
                  <Search className="h-4 w-4 text-indigo-600" />
                </div>
              </div>
              <Input
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-12 h-10 text-sm rounded-xl border-indigo-200/50 bg-white/90 shadow-inner focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-300"
              />
              {filters.search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => handleSearch("")}
                >
                  <X className="h-3.5 w-3.5 text-slate-500" />
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {(filters.search || filters.status !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs rounded-lg border-indigo-200 hover:bg-indigo-50"
                  onClick={() =>
                    setFilters({
                      search: "",
                      mode: "all",
                      decision: "all",
                      status: "all",
                    })
                  }
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Compact Master-Detail */}
    <div className="flex-1 flex overflow-hidden px-4 pb-4 max-w-7xl mx-auto w-full gap-4">
      {/* Left Panel - Smaller */}
      <Card className="w-80 border-0 shadow-xl bg-white/80 backdrop-blur-lg rounded-2xl overflow-hidden flex flex-col ring-1 ring-indigo-200/20">
        <CardHeader className="pb-2 border-b bg-gradient-to-r from-white to-indigo-50/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <CalendarCheck className="h-4 w-4 text-indigo-600" />
                <CardTitle className="text-base font-semibold text-slate-800">Sessions</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-600 pl-5">
                {displayedInterviews.length} found
              </CardDescription>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 text-orange-600" />
                <span className="font-bold text-orange-600">{stats.needsTraining}</span>
              </div>
              <div className="hidden sm:block w-px h-5 bg-indigo-200/50" />
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                <span className="font-bold text-green-600">{stats.approved}</span>
              </div>
              <div className="hidden sm:block w-px h-5 bg-indigo-200/50" />
              <div className="flex items-center gap-1">
                <CalendarCheck className="h-3.5 w-3.5 text-indigo-600" />
                <span className="font-bold text-indigo-600">{stats.completed}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <ScrollArea className="flex-1 px-3 py-2">
          {displayedInterviews.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <ClipboardCheck className="h-12 w-12 text-indigo-300/70 mb-3" />
              <p className="text-sm font-medium text-slate-600">No sessions</p>
              <p className="text-xs text-slate-500">
                {filters.search || filters.status !== "all" ? "Adjust filters" : "Will appear here"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayedInterviews.map((interview) => {
                const candidate = interview.candidateProjectMap?.candidate;
                const role = interview.candidateProjectMap?.roleNeeded;
                const sessionType = interview.sessions?.[0]?.sessionType;
                const ModeIcon = getModeIcon(sessionType || "");
                const isSelected = interview.id === (selectedInterview?.id || displayedInterviews[0]?.id);
                const isCompleted = !!interview.completedAt || !!interview.sessions?.some((s) => s.completedAt);
                const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown";

                return (
                  <button
                    key={interview.id}
                    onClick={() => setSelectedInterviewId(interview.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border transition-all duration-200 text-sm",
                      isSelected
                        ? "bg-indigo-50/70 border-indigo-300 shadow-sm ring-1 ring-indigo-400/30"
                        : "bg-white border-slate-200/70 hover:border-indigo-300 hover:shadow-md"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{candidateName}</h3>
                        <p className="text-xs text-slate-500 truncate">
                          {role?.designation || "Unknown Role"}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {interview.status === "completed" || interview.status === "basic_training_assigned" ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-lg hover:bg-orange-50"
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
                          >
                            <Send className="h-3.5 w-3.5 text-orange-600" />
                          </Button>
                        ) : interview.status === "assigned" || interview.status === "in_progress" ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-lg hover:bg-indigo-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssignToTrainer(interview);
                            }}
                          >
                            <UserPlus className="h-3.5 w-3.5 text-indigo-600" />
                          </Button>
                        ) : null}

                        <ChevronRight
                          className={cn(
                            "h-4 w-4 transition-all",
                            isSelected ? "text-indigo-600 translate-x-1" : "text-slate-400"
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                          isCompleted ? "bg-green-100 text-green-700" : "bg-indigo-100 text-indigo-700"
                        )}
                      >
                        <ModeIcon className="h-3 w-3" />
                        <span className="capitalize">
                          {sessionType ? sessionType.replace("_", " ") : (interview.trainingType || "basic")}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("text-xs px-2 py-0.5", getStatusBadgeClass(interview.status))}
                      >
                        {getStatusLabel(interview.status)}
                      </Badge>
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {interview.sessions?.[0]?.sessionDate
                        ? format(new Date(interview.sessions[0].sessionDate), "MMM d, yyyy")
                        : interview.assignedAt
                        ? format(new Date(interview.assignedAt), "MMM d, yyyy")
                        : "Not scheduled"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Right Panel - Compact Details */}
      <div className="flex-1 overflow-hidden bg-gradient-to-b from-white to-indigo-50/20 rounded-2xl shadow-xl ring-1 ring-indigo-200/20">
        {selectedInterview ? (
          <ScrollArea className="h-full">
            <div className="p-5 space-y-5 max-w-4xl mx-auto">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-indigo-200/50">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                      Details
                    </h2>
                    <Badge className={cn("text-sm px-3 py-1", getStatusBadgeClass(selectedInterview.status))}>
                      {getStatusLabel(selectedInterview.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600">
                    {selectedInterview.sessions?.[0]?.sessionDate
                      ? format(new Date(selectedInterview.sessions[0].sessionDate), "MMM d, yyyy • h:mm a")
                      : selectedInterview.assignedAt
                      ? format(new Date(selectedInterview.assignedAt), "MMM d, yyyy")
                      : "Not scheduled"}
                  </p>
                </div>

                {selectedInterview.status === "basic_training_assigned" && (
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-xs px-4"
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
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Send for Interview
                  </Button>
                )}
              </div>

              {/* Candidate & Project */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-0 shadow-md bg-gradient-to-br from-indigo-50/70 to-purple-50/70">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-white shadow-md">
                        <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
                          {selectedInterview.candidateProjectMap?.candidate
                            ? `${selectedInterview.candidateProjectMap.candidate.firstName?.[0] || ""}${selectedInterview.candidateProjectMap.candidate.lastName?.[0] || ""}`.toUpperCase()
                            : "??"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-indigo-700 flex items-center gap-1.5 mb-1">
                          <User className="h-4 w-4" />
                          Candidate
                        </h3>
                        <p className="text-sm font-medium">
                          {selectedInterview.candidateProjectMap?.candidate
                            ? `${selectedInterview.candidateProjectMap.candidate.firstName} ${selectedInterview.candidateProjectMap.candidate.lastName}`
                            : "Unknown"}
                        </p>
                        {selectedInterview.candidateProjectMap?.candidate?.email && (
                          <p className="text-xs text-slate-600 break-all">{selectedInterview.candidateProjectMap.candidate.email}</p>
                        )}
                        {(selectedInterview.candidateProjectMap?.candidate as any)?.phone && (
                          <p className="text-xs text-slate-600">{(selectedInterview.candidateProjectMap?.candidate as any).phone}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50/70 to-pink-50/70">
                  <CardContent className="p-4">
                    <h3 className="text-base font-semibold text-purple-700 flex items-center gap-1.5 mb-2">
                      <Briefcase className="h-4 w-4" />
                      Project & Role
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Project</p>
                        <p className="font-medium">{selectedInterview.candidateProjectMap?.project?.title || "Unknown"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Role</p>
                        <p className="font-medium">{selectedInterview.candidateProjectMap?.roleNeeded?.designation || "Unknown"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Training Details */}
              <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50/70 to-teal-50/70">
                <CardContent className="p-4 space-y-4">
                  <h3 className="text-lg font-semibold text-emerald-700">Training Details</h3>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Mode</p>
                      <p className="font-medium capitalize">
                        {selectedInterview.sessions?.[0]?.sessionType
                          ? selectedInterview.sessions[0].sessionType.replace("_", " ")
                          : selectedInterview.trainingType || "Basic"}
                      </p>
                    </div>

                    {(selectedInterview.completedAt || selectedInterview.sessions?.some((s) => s.completedAt)) && (
                      <>
                        <div>
                          <p className="text-xs text-slate-500">Date</p>
                          <p className="font-medium">
                            {selectedInterview.completedAt
                              ? format(new Date(selectedInterview.completedAt), "MMM d, yyyy")
                              : format(
                                  new Date(selectedInterview.sessions?.find((s) => s.completedAt)?.completedAt!),
                                  "MMM d, yyyy"
                                )}
                          </p>
                        </div>

                        {selectedInterview.overallPerformance != null && (
                          <div>
                            <p className="text-xs text-slate-500">Perf.</p>
                            <p className="font-bold text-emerald-800">{selectedInterview.overallPerformance}</p>
                          </div>
                        )}
                      </>
                    )}

                    {getAssignedTrainerName(selectedInterview) && (
                      <div>
                        <p className="text-xs text-slate-500">Trainer</p>
                        <p className="font-medium">{getAssignedTrainerName(selectedInterview)}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-slate-500">Status</p>
                      <Badge className={cn("text-xs px-2 py-1 mt-1", getStatusBadgeClass(selectedInterview.status))}>
                        {getStatusLabel(selectedInterview.status)}
                      </Badge>
                    </div>
                  </div>

                  {selectedInterview.notes && (
                    <div className="pt-3 border-t border-emerald-200">
                      <p className="text-xs text-slate-500 mb-1">Notes</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedInterview.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedInterview?.candidateProjectMap?.id && (
                <InterviewHistory items={historyData?.data?.items} isLoading={isLoadingHistory} />
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="h-full flex items-center justify-center text-center">
            <div className="space-y-3">
              <ClipboardCheck className="h-14 w-14 text-indigo-300/70 mx-auto" />
              <p className="text-base font-medium text-slate-600">No session selected</p>
              <p className="text-xs text-slate-500">Select from the list</p>
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
          setSendForInterviewConfirm((s) => ({ ...s, isOpen: false, type: "" }))
        }
        title={"Send for Interview"}
        description={
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to send {sendForInterviewConfirm.candidateName} for an interview? Please select the type and optionally add notes.
            </p>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-gray-700">Type</label>
              <div className="space-y-2">
                {(() => {
                  // Get the project from selectedInterview to check requiredScreening
                  const project = selectedInterview?.candidateProjectMap?.project;
                  const projectRequiredScreening = project?.requiredScreening || false;

                  return [
                    {
                      value: "screening",
                      label: "Screening",
                      description:
                        "Quick initial screen to verify basic eligibility and documents.",
                    },
                    {
                      value: "interview",
                      label: "Interview",
                      description:
                        "Full interview with the hiring team to assess skills and fit.",
                      disabled: projectRequiredScreening,
                    },
                  ].map((opt) => {
                    const selected = sendForInterviewConfirm.type === opt.value;
                    const isDisabled = opt.disabled || false;
                    return (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-3 p-3 rounded border transition-colors duration-150 ${
                          isDisabled
                            ? "cursor-not-allowed opacity-60 bg-slate-50"
                            : "cursor-pointer"
                        } ${
                          selected
                            ? "border-primary/40 bg-primary/10"
                            : "border-slate-200 hover:bg-accent/50"
                        }`}
                        onClick={(e) => {
                          if (isDisabled) {
                            e.preventDefault();
                            return;
                          }
                          e.stopPropagation();
                          setSendForInterviewConfirm((prev) => ({
                            ...prev,
                            type: opt.value as any,
                          }));
                        }}
                        aria-label={opt.label}
                      >
                        <input
                          type="radio"
                          name="interview-type"
                          value={opt.value}
                          checked={selected}
                          disabled={isDisabled}
                          onChange={() =>
                            setSendForInterviewConfirm((prev) => ({
                              ...prev,
                              type: opt.value as any,
                            }))
                          }
                          className="accent-primary mt-1"
                          aria-describedby={`interview-type-desc-${opt.value}`}
                          onClick={(e) => e.stopPropagation()}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800">
                            {opt.label}
                          </div>
                          <div
                            id={`interview-type-desc-${opt.value}`}
                            className="text-xs text-slate-500 mt-1"
                          >
                            {opt.description}
                          </div>
                          {isDisabled &&
                            opt.value === "interview" &&
                            projectRequiredScreening && (
                              <div className="text-xs text-red-600 mt-1.5 font-medium">
                                ⚠ Screening is required for this project. Please
                                complete screening before interview.
                              </div>
                            )}
                        </div>
                      </label>
                    );
                  });
                })()}

                {!sendForInterviewConfirm.type && (
                  <p className="text-sm text-red-600">Please select one</p>
                )}
              </div>

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
        confirmDisabled={!sendForInterviewConfirm.type}
        cancelText="Cancel"
        isLoading={isSendingInterview}
        onConfirm={async () => {
          if (!sendForInterviewConfirm.type) {
            toast.error("Please select one");
            return;
          }

          if (!sendForInterviewConfirm.projectId || !sendForInterviewConfirm.candidateId) {
            toast.error("Missing candidate or project information");
            return;
          }

          try {
            const mappedType = sendForInterviewConfirm.type === "screening"
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
