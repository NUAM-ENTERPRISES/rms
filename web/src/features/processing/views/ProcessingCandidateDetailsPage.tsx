import { useNavigate, useParams } from "react-router-dom";
import { useState, useMemo } from "react";
import { useGetCandidateProcessingDetailsQuery } from "@/features/processing/data/processing.endpoints";
import { useGetProcessingStepsQuery } from "@/services/processingApi";
import { useVerifyOfferLetterMutation } from "@/services/documentsApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ProcessingCandidateHeader,
  CandidateInfoCard,
  ProjectInfoCard,
  AssignmentCard,
  ProcessingStepsCard,
  ProcessingHistoryModal,
  DocumentVerificationCard,
  ProcessingOfferLetterModal,
  DataFlowModal,
  HrdModal,
  PrometricModal,
  EligibilityModal,
} from "./components";
import type { OfferLetterStatus, DocumentVerification } from "./components";

export default function ProcessingCandidateDetailsPage() {
  const { candidateId: processingId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
  const [showOfferLetterModal, setShowOfferLetterModal] = useState(false);
  const [showHrdModal, setShowHrdModal] = useState(false);
  const [showPrometricModal, setShowPrometricModal] = useState(false);
  const [showDataFlowModal, setShowDataFlowModal] = useState(false);
  const [showEligibilityModal, setShowEligibilityModal] = useState(false);

  const { data: apiResponse, isLoading, error, refetch: refetchCandidateDetails } = useGetCandidateProcessingDetailsQuery(processingId || "", {
    skip: !processingId,
  });
  
  // Fetch processing steps from the new API
  const { data: processingSteps = [], isLoading: isLoadingSteps, refetch: refetchProcessingSteps } = useGetProcessingStepsQuery(processingId || "", {
    skip: !processingId,
  });
  
  const [verifyOfferLetter, { isLoading: isVerifying }] = useVerifyOfferLetterMutation();
  const data = apiResponse?.data;

  // Handler to refresh all data when a processing step is completed
  const handleStepComplete = async () => {
    await Promise.all([
      refetchCandidateDetails(),
      refetchProcessingSteps()
    ]);
  };

  // Backwards compatible HRD handler
  const handleHrdComplete = handleStepComplete;
  const handleDataFlowComplete = handleStepComplete;
  const handleEligibilityComplete = handleStepComplete;

  // Extract offer letter status from document verifications
  const { offerLetterStatus, offerLetterVerification } = useMemo(() => {
    const verifications = data?.candidateProjectMap?.documentVerifications || [];
    const offerLetterDoc = verifications.find(
      (v) => v.document?.docType === "offer_letter"
    );

    if (!offerLetterDoc) {
      return {
        offerLetterStatus: {
          hasOfferLetter: false,
          status: "not_uploaded" as const,
        } as OfferLetterStatus,
        offerLetterVerification: null,
      };
    }

    return {
      offerLetterStatus: {
        hasOfferLetter: true,
        status: offerLetterDoc.document?.status || "pending",
        documentId: offerLetterDoc.document?.id,
        verificationId: offerLetterDoc.id,
        fileUrl: offerLetterDoc.document?.fileUrl,
        fileName: offerLetterDoc.document?.fileName,
      } as OfferLetterStatus,
      offerLetterVerification: offerLetterDoc,
    };
  }, [data?.candidateProjectMap?.documentVerifications]);

  // If processing was cancelled, find the most recent cancellation history entry to show the reason
  const cancellationEntry = useMemo(() => {
    const history = data?.history || [];
    if (!history.length) return null;

    const sorted = [...history].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return sorted.find((h) => h.status === "cancelled") || null;
  }, [data?.history]);

  if (isLoading || isLoadingSteps) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-violet-400/20 animate-ping" />
            <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-600">Loading processing details...</p>
          <p className="text-sm text-slate-400">Please wait while we fetch the information</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 p-6">
        <Card className="w-full max-w-md text-center p-8 shadow-2xl border-0">
          <div className="h-20 w-20 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-rose-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Oops!</h2>
          <p className="text-slate-500 mt-2">Could not retrieve processing details.</p>
          <p className="text-xs text-slate-400 mt-1">The record may not exist or you may not have permission to view it.</p>
          <Button 
            className="mt-6 w-full h-12 rounded-xl font-bold" 
            onClick={() => navigate("/processing-dashboard")}
          >
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 p-4 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        {/* Header */}
        <ProcessingCandidateHeader
          candidate={data.candidate}
          project={data.project}
          role={data.role}
          processingStatus={data.processingStatus}
          processingId={data.id}
          recruiter={data.candidateProjectMap?.recruiter}
        />

        {/* If processing is cancelled, show a clear banner with cancellation reason */}
        {data.processingStatus === "cancelled" && (
          <Card className="w-full border-0 shadow-lg bg-rose-50 p-4">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-rose-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-rose-700">Processing Cancelled</h3>
                <p className="text-sm text-slate-700 mt-1">{cancellationEntry?.notes || "No reason provided"}</p>
                {cancellationEntry?.createdAt && (
                  <div className="text-xs text-slate-400 mt-2">Cancelled by {cancellationEntry?.changedBy?.name || "System"} on {format(new Date(cancellationEntry.createdAt), "PPP p")}</div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Main Content Grid - More Compact */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
          {/* Left Column - Steps, Project Details (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Processing Steps - Taller */}
            <ProcessingStepsCard
              steps={processingSteps}
              maxHeight="450px"
              offerLetterStatus={offerLetterStatus}
              onOfferLetterClick={() => setShowOfferLetterModal(true)}
              onStepClick={(stepKey) => {
                const k = String(stepKey || "").replace(/[_-]/g, "").toLowerCase();
                if (k === "hrd") {
                  setShowHrdModal(true);
                  return;
                }

                if (k === "prometric") {
                  setShowPrometricModal(true);
                  return;
                }

                if (k === "eligibility") {
                  setShowEligibilityModal(true);
                  return;
                }

                if (k === "dataflow") {
                  setShowDataFlowModal(true);
                }
              }}
            />

            {/* Project Info Card - Below Steps */}
            <ProjectInfoCard
              project={data.project}
              role={data.role}
              mainStatus={data.candidateProjectMap?.mainStatus}
              subStatus={data.candidateProjectMap?.subStatus}
            />
          </div>

          {/* Right Column - Assignment, Candidate, Documents, History (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Assignment Info - Top of right column */}
            <AssignmentCard
              assignedTo={data.assignedTo}
              recruiter={data.candidateProjectMap?.recruiter}
              processingStatus={data.processingStatus}
            />

            {/* Candidate Info Card - second */}
            <CandidateInfoCard candidate={data.candidate} />

            {/* Document Verifications - third */}
            <DocumentVerificationCard
              verifications={data.candidateProjectMap?.documentVerifications || []}
              maxHeight="280px"
            />

            {/* History Modal Button + Processing Notes stacked */}
            <div className="flex flex-col gap-3">
              <ProcessingHistoryModal history={data.history || []} />
              
              {data.notes && (
                <Card className="w-full border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 border-l-4 border-l-amber-400 p-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-1">
                    Notes
                  </h4>
                  <p className="text-xs text-amber-900 font-medium leading-relaxed line-clamp-3">
                    {data.notes}
                  </p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Offer Letter Verification Modal */}
      <ProcessingOfferLetterModal
        isOpen={showOfferLetterModal}
        onClose={() => {
          setShowOfferLetterModal(false);
          refetchCandidateDetails(); // Refresh data when modal closes to show updated document
        }}
        candidateId={data.candidate?.id || ""}
        candidateName={`${data.candidate?.firstName || ""} ${data.candidate?.lastName || ""}`.trim()}
        projectId={data.project?.id || ""}
        projectTitle={data.project?.title || ""}
        roleCatalogId={data.role?.roleCatalogId || ""}
        roleDesignation={data.role?.designation || ""}
        documentVerification={offerLetterVerification as DocumentVerification | null}
        isVerifying={isVerifying}
        onVerify={async (verifyData) => {
          try {
            await verifyOfferLetter({
              ...verifyData,
              notes: verifyData.notes || "Offer letter verified by processing team"
            }).unwrap();
            
            toast.success("Offer letter verified successfully");
            await refetchCandidateDetails();
          } catch (error: any) {
            console.error("Verification error:", error);
            toast.error(error?.data?.message || "Failed to verify offer letter");
            throw error;
          }
        }}
      />

      {/* HRD Requirements Modal */}
      <HrdModal
        isOpen={showHrdModal}
        onClose={() => {
          setShowHrdModal(false);
          refetchCandidateDetails();
        }}
        processingId={data.id}
        onComplete={handleHrdComplete}
      />

      {/* Prometric Modal */}
      <PrometricModal
        isOpen={showPrometricModal}
        onClose={() => {
          setShowPrometricModal(false);
          refetchCandidateDetails();
        }}
        processingId={data.id}
        onComplete={handleStepComplete}
      />

      {/* Eligibility Modal */}
      <EligibilityModal
        isOpen={showEligibilityModal}
        onClose={() => {
          setShowEligibilityModal(false);
          refetchCandidateDetails();
        }}
        processingId={data.id}
        onComplete={handleEligibilityComplete}
      />

      {/* Data Flow Modal */}
      <DataFlowModal
        isOpen={showDataFlowModal}
        onClose={() => {
          setShowDataFlowModal(false);
          refetchCandidateDetails();
        }}
        processingId={data.id}
        onComplete={handleDataFlowComplete}
      />
    </div>
  );
}
