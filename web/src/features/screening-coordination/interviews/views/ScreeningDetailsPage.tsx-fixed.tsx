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
  ChevronDown
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
  const isTrainer = currentUser?.roles?.some(r => r.name === "Screening Trainer");

  const { data: screeningResponse, isLoading, error, refetch } = useGetScreeningQuery(id as string, {
    skip: !id,
  });
  
  const selectedInterview = screeningResponse?.data;

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
        data: { decision: decisionValue, notes: "" }
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

  if (error || !selectedInterview) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="h-12 w-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-800">Screening Not Found</h2>
        <p className="text-slate-500 mt-2 max-w-md">
          We couldn't find the screening session you're looking for. It may have been deleted or you may not have permission to view it.
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
      <div className="h-screen flex flex-col bg-slate-50/50 overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Screening Details</h1>
              <p className="text-xs text-slate-500">
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
          <div className="max-w-5xl mx-auto p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Candidate Info */}
              <Card className="border shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-slate-700">
                    <User className="h-4 w-4 text-indigo-500" />
                    Candidate Profile
                  </h3>
                  <div className="flex gap-4">
                    <ImageViewer
                      src={selectedInterview.candidateProjectMap?.candidate?.profileImage}
                      fallbackSrc={selectedInterview.candidateProjectMap?.candidate?.profileImage}
                      title={`${selectedInterview.candidateProjectMap?.candidate?.firstName} ${selectedInterview.candidateProjectMap?.candidate?.lastName}`}
                      className="h-24 w-24 rounded-xl shadow-sm"
                      enableHoverPreview={true}
                    />
                    <div className="flex-1 space-y-2">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Full Name</p>
                        <p className="font-semibold text-slate-800">
                          {selectedInterview.candidateProjectMap?.candidate?.firstName} {selectedInterview.candidateProjectMap?.candidate?.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Email Address</p>
                        <p className="text-sm text-slate-600 truncate">{selectedInterview.candidateProjectMap?.candidate?.email}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Phone Number</p>
                        <p className="text-sm text-slate-600">{selectedInterview.candidateProjectMap?.candidate?.phone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Project Info */}
              <Card className="border shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-slate-700">
                    <Briefcase className="h-4 w-4 text-purple-500" />
                    Project & Role
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Project</p>
                      <p className="font-semibold text-slate-800">{selectedProjectDetails?.title || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Role Designation</p>
                      <p className="text-sm text-slate-700 font-medium">{selectedInterview.candidateProjectMap?.roleNeeded?.designation || "N/A"}</p>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter">Priority</p>
                        <Badge variant="outline" className="capitalize text-[10px]">{selectedProjectDetails?.priority || 'normal'}</Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter">Project Type</p>
                        <p className="text-xs font-medium capitalize text-slate-700">{selectedProjectDetails?.projectType || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Interview Session Details */}
            <Card className="border shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    Session Details
                  </h3>
                  {isTrainer && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-blue-600 hover:bg-blue-50 gap-1.5"
                      onClick={() => setIsEditDialogOpen(true)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Status</p>
                    <div className="mt-1">
                      <Badge className={cn(
                        "text-[10px] px-2 py-0.5 border-0 font-bold",
                        selectedInterview.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : 
                        selectedInterview.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                        'bg-slate-100 text-slate-700'
                      )}>
                        {selectedInterview.status?.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Scheduled At</p>
                    <p className="text-sm font-medium text-slate-800 mt-1">
                      {selectedInterview.scheduledTime
                        ? format(new Date(selectedInterview.scheduledTime), "MMM d, yyyy 'at' h:mm a")
                        : "Not scheduled"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Interview Mode</p>
                    <p className="text-sm font-medium text-slate-800 mt-1 capitalize">
                      {selectedInterview.mode?.replace("_", " ")}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Outcome</p>
                    <div className="mt-1">{getDecisionBadge(selectedInterview.decision)}</div>
                  </div>
                </div>

                {selectedInterview.mode === 'video' && selectedInterview.meetingLink && (
                  <div className="mt-6 p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-[10px] uppercase font-bold text-indigo-400">Video Meeting Link</p>
                      <a href={selectedInterview.meetingLink} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline truncate block">
                        {selectedInterview.meetingLink}
                      </a>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-green-600 hover:bg-green-100 rounded-full"
                      onClick={() => {
                        const phone = selectedInterview.candidateProjectMap?.candidate?.phone;
                        if (phone) {
                          const msg = `Hello ${selectedInterview.candidateProjectMap?.candidate?.firstName}, here is your interview link: ${selectedInterview.meetingLink}`;
                          window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                        }
                      }}
                    >
                      <MessageCircle className="h-5 w-5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes & Feedback */}
            {selectedInterview.notes && (
              <Card className="border shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold mb-4 text-slate-700">Interview Notes & Feedback</h3>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {selectedInterview.notes}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Checklist items if any */}
            {(selectedInterview.checklistItems?.length ?? 0) > 0 && selectedInterview.checklistItems && (
              <Card className="border shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold mb-4 text-slate-700">Evaluation Checklist</h3>
                  <div className="space-y-3">
                    {selectedInterview.checklistItems.map((ci: any) => (
                      <div key={ci.id} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50/30">
                        <div className="flex-1 mr-4">
                          <p className="text-sm font-medium text-slate-700">{ci.criterion}</p>
                          <p className="text-[11px] text-slate-400 uppercase tracking-widest">{ci.category}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-bold text-indigo-600">{ci.score}%</span>
                          <Badge variant={ci.passed ? "default" : "destructive"} className="text-[10px] px-2 h-5">
                            {ci.passed ? "Pass" : "Fail"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* History */}
            {selectedInterview.candidateProjectMap?.id && (
              <div className="pt-4">
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
