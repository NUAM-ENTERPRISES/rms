import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useGetCandidateProcessingDetailsQuery, useGetCandidateDocumentsQuery } from "@/features/processing/data/processing.endpoints";
import { useGetProcessingStepsQuery } from "@/services/processingApi";
import { useVerifyOfferLetterMutation } from "@/services/documentsApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, FileCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  BiometricModal,
  VisaModal,
  TicketModal,
  CouncilRegistrationModal,
  PrometricModal,
  EligibilityModal,
  DocumentAttestationModal,
  MedicalModal,
  EmigrationModal,
  HireModal,
} from "./components";
import DocumentReceivedModal from "./components/DocumentReceivedModal";
import type { OfferLetterStatus, DocumentVerification } from "./components";

export default function ProcessingCandidateDetailsPage() {
  const { candidateId: processingId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
  const [showOfferLetterModal, setShowOfferLetterModal] = useState(false);
  const [showHrdModal, setShowHrdModal] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [showVisaModal, setShowVisaModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showHireModal, setShowHireModal] = useState(false);
  const [showEmigrationModal, setShowEmigrationModal] = useState(false);
  const [showCouncilRegistrationModal, setShowCouncilRegistrationModal] = useState(false);
  const [showDocumentAttestationModal, setShowDocumentAttestationModal] = useState(false);
  const [showMedicalModal, setShowMedicalModal] = useState(false);
  const [showPrometricModal, setShowPrometricModal] = useState(false);
  const [showDataFlowModal, setShowDataFlowModal] = useState(false);
  const [showEligibilityModal, setShowEligibilityModal] = useState(false);
  const [showDocumentReceivedModal, setShowDocumentReceivedModal] = useState(false);

  const { data: apiResponse, isLoading, error, refetch: refetchCandidateDetails } = useGetCandidateProcessingDetailsQuery(processingId || "", {
    skip: !processingId,
  });
  
  // Fetch processing steps from the new API
  const { data: processingSteps = [], isLoading: isLoadingSteps, refetch: refetchProcessingSteps } = useGetProcessingStepsQuery(processingId || "", {
    skip: !processingId,
  });

  // --- New: paginated documents and history ---
  const [docsPage, setDocsPage] = useState(1);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const effectiveProcessingId = processingId || apiResponse?.data?.id || "";

  const { data: docsResponse, isLoading: isLoadingDocs, refetch: refetchCandidateDocuments } = useGetCandidateDocumentsQuery(
    { processingId: effectiveProcessingId, page: docsPage, limit: 10 },
    { skip: !effectiveProcessingId }
  );

  // History is intentionally fetched by the `ProcessingHistoryModal` only; a `refreshKey` is used to signal refreshes when needed.

  const [verifyOfferLetter, { isLoading: isVerifying }] = useVerifyOfferLetterMutation();
  const data = apiResponse?.data;

  // Map paginated documents to UI shape expected by DocumentVerificationCard
  const docsTotal = docsResponse?.data?.pagination?.total || 0;
  const docsPages = docsResponse?.data?.pagination?.pages || Math.ceil(docsTotal / 10) || 1;
  const documentsForUi = (docsResponse?.data?.items || []).map((it: any) => ({
    id: (it.id as string) || it.document?.id || it.documentId,
    status: it.status,
    notes: it.notes,
    rejectionReason: it.rejectionReason,
    resubmissionRequested: it.resubmissionRequested || false,
    document: {
      id: it.document.id,
      docType: it.document.docType,
      fileName: it.document.fileName,
      fileUrl: it.document.fileUrl,
      status: it.document.status,
      mimeType: it.document.mimeType,
      fileSize: it.document.fileSize,
    },
  }));

  // Reset paging when processing id changes
  useEffect(() => {
    setDocsPage(1);
    // history page is managed within the modal; signal it to refresh/reset when processing id changes
    setHistoryRefreshKey((k) => k + 1);
  }, [effectiveProcessingId]);

  // Handler to refresh all data when a processing step is completed
  const handleStepComplete = async () => {
    await Promise.all([
      refetchCandidateDetails(),
      refetchProcessingSteps(),
      refetchCandidateDocuments(),
    ]);
    // signal the history modal to refresh if it's open
    setHistoryRefreshKey((k) => k + 1);
  };

  // Backwards compatible HRD handler
  const handleHrdComplete = handleStepComplete;
  const handleDataFlowComplete = handleStepComplete;
  const handleEligibilityComplete = handleStepComplete;

  // Extract offer letter status from the paginated documents
  const { offerLetterStatus, offerLetterVerification } = useMemo(() => {
    const verifications = (docsResponse?.data?.items || []) as any[];
    const offerLetterDoc = verifications.find((v) => v.document?.docType === "offer_letter");

    // If not found in paginated documents, fall back to processing steps payload which may contain offerLetters
    if (!offerLetterDoc) {
      const stepOffer = (processingSteps || []).find((s: any) => s.template?.key === "offer_letter");
      // stepOffer may not have types for offerLetters on the ProcessingStep type, cast to any to avoid TS error
      const candidateDoc = (stepOffer as any)?.offerLetters?.candidateDocument;
      if (candidateDoc) {
        // We have an uploaded offer letter in the processing steps; treat it as pending verification
        // Construct a DocumentVerification-like object so the offer-letter modal can show the existing document
        const verification = (candidateDoc.verifications && candidateDoc.verifications[0]) || null;
        const constructedVerification = verification
          ? {
              id: verification.id,
              candidateProjectMapId: verification.candidateProjectMapId,
              documentId: candidateDoc.id,
              roleCatalogId: verification.roleCatalogId || "",
              status: verification.status,
              notes: verification.notes || null,
              rejectionReason: verification.rejectionReason || null,
              resubmissionRequested: verification.resubmissionRequested || false,
              document: {
                id: candidateDoc.id,
                candidateId: data?.candidate?.id || "",
                docType: candidateDoc.docType || "offer_letter",
                fileName: candidateDoc.fileName,
                fileUrl: candidateDoc.fileUrl,
                uploadedBy: candidateDoc.uploadedBy || "",
                verifiedBy: null,
                status: verification.status,
                notes: null,
                createdAt: candidateDoc.uploadedAt || "",
                updatedAt: candidateDoc.uploadedAt || "",
                fileSize: candidateDoc.fileSize || 0,
                mimeType: candidateDoc.mimeType || "application/pdf",
                roleCatalogId: verification.roleCatalogId || null,
                rejectedAt: null,
                rejectedBy: null,
                rejectionReason: verification.rejectionReason || null,
                verifiedAt: null,
              },
            }
          : null;

        return {
          offerLetterStatus: {
            hasOfferLetter: true,
            status: "pending",
            documentId: candidateDoc.id,
            verificationId: verification?.id,
            fileUrl: candidateDoc.fileUrl,
            fileName: candidateDoc.fileName,
          } as OfferLetterStatus,
          offerLetterVerification: constructedVerification,
        };
      }

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
  }, [docsResponse?.data?.items, processingSteps]);

  // If processing was cancelled, find the most recent cancellation history entry to show the reason
  // We intentionally avoid fetching history on page load. The history modal fetches history when opened.
  // Keep a typed placeholder for cancellation entry so TypeScript is happy — we fetch details from history modal when needed.
  const cancellationEntry: { notes?: string; createdAt?: string; changedBy?: { name?: string } } | null = null;

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
                <p className="text-sm text-slate-700 mt-1">{(cancellationEntry as any)?.notes || "No reason provided"}</p>
                {(cancellationEntry as any)?.createdAt && (
                  <div className="text-xs text-slate-400 mt-2">Cancelled by {(cancellationEntry as any)?.changedBy?.name || "System"} on {format(new Date((cancellationEntry as any).createdAt), "PPP p")}</div>
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
              onOpenHire={() => setShowHireModal(true)}
              isHired={data?.candidateProjectMap?.subStatus?.name === "hired"}
              onStepClick={(stepKey) => {
                const k = String(stepKey || "").replace(/[_-]/g, "").toLowerCase();
                if (k === "hrd") {
                  setShowHrdModal(true);
                  return;
                }

                // accept both "biometric" and "biometrics" (API uses `biometrics` in some deployments)
                if (k === "biometric" || k === "biometrics" || k.startsWith("biometric")) {
                  setShowBiometricModal(true);
                  return;
                }

                // Visa step (accept common variants)
                if (k === "visa" || k === "visas" || k.startsWith("visa")) {
                  setShowVisaModal(true);
                  return;
                }

                // Ticket step (accept common variants)
                if (k === "ticket" || k === "tickets" || k.startsWith("ticket")) {
                  setShowTicketModal(true);
                  return;
                }

                // Emigration step (accept common variants)
                if (k === "emigration" || k === "emigrations" || k.startsWith("emigration")) {
                  setShowEmigrationModal(true);
                  return;
                }

                if (k === "councilregistration") {
                  setShowCouncilRegistrationModal(true);
                  return;
                }

                if (k === "documentattestation") {
                  setShowDocumentAttestationModal(true);
                  return;
                }

                if (k === "medical") {
                  setShowMedicalModal(true);
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

                // Document Received
                if (k === "documentreceived" || k === "documentsreceived" || k.startsWith("documentreceived")) {
                  setShowDocumentReceivedModal(true);
                  return;
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
              progressCount={(data as any).progressCount}
            />

            {/* Candidate Info Card - second */}
            <CandidateInfoCard candidate={data.candidate} />

            {/* Document Verifications - third */}
            <div>
              {isLoadingDocs ? (
                <Card className="border-0 shadow-xl overflow-hidden bg-white">
                  <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-slate-100 py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-emerald-600" />
                        Documents
                      </CardTitle>
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 font-bold text-xs">—/—</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-emerald-600" /></div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <DocumentVerificationCard
                    verifications={documentsForUi}
                    maxHeight="280px"
                    pagination={{
                      page: docsPage,
                      pages: docsPages,
                      total: docsTotal,
                      pageSize: 10,
                      onPrev: () => setDocsPage((p) => Math.max(1, p - 1)),
                      onNext: () => setDocsPage((p) => Math.min(docsPages, p + 1)),
                    }}
                  />
                </>
              )}
            </div>

            {/* History Modal Button + Processing Notes stacked */}
            <div className="flex flex-col gap-3">
              <ProcessingHistoryModal processingId={data.id} refreshKey={historyRefreshKey} />
              
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

            // Refresh candidate details, documents, and processing steps so UI updates immediately
            await Promise.all([
              refetchCandidateDetails(),
              refetchCandidateDocuments(),
              refetchProcessingSteps(),
            ]);
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
        candidateProjectMapId={data.candidateProjectMap?.id}
        onComplete={handleHrdComplete}
      />

      {/* Document Received Modal */}
      <DocumentReceivedModal
        isOpen={showDocumentReceivedModal}
        onClose={() => { setShowDocumentReceivedModal(false); refetchCandidateDetails(); }}
        processingId={data.id}
        candidateProjectMapId={data.candidateProjectMap?.id}
        onComplete={handleStepComplete}
      />

      {/* Biometric Modal */}
      <BiometricModal
        isOpen={showBiometricModal}
        onClose={() => {
          setShowBiometricModal(false);
          refetchCandidateDetails();
        }}
        processingId={data.id}
        candidateProjectMapId={data.candidateProjectMap?.id}
        onComplete={handleStepComplete}
      />

      {/* Visa Modal */}
      <VisaModal
        isOpen={showVisaModal}
        onClose={() => {
          setShowVisaModal(false);
          refetchCandidateDetails();
        }}
        processingId={data.id}
        candidateProjectMapId={data.candidateProjectMap?.id}
        onComplete={handleStepComplete}
      />

      {/* Ticket Modal */}
      <TicketModal
        isOpen={showTicketModal}
        onClose={() => {
          setShowTicketModal(false);
          refetchCandidateDetails();
        }}
        processingId={data.id}
        candidateProjectMapId={data.candidateProjectMap?.id}
        onComplete={handleStepComplete}
      />

      {/* Hire Modal */}
      <HireModal
        isOpen={showHireModal}
        onClose={() => { setShowHireModal(false); refetchCandidateDetails(); }}
        processingId={data.id}
        candidateName={`${data.candidate?.firstName || ""} ${data.candidate?.lastName || ""}`.trim()}
        onComplete={async () => { await handleStepComplete(); setShowHireModal(false); }}
      />

      {/* Emigration Modal */}
      <EmigrationModal
        isOpen={showEmigrationModal}
        onClose={() => {
          setShowEmigrationModal(false);
          refetchCandidateDetails();
        }}
        processingId={data.id}
        candidateProjectMapId={data.candidateProjectMap?.id}
        onComplete={handleStepComplete}
      />

      {/* Council Registration Modal */}
      <CouncilRegistrationModal
        isOpen={showCouncilRegistrationModal}
        onClose={() => {
          setShowCouncilRegistrationModal(false);
          refetchCandidateDetails();
        }}
        processingId={data.id}
        candidateProjectMapId={data.candidateProjectMap?.id}
        onComplete={handleStepComplete}
      />

      {/* Document Attestation Modal */}
      <DocumentAttestationModal
        isOpen={showDocumentAttestationModal}
        onClose={() => {
          setShowDocumentAttestationModal(false);
          refetchCandidateDetails();
        }}
        processingId={data.id}
        candidateProjectMapId={data.candidateProjectMap?.id}
        onComplete={handleStepComplete}
      />

      {/* Medical Modal */}
      <MedicalModal
        isOpen={showMedicalModal}
        onClose={() => {
          setShowMedicalModal(false);
          refetchCandidateDetails();
        }}
        processingId={data.id}
        candidateProjectMapId={data.candidateProjectMap?.id}
        onComplete={handleStepComplete}
      />

      {/* Prometric Modal */}
      <PrometricModal
        isOpen={showPrometricModal}
        onClose={() => {
          setShowPrometricModal(false);
          refetchCandidateDetails();
        }}
        processingId={data.id}
        candidateProjectMapId={data.candidateProjectMap?.id}
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
        candidateProjectMapId={data.candidateProjectMap?.id}
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
        candidateProjectMapId={data.candidateProjectMap?.id}
        onComplete={handleDataFlowComplete}
      />
    </div>
  );
}
