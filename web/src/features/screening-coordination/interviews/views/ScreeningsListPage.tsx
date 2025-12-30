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
  Plus,
  CheckCircle2,
  AlertTriangle,
  FileText,
  CheckCircle,
  Upload
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
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

  const getDocStatus = (interview: any) => {
    if (!interview) return null;
    
    const candidateProjectMap = interview.candidateProjectMap;
    const requiredDocs = candidateProjectMap?.project?.documentRequirements || [];
    const uploadedDocs = candidateProjectMap?.documentVerifications || [];
    
    const docStatusList = requiredDocs.map((req: any) => {
      const uploaded = uploadedDocs.find((u: any) => 
        u.document?.docType?.toLowerCase() === req.docType?.toLowerCase()
      );
      return {
        ...req,
        isUploaded: !!uploaded,
        status: uploaded?.status || 'pending'
      };
    });

    const isNoneUploaded = requiredDocs.length > 0 && uploadedDocs.length === 0;
    const isAllUploaded = requiredDocs.length > 0 && docStatusList.every((d: any) => d.isUploaded);
    
    return {
      docStatusList,
      isNoneUploaded,
      isAllUploaded,
      requiredDocs
    };
  };

  const docStatus = useMemo(() => getDocStatus(selectedInterview), [selectedInterview]);

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

  const renderDocStatusIcon = (interview: any = selectedInterview) => {
    const status = interview === selectedInterview ? docStatus : getDocStatus(interview);
    if (!status || (status.requiredDocs.length === 0 && status.docStatusList.length === 0)) return null;

    const { docStatusList, isNoneUploaded, isAllUploaded } = status;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 cursor-help",
              isAllUploaded ? "bg-green-50 text-green-600" : isNoneUploaded ? "bg-red-50 text-red-600 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.3)]" : "bg-amber-50 text-amber-600",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {isAllUploaded ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : isNoneUploaded ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="w-64 p-3 bg-white border shadow-lg rounded-xl">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900">Project Documents</h4>
              {isAllUploaded ? (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 text-[10px] h-5">Complete</Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-[10px] h-5">Pending</Badge>
              )}
            </div>
            
            <div className="space-y-2">
              {docStatusList.map((doc: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2 text-slate-600">
                    {doc.isUploaded ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-amber-500" />
                    )}
                    <span className="capitalize">{doc.docType.replace(/_/g, ' ')}</span>
                  </div>
                  <span className={cn(
                    "font-medium",
                    doc.isUploaded ? "text-green-600" : "text-amber-600"
                  )}>
                    {doc.isUploaded ? "Uploaded" : "Missing"}
                  </span>
                </div>
              ))}
            </div>

            {currentUser?.roles?.includes("recruiter") && (
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full h-7 text-[10px] text-black gap-1.5 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                onClick={(e) => {
                  e.stopPropagation();
                  const pId = interview?.candidateProjectMap?.project?.id;
                  const cId = interview?.candidateProjectMap?.candidate?.id || interview?.candidate?.id;
                  if (pId && cId) {
                    navigate(`/recruiter-docs/${pId}/${cId}`);
                  }
                }}
              >
                <Upload className="h-3 w-3" />
                Upload Documents
              </Button>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
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
    <TooltipProvider>
      <div className="h-screen flex flex-col overflow-hidden overflow-x-hidden max-w-full bg-slate-50/50">
      {/* Page Title */}
     <div className="px-6 py-4 border-b bg-white/80 backdrop-blur-xl shadow-sm sticky top-0 z-20 overflow-hidden flex-shrink-0">
  <div className="flex items-center justify-between max-w-7xl mx-auto min-w-0 w-full gap-4">
    {/* Logo + Title */}
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div className="relative group flex-shrink-0">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl blur-lg opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
        {/* Icon container */}
        <div className="relative p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
          <Clipboard className="h-6 w-6 text-white" />
        </div>
      </div>

      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          Screenings
        </h1>
        <p className="text-sm text-slate-500">
          Manage candidate screening sessions
        </p>
      </div>
    </div>

    {/* Status indicator */}
    <div className="text-xs font-medium text-slate-500 flex items-center gap-2 flex-shrink-0 bg-slate-100 px-3 py-1.5 rounded-full">
      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></span>
      <span className="hidden sm:inline">Live</span>
    </div>
  </div>
</div>

      {/* Search & Filters Section */}
     <div className="w-full mx-auto pt-4 pb-4 px-4 max-w-7xl overflow-hidden flex-shrink-0">
  <Card className="border border-slate-200/60 shadow-sm bg-white rounded-xl overflow-hidden">
    <CardContent className="p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search candidates, projects, roles..."
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-10 text-sm rounded-lg border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md hover:bg-slate-100"
              onClick={() => handleSearch("")}
            >
              <X className="h-3.5 w-3.5 text-slate-400" />
            </Button>
          )}
        </div>

        {/* Decision Filter */}
        <Select
          value={filters.decision}
          onValueChange={(value) => setFilters((prev) => ({ ...prev, decision: value }))}
        >
          <SelectTrigger className="h-10 w-[150px] border-slate-200 bg-slate-50/50 rounded-lg text-sm">
            <SelectValue placeholder="All Decisions" />
          </SelectTrigger>
          <SelectContent className="rounded-lg">
            {decisionOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="text-sm"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters Button */}
        {(filters.search ||
          filters.mode !== "all" ||
          filters.decision !== "all" ||
          filters.status !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-10 px-3 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50"
            onClick={() =>
              setFilters({
                search: "",
                mode: "all",
                decision: "all",
                status: "all",
              })
            }
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
</div>

      {/* Master-Detail Layout */}
      <div className="flex-1 flex overflow-hidden px-4 pb-4 gap-4 min-w-0 w-full max-w-full">
        {/* Left Panel - Interview List */}
       <Card className="w-80 flex-shrink-0 border border-slate-200/60 shadow-sm bg-white rounded-xl overflow-hidden flex flex-col">
  <CardHeader className="p-4 border-b bg-slate-50/50 flex-shrink-0">
    <div className="flex items-center justify-between gap-2 min-w-0">
      <div className="min-w-0">
        <CardTitle className="text-base font-semibold text-slate-800">
          All Screenings
        </CardTitle>
        <CardDescription className="text-xs text-slate-500 mt-0.5">
          {displayedInterviews.length} found
        </CardDescription>
      </div>

      {/* Compact Stats */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-center">
          <div className="text-sm font-bold text-orange-600">{stats.needsTraining}</div>
          <div className="text-[9px] text-slate-400 uppercase tracking-wide">Train</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-emerald-600">{stats.approved}</div>
          <div className="text-[9px] text-slate-400 uppercase tracking-wide">Pass</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-indigo-600">{stats.completed}</div>
          <div className="text-[9px] text-slate-400 uppercase tracking-wide">Done</div>
        </div>
      </div>
    </div>
  </CardHeader>

  <CardContent className="p-0 flex-1 overflow-hidden">
    <ScrollArea className="h-full">
      <div className="p-2">
      {displayedInterviews.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
          <ClipboardCheck className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">No interviews found</p>
          <p className="text-xs mt-1">
            {filters.search || filters.mode !== "all" || filters.decision !== "all" || filters.status !== "all"
              ? "Try adjusting your filters"
              : "Screenings will appear here"}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
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
                  "w-full text-left p-3 rounded-lg border transition-all duration-200 group relative",
                  isSelected
                    ? "bg-indigo-50 border-indigo-200 shadow-sm"
                    : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200"
                )}
              >

                <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium text-sm truncate transition-colors",
                      isSelected ? "text-indigo-700" : "text-slate-800 group-hover:text-slate-900"
                    )}>
                      {candidateName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {role?.designation || "Unknown Role"}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {interview.decision === SCREENING_DECISION.APPROVED && renderDocStatusIcon(interview)}
                    {(() => {
                      const isTrainingAssigned = interview.candidateProjectMap?.subStatus?.name === "training_assigned";
                      const trainerName = getAssignedTrainerName(interview);
                      const isMainAssigned = interview.status === "assigned" || !!interview.candidateProjectMap?.mainInterviewId;

                      if (isTrainingAssigned) {
                        return (
                          <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/50 dark:text-green-300 truncate max-w-[120px]">
                            {trainerName ? `Trainer: ${trainerName}` : "Training Assigned"}
                          </Badge>
                        );
                      }

                      if (isMainAssigned) {
                        return (
                          <div className="flex items-center gap-1 overflow-hidden">
                            <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/50 dark:text-green-300 truncate max-w-[100px]">
                              Main Interview
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

                      if (interview.decision === SCREENING_DECISION.APPROVED && interview.status === "completed") {
                        const status = getDocStatus(interview);
                        const isAllUploaded = status?.isAllUploaded;

                        return (
                          <div className="flex items-center gap-1 overflow-hidden">
                            {_docVerified ? (
                              <Badge className="text-xs bg-green-100 text-green-700 truncate">Verified</Badge>
                            ) : verificationInProgress ? (
                              <Badge className="text-xs bg-amber-100 text-amber-700 truncate">Verifying</Badge>
                            ) : explicitVerificationRequired ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      disabled={!interview.candidateProjectMap?.documentVerifications?.length}
                                      className={cn(
                                        "h-8 w-8 rounded-lg",
                                        interview.candidateProjectMap?.documentVerifications?.length ? "hover:bg-amber-50" : "opacity-50 cursor-not-allowed"
                                      )}
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
                                    >
                                      <ClipboardCheck className={cn("h-4 w-4", interview.candidateProjectMap?.documentVerifications?.length ? "text-amber-600" : "text-slate-400")} />
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  {interview.candidateProjectMap?.documentVerifications?.length 
                                    ? "Send for Verification" 
                                    : "Please upload documents to enable this button"}
                                </TooltipContent>
                              </Tooltip>
                            ) : null}

                            <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  disabled={!isAllUploaded}
                                  className={cn(
                                    "h-8 w-8 rounded-lg",
                                    isAllUploaded ? "hover:bg-indigo-50" : "opacity-50 cursor-not-allowed"
                                  )}
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
                                  title={isAllUploaded ? "Assign Main Interview" : "Please complete the document verification"}
                                >
                                  <Send className={cn("h-4 w-4", isAllUploaded ? "text-indigo-600" : "text-slate-400")} />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!isAllUploaded && (
                              <TooltipContent side="top" className="text-xs">
                                Please complete the document verification
                              </TooltipContent>
                            )}
                          </Tooltip>
                          </div>
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

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium",
                      isCompleted ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                    )}
                  >
                    <ModeIcon className="h-3 w-3" />
                    <span className="capitalize">{interview.mode.replace("_", " ")}</span>
                  </span>
                  {interview.decision && getDecisionBadge(interview.decision)}
                  {verificationInProgress && !_docVerified && (
                    <Badge className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0">Verifying</Badge>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-2">
                  <Calendar className="h-3 w-3" />
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
      </div>
    </ScrollArea>
  </CardContent>
</Card> 

        {/* Right Panel - Interview Details */}
        <div className="flex-1 overflow-hidden bg-white border border-slate-200/60 rounded-xl min-w-0 min-h-0 max-w-full">
  {selectedInterview ? (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold text-slate-800">
              Screening Details
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {selectedInterview.scheduledTime
                ? `Scheduled for ${format(new Date(selectedInterview.scheduledTime), "MMMM d, yyyy 'at' h:mm a")}`
                : "Not scheduled yet"}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            {!selectedInterview.conductedAt && (
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
                onClick={() => navigate(`/screenings/${selectedInterview.id}/conduct`)}
              >
                <CalendarCheck className="h-4 w-4 mr-1.5" />
                Conduct
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
                  <Badge className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1">
                    {trainerName ? `Trainer: ${trainerName}` : "Training Assigned"}
                  </Badge>
                );
              }

              if (isMainAssigned) {
                return (
                  <div className="flex items-center gap-2">
                    <Badge className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1">
                      Main Interview
                    </Badge>
                    {(selectedInterview.decision === SCREENING_DECISION.NEEDS_TRAINING ||
                      selectedInterview.decision === SCREENING_DECISION.REJECTED) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs rounded-lg"
                        onClick={() => handleAssignToTrainer(selectedInterview)}
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1" />
                        Assign Trainer
                      </Button>
                    )}
                  </div>
                );
              }

              const selected_explicitVerificationRequired =
                selectedInterview.isDocumentVerificationRequired ||
                selectedInterview.candidateProjectMap?.isDocumentVerificationRequired;

              const selected_verificationInProgress =
                !!selectedInterview.candidateProjectMap?.subStatus?.name?.includes(
                  "verification"
                ) || selectedInterview.candidateProjectMap?.mainStatus?.name === "documents";

              const selected_docVerified =
                !!selectedInterview.isDocumentVerified ||
                !!selectedInterview.candidateProjectMap?.isDocumentVerified;

              if (
                selectedInterview.decision === SCREENING_DECISION.APPROVED &&
                selectedInterview.status === "completed"
              ) {
                const isAllUploaded = docStatus?.isAllUploaded;

                return (
                  <div className="flex items-center gap-2 flex-wrap">
                    {selected_docVerified ? (
                      <Badge className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1">
                        Verified
                      </Badge>
                    ) : selected_verificationInProgress ? (
                      <Badge className="text-xs bg-amber-100 text-amber-700 px-2 py-1">
                        Verification in progress
                      </Badge>
                    ) : selected_explicitVerificationRequired ? (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                size="sm"
                                disabled={!selectedInterview.candidateProjectMap?.documentVerifications?.length}
                                className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-50"
                                onClick={() =>
                                  setSendForVerificationConfirm({
                                    isOpen: true,
                                    candidateId:
                                      selectedInterview.candidateProjectMap?.candidate?.id,
                                    projectId:
                                      selectedInterview.candidateProjectMap?.project?.id,
                                    screeningId: selectedInterview.id,
                                    projectName: selectedInterview.candidateProjectMap?.project?.title,
                                    projectRole:
                                      selectedInterview.candidateProjectMap?.roleNeeded?.designation,
                                    notes: "",
                                    roleId: selectedInterview.candidateProjectMap?.roleNeededId,
                                  })
                                }
                              >
                                <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
                                Send for verification
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {selectedInterview.candidateProjectMap?.documentVerifications?.length 
                              ? "Send for Verification" 
                              : "Please upload documents to enable this button"}
                          </TooltipContent>
                        </Tooltip>
                        {renderDocStatusIcon()}
                      </>
                    ) : null}

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            size="sm"
                            disabled={!isAllUploaded}
                            className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
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
                                projectRole:
                                  selectedInterview.candidateProjectMap?.roleNeeded?.designation,
                                scheduledTime: selectedInterview.scheduledTime,
                                overallRating: selectedInterview.overallRating,
                                decision: selectedInterview.decision,
                                screeningId: selectedInterview.id,
                                notes: "",
                              })
                            }
                          >
                            <Send className="h-3.5 w-3.5 mr-1" />
                            Main Interview
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!isAllUploaded && (
                        <TooltipContent side="top" className="text-xs">
                          Please complete the document verification
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </div>
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
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs rounded-lg bg-red-500 hover:bg-red-600 text-white hover:text-white"
                    onClick={() => handleAssignToTrainer(selectedInterview)}
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    Assign Trainer
                  </Button>
                );
              }

              return null;
            })()}
          </div>
        </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Candidate Info */}
                 <Card className="border border-slate-200/60 shadow-sm rounded-lg">
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2 text-slate-700">
                <User className="h-4 w-4 text-indigo-500" />
                Candidate
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Name</p>
                  <p className="font-medium text-slate-800">
                    {selectedInterview.candidateProjectMap?.candidate?.firstName || ""}{" "}
                    {selectedInterview.candidateProjectMap?.candidate?.lastName || ""}
                  </p>
                </div>
                {selectedInterview.candidateProjectMap?.candidate?.email && (
                  <div>
                    <p className="text-xs text-slate-400">Email</p>
                    <p className="text-slate-700 break-all text-xs">
                      {selectedInterview.candidateProjectMap?.candidate?.email}
                    </p>
                  </div>
                )}
                {selectedInterview.candidateProjectMap?.candidate?.phone && (
                  <div>
                    <p className="text-xs text-slate-400">Phone</p>
                    <p className="text-slate-700 text-xs">
                      {selectedInterview.candidateProjectMap?.candidate?.phone}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Project & Role */}
          <Card className="border border-slate-200/60 shadow-sm rounded-lg">
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2 text-slate-700">
                <Briefcase className="h-4 w-4 text-purple-500" />
                Project & Role
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Project</p>
                  <p className="font-medium text-slate-800">
                    {selectedInterview.candidateProjectMap?.project?.title || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Role</p>
                  <p className="text-slate-700">
                    {selectedInterview.candidateProjectMap?.roleNeeded?.designation || "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Interview Details */}
        <Card className="border border-slate-200/60 shadow-sm rounded-lg">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-slate-700 mb-4">Interview Details</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-400">Mode</p>
                <p className="font-medium capitalize text-slate-800">
                  {selectedInterview.mode.replace("_", " ")}
                </p>
              </div>

              {selectedInterview.conductedAt && (
                <>
                  <div>
                    <p className="text-xs text-slate-400">Conducted</p>
                    <p className="text-slate-700">
                      {format(new Date(selectedInterview.conductedAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Decision</p>
                    <div className="mt-0.5">{getDecisionBadge(selectedInterview.decision)}</div>
                  </div>
                  {selectedInterview.overallRating != null && (
                    <div>
                      <p className="text-xs text-slate-400">Score</p>
                      <p className="font-bold text-indigo-600">
                        {selectedInterview.overallRating}%
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {selectedInterview.notes && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400 mb-1">Notes</p>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">
                  {selectedInterview.notes}
                </p>
              </div>
            )}

            {/* Checklist Items */}
            {Array.isArray(selectedInterview.checklistItems) &&
              selectedInterview.checklistItems.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Checklist Evaluation</h4>
                  {(() => {
                    type ChecklistItem = NonNullable<
                      typeof selectedInterview.checklistItems
                    >[number];
                    const grouped: Record<string, ChecklistItem[]> = selectedInterview.checklistItems.reduce(
                      (acc: Record<string, ChecklistItem[]>, item: ChecklistItem) => {
                        const key = item.category || "misc";
                        (acc[key] ||= []).push(item);
                        return acc;
                      },
                      {} as Record<string, ChecklistItem[]>
                    );

                    return Object.entries(grouped).map(([category, items]) => (
                      <div key={category} className="mb-4">
                        <div className="text-xs font-medium text-indigo-600 mb-2 capitalize">
                          {category.replace(/_/g, " ")}
                        </div>
                        <div className="space-y-2">
                          {items.map((ci: ChecklistItem) => (
                            <div
                              key={ci.id}
                              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3"
                            >
                              <div className="flex-1 min-w-0 pr-3">
                                <div className="text-sm text-slate-700">
                                  {ci.criterion}
                                </div>
                                {ci.notes && (
                                  <div className="text-xs text-slate-400 mt-0.5 truncate">
                                    {ci.notes}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <span className="text-sm font-semibold text-indigo-600">
                                  {ci.score != null ? `${ci.score}%` : "—"}
                                </span>
                                <Badge
                                  variant={ci.passed ? "default" : "destructive"}
                                  className="text-[10px] px-2"
                                >
                                  {ci.passed ? "Pass" : "Fail"}
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
           <div className="h-full flex items-center justify-center">
  <div className="text-center max-w-sm">
    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
      <ClipboardCheck className="h-8 w-8 text-slate-400" />
    </div>
    <h3 className="text-lg font-medium text-slate-700">
      No Interview Selected
    </h3>
    <p className="text-sm text-slate-500 mt-2">
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
    </TooltipProvider>
  );
}
