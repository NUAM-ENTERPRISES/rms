import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAppSelector } from "@/app/hooks";
import {
  Loader2,
  AlertCircle,
  User,
  Briefcase,
  Calendar,
  ChevronLeft,
  CalendarCheck,
  Pencil,
  MessageCircle,
  ChevronDown,
  GraduationCap,
  Clock,
  CheckCircle2,
  Circle,
  PlayCircle
} from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import ImageViewer from "@/components/molecules/ImageViewer";
import { 
  useGetScreeningQuery, 
  useUpdateScreeningDecisionMutation, 
  useAssignToMainScreeningMutation, 
  useGetCandidateProjectHistoryQuery 
} from "../data";
import { useCreateTrainingAssignmentMutation } from "../../training/data";
import { SCREENING_DECISION } from "../../types";
import { cn } from "@/lib/utils";
import { AssignToTrainerDialog } from "../../training/components/AssignToTrainerDialog";
import { ConfirmationDialog } from "@/components/ui";
import InterviewHistory from "@/components/molecules/InterviewHistory";
import EditScreeningDialog from "../components/EditScreeningDialog";

export default function ScreeningDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAppSelector((state) => state.auth.user);
  const isTrainer = currentUser?.roles?.some((r: any) => 
    typeof r === "string" ? r === "Screening Trainer" : r.name === "Screening Trainer"
  );

  const { data: screeningResponse, isLoading, error, refetch } = useGetScreeningQuery(id as string, {
    skip: !id,
  });

  // response shape can be either ApiResponse<Screening> or Screening directly depending on network and endpoint adapters
  const selectedInterview = (screeningResponse as any)?.data ?? screeningResponse;

  const { data: historyData, isLoading: isLoadingHistory } = useGetCandidateProjectHistoryQuery(
    selectedInterview?.candidateProjectMap?.id ? { candidateProjectMapId: selectedInterview.candidateProjectMap.id } : undefined,
    { skip: !selectedInterview?.candidateProjectMap?.id }
  );

  const [assignToTrainerOpen, setAssignToTrainerOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionValue, setDecisionValue] = useState<SCREENING_DECISION | null>(null);

  const [sendForInterviewConfirm, setSendForInterviewConfirm] = useState<{
    isOpen: boolean;
    candidateId?: string;
    candidateName?: string;
    projectId?: string;
    screeningId?: string;
    projectName?: string;
  }>({ isOpen: false });

  const [assignToMainScreening, { isLoading: isAssigningMain }] = useAssignToMainScreeningMutation();
  const [updateScreeningDecision, { isLoading: isUpdatingDecision }] = useUpdateScreeningDecisionMutation();
  const [createTrainingAssignment, { isLoading: isCreatingTraining }] = useCreateTrainingAssignmentMutation();

  const openDecisionModal = (value: SCREENING_DECISION) => {
    setDecisionValue(value);
    setIsDecisionModalOpen(true);
  };

  const handleUpdateDecision = async () => {
    if (!selectedInterview || !decisionValue) return;
    try {
      await updateScreeningDecision({
        id: selectedInterview.id,
        data: { decision: decisionValue, remarks: "" }
      }).unwrap();
      toast.success("Decision updated successfully");
      setIsDecisionModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update decision");
    }
  };

  const getDecisionBadge = (decision?: string) => {
    switch (decision) {
      case SCREENING_DECISION.APPROVED:
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 shadow-none">Approved</Badge>;
      case SCREENING_DECISION.REJECTED:
        return <Badge className="bg-rose-100 text-rose-700 border-rose-200 shadow-none">Rejected</Badge>;
      case SCREENING_DECISION.ON_HOLD:
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200 shadow-none">On Hold</Badge>;
      case SCREENING_DECISION.NEEDS_TRAINING:
        return <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 shadow-none">Needs Training</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-600 border-slate-200 shadow-none">Pending</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const statusCode = (error as any)?.status;
  const errorMessage = (error as any)?.data?.message;

  if (error || !selectedInterview) {
    let errorTitle = "Screening Not Found";
    let errorDesc = "We couldn't find the screening session you're looking for. It may have been deleted or you may not have permission to view it.";

    if (statusCode === 403) {
      errorTitle = "Access Denied";
      errorDesc = "You do not have permission to view this screening. Contact your administrator if you believe this is incorrect.";
    } else if (statusCode === 404) {
      errorTitle = "Screening Not Found";
      errorDesc = "This screening session does not exist or may have been removed.";
    } else if (!selectedInterview && !error) {
      errorTitle = "Screening Not Available";
      errorDesc = "The screening session could not be loaded. Please check the link or try again.";
    }

    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="h-12 w-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-800">{errorTitle}</h2>
        <p className="text-slate-500 mt-2 max-w-md">
          {errorDesc}
          {errorMessage && <span> {errorMessage}</span>}
        </p>
        <Button onClick={() => navigate(-1)} className="mt-6">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const selectedProjectDetails = selectedInterview.candidateProjectMap?.project;

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-gradient-to-br from-slate-100 via-indigo-50/30 to-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm flex-shrink-0 border-b-indigo-100">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-base font-bold text-slate-800 leading-tight">Screening Details</h1>
              <p className="text-[11px] text-slate-500">
                {selectedInterview.candidateProjectMap?.candidate?.firstName} {selectedInterview.candidateProjectMap?.candidate?.lastName} • {selectedProjectDetails?.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!selectedInterview.conductedAt && isTrainer && (
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
                onClick={() => navigate(`/screenings/${selectedInterview.id}/conduct`)}
              >
                <CalendarCheck className="h-4 w-4 mr-1.5" />
                Conduct
              </Button>
            )}

            {([SCREENING_DECISION.ON_HOLD, SCREENING_DECISION.NEEDS_TRAINING] as string[]).includes(
              selectedInterview.decision || ""
            ) && isTrainer && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-[11px] font-bold border-slate-300 text-slate-700 hover:bg-slate-100 gap-2 px-3 shadow-none"
                  >
                    Update Decision
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1 rounded-xl shadow-lg border-slate-200">
                  {[
                    { value: SCREENING_DECISION.APPROVED, label: "Approve Candidate" },
                    { value: SCREENING_DECISION.NEEDS_TRAINING, label: "Needs Training" },
                    { value: SCREENING_DECISION.REJECTED, label: "Reject Candidate" },
                    { value: SCREENING_DECISION.ON_HOLD, label: "Keep On Hold" },
                  ].map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => openDecisionModal(option.value as SCREENING_DECISION)}
                      className="text-xs py-2 cursor-pointer"
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {selectedInterview.decision === SCREENING_DECISION.APPROVED && 
             selectedInterview.status === "completed" && isTrainer && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setSendForInterviewConfirm({
                  isOpen: true,
                  candidateId: selectedInterview.candidateProjectMap?.candidate.id,
                  candidateName: `${selectedInterview.candidateProjectMap?.candidate?.firstName} ${selectedInterview.candidateProjectMap?.candidate?.lastName}`,
                  projectId: selectedInterview.candidateProjectMap?.project.id,
                  screeningId: selectedInterview.id,
                  projectName: selectedProjectDetails?.title
                })}
              >
                Assign to Main Interview
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="max-w-5xl mx-auto p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Candidate Info */}
              <Card className="border-0 shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-blue-500 px-4 pt-3 pb-2">
                  <h3 className="text-xs font-bold flex items-center gap-1.5 text-white uppercase tracking-wider">
                    <span className="bg-white/20 rounded p-0.5"><User className="h-3 w-3 text-white" /></span>
                    Candidate Profile
                  </h3>
                </div>
                <CardContent className="p-4 bg-white">
                  <div className="flex gap-3">
                    <ImageViewer
                      src={selectedInterview.candidateProjectMap?.candidate?.profileImage}
                      fallbackSrc={selectedInterview.candidateProjectMap?.candidate?.profileImage}
                      title={`${selectedInterview.candidateProjectMap?.candidate?.firstName} ${selectedInterview.candidateProjectMap?.candidate?.lastName}`}
                      className="h-16 w-16 rounded-xl shadow-md ring-2 ring-indigo-100 shrink-0"
                      enableHoverPreview={true}
                    />
                    <div className="flex-1 grid grid-cols-1 gap-1.5 min-w-0">
                      <div>
                        <p className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">Full Name</p>
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {selectedInterview.candidateProjectMap?.candidate?.firstName} {selectedInterview.candidateProjectMap?.candidate?.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">Email</p>
                        <p className="text-xs text-slate-600 truncate">{selectedInterview.candidateProjectMap?.candidate?.email}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">Phone</p>
                        <p className="text-xs text-slate-600">{selectedInterview.candidateProjectMap?.candidate?.phone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Project Info */}
              <Card className="border-0 shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-violet-500 px-4 pt-3 pb-2">
                  <h3 className="text-xs font-bold flex items-center gap-1.5 text-white uppercase tracking-wider">
                    <span className="bg-white/20 rounded p-0.5"><Briefcase className="h-3 w-3 text-white" /></span>
                    Project & Role
                  </h3>
                </div>
                <CardContent className="p-4 bg-white">
                  <div className="space-y-2">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-purple-400 tracking-wider">Project</p>
                      <p className="text-sm font-semibold text-slate-800 truncate">{selectedProjectDetails?.title || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-purple-400 tracking-wider">Role Designation</p>
                      <p className="text-xs text-slate-700 font-medium">{selectedInterview.candidateProjectMap?.roleNeeded?.designation || "N/A"}</p>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-purple-100">
                      <div>
                        <p className="text-[9px] uppercase font-bold text-purple-400 tracking-wider">Priority</p>
                        <Badge className="capitalize text-[9px] px-1.5 h-4 mt-0.5 bg-purple-100 text-purple-700 border-purple-200 shadow-none">{selectedProjectDetails?.priority || 'normal'}</Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] uppercase font-bold text-purple-400 tracking-wider">Project Type</p>
                        <p className="text-xs font-medium capitalize text-slate-700">{selectedProjectDetails?.projectType || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Interview Session Details */}
            <Card className="border-0 shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-4 pt-3 pb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold flex items-center gap-1.5 text-white uppercase tracking-wider">
                  <span className="bg-white/20 rounded p-0.5"><Calendar className="h-3 w-3 text-white" /></span>
                  Session Details
                </h3>
                {isTrainer && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] text-white/80 hover:text-white hover:bg-white/20 gap-1 px-2"
                    onClick={() => setIsEditDialogOpen(true)}
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </Button>
                )}
              </div>
              <CardContent className="p-4 bg-white">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5">
                    <p className="text-[9px] uppercase font-bold text-blue-400 tracking-wider mb-1">Status</p>
                    <Badge className={cn(
                      "text-[10px] px-2 py-0.5 border-0 font-bold",
                      selectedInterview.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : 
                      selectedInterview.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                      'bg-slate-100 text-slate-700'
                    )}>
                      {selectedInterview.status?.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="bg-violet-50 border border-violet-100 rounded-lg p-2.5">
                    <p className="text-[9px] uppercase font-bold text-violet-400 tracking-wider mb-1">Scheduled At</p>
                    <p className="text-xs font-semibold text-slate-800">
                      {selectedInterview.scheduledTime
                        ? format(new Date(selectedInterview.scheduledTime), "MMM d, yyyy 'at' h:mm a")
                        : "Not scheduled"}
                    </p>
                  </div>

                  <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-2.5">
                    <p className="text-[9px] uppercase font-bold text-cyan-500 tracking-wider mb-1">Mode</p>
                    <p className="text-xs font-semibold text-slate-800 capitalize">
                      {selectedInterview.mode?.replace("_", " ")}
                    </p>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
                    <p className="text-[9px] uppercase font-bold text-emerald-500 tracking-wider mb-1">Outcome</p>
                    {getDecisionBadge(selectedInterview.decision)}
                  </div>
                </div>

                {selectedInterview.mode === 'video' && selectedInterview.meetingLink && (
                  <div className="mt-3 p-2.5 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">Video Meeting Link</p>
                      <a href={selectedInterview.meetingLink} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline truncate block">
                        {selectedInterview.meetingLink}
                      </a>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-green-600 hover:bg-green-100 rounded-full shrink-0"
                      onClick={() => {
                        const phone = selectedInterview.candidateProjectMap?.candidate?.phone;
                        if (phone) {
                          const msg = `Hello ${selectedInterview.candidateProjectMap?.candidate?.firstName}, here is your interview link: ${selectedInterview.meetingLink}`;
                          window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                        }
                      }}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes & Feedback */}
            {selectedInterview.notes && (
              <Card className="border-0 shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-4 pt-3 pb-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Interview Notes & Feedback</h3>
                </div>
                <CardContent className="p-4 bg-white">
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {selectedInterview.notes}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Checklist items if any */}
            {(selectedInterview.checklistItems?.length ?? 0) > 0 && selectedInterview.checklistItems && (
              <Card className="border-0 shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-4 pt-3 pb-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Evaluation Checklist</h3>
                </div>
                <CardContent className="p-4 bg-white">
                  <div className="space-y-1.5">
                    {selectedInterview.checklistItems.map((ci: any) => (
                      <div key={ci.id} className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-lg border",
                        ci.passed ? "bg-emerald-50/50 border-emerald-100" : "bg-rose-50/50 border-rose-100"
                      )}>
                        <div className="flex-1 mr-3 min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">{ci.criterion}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest">{ci.category}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn("text-xs font-bold", ci.passed ? "text-emerald-600" : "text-rose-500")}>{ci.score}%</span>
                          <Badge className={cn("text-[9px] px-1.5 h-4 shadow-none", ci.passed ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-rose-100 text-rose-700 border-rose-200")}>
                            {ci.passed ? "Pass" : "Fail"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Training Assignments */}
            {(selectedInterview.trainingAssignments?.length ?? 0) > 0 && (
              <Card className="border-0 shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-teal-500 to-emerald-500 px-4 pt-3 pb-2 flex items-center justify-between">
                  <h3 className="text-xs font-bold flex items-center gap-1.5 text-white uppercase tracking-wider">
                    <span className="bg-white/20 rounded p-0.5"><GraduationCap className="h-3 w-3 text-white" /></span>
                    Training History
                  </h3>
                  <Badge className="bg-white/20 text-white border-0 text-[10px] font-bold shadow-none">
                    {selectedInterview.trainingAssignments.length} Attempt{selectedInterview.trainingAssignments.length > 1 ? 's' : ''}
                  </Badge>
                </div>
                <CardContent className="p-4 bg-white space-y-3">
                  {selectedInterview.trainingAssignments
                    .slice()
                    .sort((a: any, b: any) => (a.trainingAttempt || 0) - (b.trainingAttempt || 0))
                    .map((assignment: any, idx: number) => {
                      const isCompleted = assignment.status === 'completed';
                      const isAssigned = assignment.status === 'assigned';
                      const isInProgress = assignment.status === 'in_progress';
                      return (
                        <div key={assignment.id} className={cn(
                          "rounded-xl border overflow-hidden",
                          isCompleted ? "border-emerald-200" : isInProgress ? "border-amber-200" : "border-blue-200"
                        )}>
                          {/* Assignment Header */}
                          <div className={cn(
                            "px-4 py-2.5 flex items-center justify-between",
                            isCompleted ? "bg-emerald-50" : isInProgress ? "bg-amber-50" : "bg-blue-50"
                          )}>
                            <div className="flex items-center gap-2.5">
                              <div className={cn(
                                "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold",
                                isCompleted ? "bg-emerald-500 text-white" : isInProgress ? "bg-amber-500 text-white" : "bg-blue-500 text-white"
                              )}>
                                {assignment.trainingAttempt || idx + 1}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-800">
                                  Training Attempt {assignment.trainingAttempt || idx + 1}
                                  <span className="text-slate-400 font-normal"> of {assignment.trainingAttemptTotal || selectedInterview.trainingAssignments.length}</span>
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  Assigned {assignment.assignedAt ? format(new Date(assignment.assignedAt), "MMM d, yyyy 'at' h:mm a") : "—"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                              {isInProgress && <PlayCircle className="h-3.5 w-3.5 text-amber-500" />}
                              {isAssigned && <Circle className="h-3.5 w-3.5 text-blue-400" />}
                              <Badge className={cn(
                                "text-[9px] px-2 py-0.5 font-bold shadow-none border-0",
                                isCompleted ? "bg-emerald-100 text-emerald-700" :
                                isInProgress ? "bg-amber-100 text-amber-700" :
                                "bg-blue-100 text-blue-700"
                              )}>
                                {assignment.status?.replace(/_/g, ' ').toUpperCase()}
                              </Badge>
                            </div>
                          </div>

                          {/* Assignment Details */}
                          <div className="px-4 py-3 space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div className="bg-slate-50 rounded-lg p-2">
                                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Type</p>
                                <p className="text-xs font-semibold text-slate-700 capitalize">{assignment.trainingType || '—'}</p>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-2">
                                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Priority</p>
                                <Badge className={cn(
                                  "text-[9px] px-1.5 h-4 mt-0.5 shadow-none capitalize",
                                  assignment.priority === 'high' ? "bg-rose-100 text-rose-700 border-rose-200" :
                                  assignment.priority === 'medium' ? "bg-amber-100 text-amber-700 border-amber-200" :
                                  "bg-slate-100 text-slate-600 border-slate-200"
                                )}>{assignment.priority || 'normal'}</Badge>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-2">
                                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Started</p>
                                <p className="text-xs font-semibold text-slate-700">
                                  {assignment.startedAt ? format(new Date(assignment.startedAt), "MMM d, yyyy") : "Not yet"}
                                </p>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-2">
                                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Completed</p>
                                <p className="text-xs font-semibold text-slate-700">
                                  {assignment.completedAt ? format(new Date(assignment.completedAt), "MMM d, yyyy") : "Pending"}
                                </p>
                              </div>
                            </div>

                            {assignment.focusAreas?.length > 0 && (
                              <div>
                                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">Focus Areas</p>
                                <div className="flex flex-wrap gap-1">
                                  {assignment.focusAreas.map((area: string, i: number) => (
                                    <Badge key={i} className="text-[9px] bg-teal-50 text-teal-700 border-teal-200 shadow-none">{area}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Training Sessions */}
                            {(assignment.trainingSessions?.length ?? 0) > 0 && (
                              <div>
                                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-2">Training Sessions</p>
                                <div className="space-y-2">
                                  {assignment.trainingSessions
                                    .slice()
                                    .sort((a: any, b: any) => new Date(a.sessionDate || a.createdAt).getTime() - new Date(b.sessionDate || b.createdAt).getTime())
                                    .map((session: any, sIdx: number) => {
                                      const sessionCompleted = !!session.completedAt;
                                      const rating = session.performanceRating ? Number(session.performanceRating) : null;
                                      return (
                                        <div key={session.id} className={cn(
                                          "rounded-lg border p-3",
                                          sessionCompleted ? "bg-emerald-50/40 border-emerald-100" : "bg-slate-50/60 border-slate-100"
                                        )}>
                                          <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                              <div className={cn(
                                                "h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold",
                                                sessionCompleted ? "bg-emerald-500 text-white" : "bg-slate-300 text-white"
                                              )}>
                                                {sIdx + 1}
                                              </div>
                                              <span className="text-xs font-semibold text-slate-700">Session {sIdx + 1}</span>
                                              {sessionCompleted && (
                                                <Badge className="text-[8px] bg-emerald-100 text-emerald-600 border-emerald-200 shadow-none h-4 px-1.5">Completed</Badge>
                                              )}
                                            </div>
                                            {rating !== null && (
                                              <Badge className={cn(
                                                "text-[10px] font-bold px-2 py-0.5 shadow-none border-0",
                                                rating >= 80 ? "bg-emerald-100 text-emerald-700" :
                                                rating >= 60 ? "bg-amber-100 text-amber-700" :
                                                "bg-rose-100 text-rose-700"
                                              )}>
                                                Rating: {rating}/100
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            <div className="flex items-center gap-1.5">
                                              <Calendar className="h-3 w-3 text-slate-400" />
                                              <span className="text-[10px] text-slate-600">
                                                {session.sessionDate ? format(new Date(session.sessionDate), "MMM d, yyyy") : "—"}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                              <Clock className="h-3 w-3 text-slate-400" />
                                              <span className="text-[10px] text-slate-600">Duration: {session.duration || 0} min</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-[10px] text-slate-500 capitalize">Mode: {session.sessionType?.replace(/_/g, ' ') || '—'}</span>
                                            </div>
                                          </div>
                                          {(session.notes || session.feedback) && (
                                            <div className="mt-2 pt-2 border-t border-slate-100">
                                              {session.notes && (
                                                <p className="text-[10px] text-slate-600"><span className="font-semibold">Notes:</span> {session.notes}</p>
                                              )}
                                              {session.feedback && (
                                                <p className="text-[10px] text-slate-600 mt-0.5"><span className="font-semibold">Feedback:</span> {session.feedback}</p>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            )}

                            {(assignment.trainingSessions?.length ?? 0) === 0 && (
                              <div className="text-center py-3 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                <p className="text-[10px] text-slate-400">No training sessions scheduled yet</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </CardContent>
              </Card>
            )}

            {/* History */}
            {selectedInterview.candidateProjectMap?.id && (
              <div>
                <InterviewHistory items={historyData?.data?.items} isLoading={isLoadingHistory} />
              </div>
            )}
          </div>
        </ScrollArea>

        <ConfirmationDialog
          isOpen={isDecisionModalOpen}
          onClose={() => setIsDecisionModalOpen(false)}
          title="Confirm Screening Decision"
          description={`Are you sure you want to mark this screening as ${decisionValue?.replace(/_/g, ' ')}?`}
          confirmText={isUpdatingDecision ? "Updating..." : "Update Decision"}
          cancelText="Cancel"
          isLoading={isUpdatingDecision}
          onConfirm={handleUpdateDecision}
        />

        {selectedInterview && (
          <EditScreeningDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            screeningId={selectedInterview.id}
          />
        )}

        {selectedInterview && (
          <AssignToTrainerDialog
            open={assignToTrainerOpen}
            onOpenChange={setAssignToTrainerOpen}
            onSubmit={async (data) => {
              try {
                await createTrainingAssignment({ 
                  screeningId: selectedInterview.id, 
                  candidateProjectMapId: selectedInterview.candidateProjectMap?.id || "",
                  assignedBy: currentUser?.id || "",
                  ...data 
                }).unwrap();
                toast.success("Training assigned successfully");
                setAssignToTrainerOpen(false);
                refetch();
              } catch (err: any) {
                toast.error(err?.data?.message || "Failed to assign training");
              }
            }}
            isLoading={isCreatingTraining}
            candidateName={`${selectedInterview.candidateProjectMap?.candidate?.firstName} ${selectedInterview.candidateProjectMap?.candidate?.lastName}`}
            screeningId={selectedInterview.id}
          />
        )}

        {/* Confirmation for Main Interview */}
        <ConfirmationDialog
          isOpen={sendForInterviewConfirm.isOpen}
          onClose={() => setSendForInterviewConfirm({ isOpen: false })}
          title="Assign to Main Interview"
          description={`Do you want to assign ${sendForInterviewConfirm.candidateName} to the main interview process for ${sendForInterviewConfirm.projectName}?`}
          confirmText={isAssigningMain ? "Assigning..." : "Confirm Assignment"}
          isLoading={isAssigningMain}
          onConfirm={async () => {
            if (!sendForInterviewConfirm.candidateId || !sendForInterviewConfirm.projectId) return;
            try {
              await assignToMainScreening({
                projectId: sendForInterviewConfirm.projectId,
                candidateId: sendForInterviewConfirm.candidateId,
                screeningId: sendForInterviewConfirm.screeningId,
                notes: ""
              }).unwrap();
              toast.success("Assigned to main interview successfully");
              setSendForInterviewConfirm({ isOpen: false });
              refetch();
            } catch (err: any) {
              toast.error(err?.data?.message || "Failed to assign");
            }
          }}
        />
      </div>
    </TooltipProvider>
  );
}
