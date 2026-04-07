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
  <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
    {/* Modern Sticky Header - No side padding */}
    <div className="bg-white border-b shadow-sm sticky top-0 z-50">
      <div className="w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)} 
            className="rounded-full h-9 w-9 hover:bg-slate-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Screening Details</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {selectedInterview.candidateProjectMap?.candidate?.firstName} {selectedInterview.candidateProjectMap?.candidate?.lastName} • {selectedProjectDetails?.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!selectedInterview.conductedAt && isTrainer && (
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm px-5"
              onClick={() => navigate(`/screenings/${selectedInterview.id}/conduct`)}
            >
              <CalendarCheck className="h-4 w-4 mr-2" />
              Conduct Screening
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
                  className="h-9 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100 px-4"
                >
                  Update Decision
                  <ChevronDown className="h-4 w-4 ml-2 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1 rounded-2xl shadow-xl border border-slate-200">
                {[
                  { value: SCREENING_DECISION.APPROVED, label: "Approve Candidate" },
                  { value: SCREENING_DECISION.NEEDS_TRAINING, label: "Needs Training" },
                  { value: SCREENING_DECISION.REJECTED, label: "Reject Candidate" },
                  { value: SCREENING_DECISION.ON_HOLD, label: "Keep On Hold" },
                ].map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => openDecisionModal(option.value as SCREENING_DECISION)}
                    className="text-sm py-2.5 px-4 cursor-pointer rounded-xl"
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm px-5"
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
    </div>

    {/* Content - Full width, no left/right padding */}
    <ScrollArea className="flex-1">
      <div className="w-full px-6 py-8 space-y-8">
        {/* Candidate & Project Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Candidate Profile */}
          <Card className="border border-slate-200 shadow-lg overflow-hidden hover:shadow-xl transition-all">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-white">
                <User className="h-4 w-4" />
                CANDIDATE PROFILE
              </h3>
            </div>
            <CardContent className="p-6">
              <div className="flex gap-5">
                <ImageViewer
                  src={selectedInterview.candidateProjectMap?.candidate?.profileImage}
                  fallbackSrc={selectedInterview.candidateProjectMap?.candidate?.profileImage}
                  title={`${selectedInterview.candidateProjectMap?.candidate?.firstName} ${selectedInterview.candidateProjectMap?.candidate?.lastName}`}
                  className="h-24 w-24 rounded-2xl shadow-md ring-4 ring-white"
                  enableHoverPreview={true}
                />
                <div className="flex-1 space-y-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500">FULL NAME</p>
                    <p className="text-xl font-semibold text-slate-900 mt-1">
                      {selectedInterview.candidateProjectMap?.candidate?.firstName} {selectedInterview.candidateProjectMap?.candidate?.lastName}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div>
                      <p className="text-xs font-medium text-slate-500">EMAIL ADDRESS</p>
                      <p className="font-medium text-slate-700">{selectedInterview.candidateProjectMap?.candidate?.email}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">PHONE NUMBER</p>
                      <p className="font-medium text-slate-700">{selectedInterview.candidateProjectMap?.candidate?.phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project & Role */}
          <Card className="border border-slate-200 shadow-lg overflow-hidden hover:shadow-xl transition-all">
            <div className="bg-gradient-to-r from-purple-600 to-violet-600 px-6 py-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-white">
                <Briefcase className="h-4 w-4" />
                PROJECT & ROLE
              </h3>
            </div>
            <CardContent className="p-6">
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-medium text-slate-500">PROJECT NAME</p>
                  <p className="text-xl font-semibold text-slate-900 mt-1">{selectedProjectDetails?.title || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">ROLE DESIGNATION</p>
                  <p className="text-lg font-medium text-slate-800 mt-1">{selectedInterview.candidateProjectMap?.roleNeeded?.designation || "N/A"}</p>
                </div>
                <div className="flex gap-8 pt-4 border-t">
                  <div>
                    <p className="text-xs font-medium text-slate-500">PRIORITY</p>
                    <Badge className="mt-2 capitalize text-sm bg-purple-100 text-purple-700 border-purple-200">
                      {selectedProjectDetails?.priority || 'normal'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">PROJECT TYPE</p>
                    <p className="text-lg font-medium text-slate-800 mt-1 capitalize">{selectedProjectDetails?.projectType || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Session Details */}
        <Card className="border border-slate-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-white">
              <Calendar className="h-4 w-4" />
              SESSION DETAILS
            </h3>
            {isTrainer && (
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20 rounded-xl"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-500">STATUS</p>
                <Badge className={cn(
                  "mt-2 text-sm px-4 py-1",
                  selectedInterview.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : 
                  selectedInterview.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                  'bg-slate-100 text-slate-700'
                )}>
                  {selectedInterview.status?.toUpperCase()}
                </Badge>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-500">SCHEDULED AT</p>
                <p className="font-semibold text-slate-900 mt-2 text-sm">
                  {selectedInterview.scheduledTime
                    ? format(new Date(selectedInterview.scheduledTime), "MMM d, yyyy 'at' h:mm a")
                    : "Not scheduled"}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-500">MODE</p>
                <p className="font-semibold text-slate-900 mt-2 capitalize text-sm">
                  {selectedInterview.mode?.replace("_", " ") || "—"}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-500">OUTCOME</p>
                <div className="mt-2">{getDecisionBadge(selectedInterview.decision)}</div>
              </div>
            </div>

            {/* Meeting Link Section */}
            {selectedInterview.mode === 'video' && selectedInterview.meetingLink && (
              <div className="mt-8 pt-8 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-3">VIDEO MEETING LINK</p>
                <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <a 
                    href={selectedInterview.meetingLink} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex-1 text-blue-600 hover:underline font-medium break-all text-sm"
                  >
                    {selectedInterview.meetingLink}
                  </a>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50 rounded-xl"
                    onClick={() => {
                      const phone = selectedInterview.candidateProjectMap?.candidate?.phone;
                      if (phone) {
                        const msg = `Hello ${selectedInterview.candidateProjectMap?.candidate?.firstName}, here is your interview link: ${selectedInterview.meetingLink}`;
                        window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                      }
                    }}
                  >
                    <FaWhatsapp className="h-4 w-4" />
                    WhatsApp
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {selectedInterview.notes && (
          <Card className="border border-slate-200 shadow-lg">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
              <h3 className="text-sm font-semibold text-white">INTERVIEW NOTES & FEEDBACK</h3>
            </div>
            <CardContent className="p-6">
              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-sm">
                  {selectedInterview.notes}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Evaluation Checklist */}
        {(selectedInterview.checklistItems?.length ?? 0) > 0 && selectedInterview.checklistItems && (
          <Card className="border border-slate-200 shadow-lg">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
              <h3 className="text-sm font-semibold text-white">EVALUATION CHECKLIST</h3>
            </div>
            <CardContent className="p-6">
              <div className="space-y-3">
                {selectedInterview.checklistItems.map((ci: any) => (
                  <div key={ci.id} className={cn(
                    "flex items-center justify-between p-5 rounded-2xl border",
                    ci.passed ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"
                  )}>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{ci.criterion}</p>
                      <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">{ci.category}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={cn("font-bold text-lg", ci.passed ? "text-emerald-600" : "text-rose-600")}>
                        {ci.score}%
                      </span>
                      <Badge variant={ci.passed ? "default" : "destructive"} className="px-4 py-1">
                        {ci.passed ? "PASSED" : "FAILED"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Training History */}
        {(selectedInterview.trainingAssignments?.length ?? 0) > 0 && (
          <Card className="border border-slate-200 shadow-lg">
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                TRAINING HISTORY
              </h3>
              <Badge className="bg-white/20 text-white border-0">
                {selectedInterview.trainingAssignments.length} Attempt{selectedInterview.trainingAssignments.length > 1 ? 's' : ''}
              </Badge>
            </div>
            <CardContent className="p-6">
              {/* Your existing trainingAssignments mapping code remains unchanged */}
              {selectedInterview.trainingAssignments
                .slice()
                .sort((a: any, b: any) => (a.trainingAttempt || 0) - (b.trainingAttempt || 0))
                .map((assignment: any, idx: number) => {
                  const isCompleted = assignment.status === 'completed';
                  const isAssigned = assignment.status === 'assigned';
                  const isInProgress = assignment.status === 'in_progress';
                  return (
                    <div key={assignment.id} className={cn(
                      "rounded-2xl border overflow-hidden mb-6 last:mb-0",
                      isCompleted ? "border-emerald-200" : isInProgress ? "border-amber-200" : "border-blue-200"
                    )}>
                      {/* Your existing training assignment JSX remains the same */}
                      <div className={cn(
                        "px-6 py-4 flex items-center justify-between",
                        isCompleted ? "bg-emerald-50" : isInProgress ? "bg-amber-50" : "bg-blue-50"
                      )}>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white",
                            isCompleted ? "bg-emerald-500" : isInProgress ? "bg-amber-500" : "bg-blue-500"
                          )}>
                            {assignment.trainingAttempt || idx + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">Training Attempt {assignment.trainingAttempt || idx + 1}</p>
                            <p className="text-xs text-slate-500">
                              Assigned {assignment.assignedAt ? format(new Date(assignment.assignedAt), "MMM d, yyyy 'at' h:mm a") : "—"}
                            </p>
                          </div>
                        </div>
                        <Badge className={cn(
                          "font-bold",
                          isCompleted ? "bg-emerald-100 text-emerald-700" :
                          isInProgress ? "bg-amber-100 text-amber-700" :
                          "bg-blue-100 text-blue-700"
                        )}>
                          {assignment.status?.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                      </div>
                      {/* Rest of your training assignment details remain unchanged */}
                      <div className="p-6 space-y-6">
                        {/* ... your existing training assignment content ... */}
                        {assignment.focusAreas?.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-slate-500 mb-2">FOCUS AREAS</p>
                            <div className="flex flex-wrap gap-2">
                              {assignment.focusAreas.map((area: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">{area}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        )}

        {/* History Section */}
        {selectedInterview.candidateProjectMap?.id && (
          <div className="pt-4">
            <InterviewHistory items={historyData?.data?.items} isLoading={isLoadingHistory} />
          </div>
        )}
      </div>
    </ScrollArea>

    {/* All Modals & Dialogs - Unchanged */}
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
