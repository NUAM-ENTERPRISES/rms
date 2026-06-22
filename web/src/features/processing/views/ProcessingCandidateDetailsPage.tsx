import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import {
  useGetCandidateProcessingDetailsQuery,
  useGetCandidateDocumentsQuery,
  useGetPendingProcessingStatusChangeRequestForCandidateQuery,
  useGetLatestReviewedProcessingStatusChangeRequestQuery,
} from "@/features/processing/data/processing.endpoints";
import { useGetProcessingStepsQuery } from "@/services/processingApi";
import { useVerifyOfferLetterMutation } from "@/services/documentsApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, FileCheck, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ProcessingCandidateHeader,
  CandidateInfoCard,
  ProjectInfoCard,
  AssignmentCard,
  ProcessingStepsCard,
  ProcessingHistoryModal,
  DocumentCollectionHistoryModal,
  CourierHistoryModal,
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
  EditFileNumberModal,
} from "./components";
import DocumentReceivedModal from "./components/DocumentReceivedModal";
import ManageStepDocumentsModal from "@/features/processing/components/ManageStepDocumentsModal";
import type { OfferLetterStatus, DocumentVerification } from "./components";
import { useCan } from "@/hooks/useCan";
import { Can } from "@/components/auth/Can";
import { ReviewStatusChangeRequestModal } from "@/features/candidates/components/ReviewStatusChangeRequestModal";
import type {
  PendingStatusChangeRequest,
  ReviewedStatusChangeRequest,
} from "@/features/candidates/api";
import { useGetCandidateCountryRestrictionsQuery } from "@/features/candidates/api";
import { ProcessingStatusChangeOutcomeBanner } from "@/features/processing/components/ProcessingStatusChangeOutcomeBanner";
import { UpdateProcessingStatusModal } from "@/features/processing/components/UpdateProcessingStatusModal";
import { PreviousProcessingProjectsModal } from "@/features/processing/components/PreviousProcessingProjectsModal";
import { useAppSelector } from "@/app/hooks";
import { ProcessingActionLockProvider } from "@/features/processing/context/ProcessingActionLockContext";
import { formatProcessingStatusChangeRequestDate } from "@/features/processing/utils/processingActionLock";
import { resolveCountryRestrictionFromRequest } from "@/features/processing/utils/countryRestrictionDisplay";
import { ShieldAlert } from "lucide-react";
import { canDirectApplyProcessingStatusChange } from "@/features/processing/utils/processingStatusChangeRoles";

export default function ProcessingCandidateDetailsPage() {
  const { candidateId: processingId } = useParams<{ candidateId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
  const [showPreviousProjectsModal, setShowPreviousProjectsModal] = useState(false);
  const { user } = useAppSelector((state) => state.auth);
  const canReviewProcessingRequests =
    user?.roles?.some((role) => ["Manager", "Processing Manager"].includes(role)) ?? false;
  const canDirectApplyStatusChange = canDirectApplyProcessingStatusChange(user?.roles);
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
  const [showManageStepDocsModal, setShowManageStepDocsModal] = useState(false);
  const [manageStepDocsKey, setManageStepDocsKey] = useState<string>("");
  const [manageStepDocsLabel, setManageStepDocsLabel] = useState<string>("");
  const [showEditFileNumberModal, setShowEditFileNumberModal] = useState(false);
  const canManageStepDocs = useCan("write:processing");

  const { data: apiResponse, isLoading, error, refetch: refetchCandidateDetails } = useGetCandidateProcessingDetailsQuery(processingId || "", {
    skip: !processingId,
  });
  
  // Fetch processing steps from the new API
  const { data: processingSteps = [], isLoading: isLoadingSteps, refetch: refetchProcessingSteps } = useGetProcessingStepsQuery(processingId || "", {
    skip: !processingId,
  });

  const { data: pendingRequestResponse, refetch: refetchPendingRequest } =
    useGetPendingProcessingStatusChangeRequestForCandidateQuery(processingId || "", {
      skip: !processingId,
    });

  const { data: latestReviewedResponse, refetch: refetchLatestReviewed } =
    useGetLatestReviewedProcessingStatusChangeRequestQuery(processingId || "", {
      skip: !processingId,
    });

  const pendingRequest = pendingRequestResponse?.data as PendingStatusChangeRequest | null | undefined;
  const pendingRequestSubmittedAt = useMemo(
    () => formatProcessingStatusChangeRequestDate(pendingRequest?.createdAt),
    [pendingRequest?.createdAt],
  );
  const latestReviewed = latestReviewedResponse?.data as
    | ReviewedStatusChangeRequest
    | null
    | undefined;

  const outcomeRequestId = searchParams.get("actionOutcome");
  const reviewRequestId = searchParams.get("reviewRequest");
  const highlightedReview =
    reviewRequestId && pendingRequest?.id === reviewRequestId
      ? pendingRequest
      : pendingRequest;
  const outcomeReview: ReviewedStatusChangeRequest | null | undefined =
    outcomeRequestId && latestReviewed?.id === outcomeRequestId
      ? latestReviewed
      : latestReviewed;

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

  const projectCountryCode =
    data?.project?.country && typeof data.project.country === "object"
      ? data.project.country.code
      : undefined;
  const projectCountryName =
    data?.project?.country && typeof data.project.country === "object"
      ? data.project.country.name
      : undefined;

  const pendingCountryRestriction = useMemo(
    () =>
      resolveCountryRestrictionFromRequest(pendingRequest ?? {}, {
        code: projectCountryCode,
        name: projectCountryName,
      }),
    [pendingRequest, projectCountryCode, projectCountryName],
  );

  const candidateId = data?.candidate?.id;
  const { data: projectCountryRestrictionsData } =
    useGetCandidateCountryRestrictionsQuery(
      {
        candidateId: candidateId!,
        countryCode: projectCountryCode,
        limit: 1,
      },
      { skip: !candidateId || !projectCountryCode },
    );
  const projectCountryRestriction = projectCountryRestrictionsData?.items[0];

  const showOutcomeBanner =
    !!outcomeReview &&
    (outcomeReview.status === "approved" || outcomeReview.status === "rejected") &&
    !pendingRequest;

  const showUpdateStatusButton =
    !pendingRequest &&
    (data?.processingStatus === "cancelled" || data?.processingStatus === "on_hold");

  const getPendingRequestTitle = (requestType?: string) => {
    switch (requestType) {
      case "processing_cancel":
        return "Cancellation request pending approval";
      case "processing_hold":
        return "Hold request pending approval";
      case "processing_reactivate":
        return "Reactivation request pending approval";
      default:
        return "Status change request pending approval";
    }
  };

  const refetchStatusChangeData = async () => {
    await Promise.all([
      refetchPendingRequest(),
      refetchLatestReviewed(),
      refetchCandidateDetails(),
      refetchProcessingSteps(),
    ]);
  };

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

  useEffect(() => {
    if (reviewRequestId && pendingRequest && canReviewProcessingRequests) {
      setShowReviewModal(true);
    }
  }, [reviewRequestId, pendingRequest, canReviewProcessingRequests]);

  // Reset paging when processing id changes
  useEffect(() => {
    setDocsPage(1);
    setHistoryRefreshKey((k) => k + 1);
  }, [effectiveProcessingId]);

  // Handler to refresh all data when a processing step is completed
  const handleStepComplete = async () => {
    await Promise.all([
      refetchCandidateDetails(),
      refetchProcessingSteps(),
      refetchCandidateDocuments(),
      refetchPendingRequest(),
      refetchLatestReviewed(),
    ]);
    // signal the history modal to refresh if it's open
    setHistoryRefreshKey((k) => k + 1);
  };

  const handleReviewed = async () => {
    await Promise.all([
      refetchPendingRequest(),
      refetchLatestReviewed(),
      refetchCandidateDetails(),
      refetchProcessingSteps(),
    ]);
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        next.delete("reviewRequest");
        next.delete("actionOutcome");
        return next;
      },
      { replace: true },
    );
  };

  // Backwards compatible HRD handler
  const handleHrdComplete = handleStepComplete;
  const handleDataFlowComplete = handleStepComplete;
  const handleEligibilityComplete = handleStepComplete;

  // Extract offer letter status from the paginated documents
  const { offerLetterStatus, offerLetterVerification, offerLetterUploadedByName } = useMemo(() => {
    const verifications = (docsResponse?.data?.items || []) as any[];
    const offerLetterDoc = verifications.find((v) => v.document?.docType === "offer_letter");

    const getUploaderLabel = (
      uploadedByUser?: { name?: string; email?: string } | null,
    ) => uploadedByUser?.name || uploadedByUser?.email || null;

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
              offerLetterReceivedAt: verification.offerLetterReceivedAt || null,
              document: {
                id: candidateDoc.id,
                candidateId: data?.candidate?.id || "",
                docType: candidateDoc.docType || "offer_letter",
                fileName: candidateDoc.fileName,
                fileUrl: candidateDoc.fileUrl,
                uploadedBy: candidateDoc.uploadedBy || "",
                uploadedByUser: candidateDoc.uploadedByUser || null,
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
            receivedAt: verification?.offerLetterReceivedAt || candidateDoc.uploadedAt || null,
          } as OfferLetterStatus,
          offerLetterVerification: constructedVerification,
          offerLetterUploadedByName: getUploaderLabel(candidateDoc.uploadedByUser),
        };
      }

      return {
        offerLetterStatus: {
          hasOfferLetter: false,
          status: "not_uploaded" as const,
        } as OfferLetterStatus,
        offerLetterVerification: null,
        offerLetterUploadedByName: null,
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
        receivedAt: offerLetterDoc.offerLetterReceivedAt || offerLetterDoc.document?.offerLetterReceivedAt || offerLetterDoc.document?.createdAt || null,
      } as OfferLetterStatus,
      offerLetterVerification: {
        ...offerLetterDoc,
        offerLetterReceivedAt: offerLetterDoc.offerLetterReceivedAt || offerLetterDoc.document?.offerLetterReceivedAt || offerLetterDoc.document?.createdAt || null,
      } as any,
      offerLetterUploadedByName: getUploaderLabel(offerLetterDoc.document?.uploadedByUser),
    };
  }, [docsResponse?.data?.items, processingSteps, data?.candidate?.id]);

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
    <ProcessingActionLockProvider
      pendingRequest={pendingRequest}
      processingStatus={data.processingStatus}
    >
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 p-4 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        {/* Header */}
        <ProcessingCandidateHeader
          candidateId={data.candidate.id}
          candidate={data.candidate}
          project={data.project}
          role={data.role}
          processingStatus={data.processingStatus}
          processingId={data.id}
          fileNumber={data.fileNumber ?? null}
          recruiter={data.candidateProjectMap?.recruiter}
          originalDocumentCollection={data.originalDocumentCollection ?? null}
          documentReceivedStepStatus={data.documentReceivedStep?.status ?? null}
          onOpenPreviousProjects={() => setShowPreviousProjectsModal(true)}
        />

        <PreviousProcessingProjectsModal
          open={showPreviousProjectsModal}
          onOpenChange={setShowPreviousProjectsModal}
          candidateId={data.candidate.id}
          currentProcessingId={data.id}
          candidateName={`${data.candidate.firstName} ${data.candidate.lastName}`}
        />

        {pendingRequest && (
          <Card className="w-full border-0 shadow-lg bg-orange-100 border-l-4 border-l-orange-400 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-orange-200 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-orange-800">
                    {getPendingRequestTitle(pendingRequest.requestType)}
                  </h3>
                  <p className="text-sm text-slate-700 mt-1">{pendingRequest.reason}</p>
                  {pendingCountryRestriction ? (
                    <p className="mt-2 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-100/80 px-3 py-2 text-xs font-medium text-amber-950">
                      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span>
                        Requester asked to restrict this candidate from all{" "}
                        <span className="font-semibold">
                          {pendingCountryRestriction.countryName}
                        </span>{" "}
                        projects if approved.
                      </span>
                    </p>
                  ) : null}
                  {pendingRequestSubmittedAt && (
                    <p className="text-xs text-slate-500 mt-2">
                      Request sent {pendingRequestSubmittedAt}
                      {pendingRequest.requester?.name
                        ? ` by ${pendingRequest.requester.name}`
                        : ""}
                    </p>
                  )}
                </div>
              </div>
              {canReviewProcessingRequests && (
                <Button
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700"
                  onClick={() => setShowReviewModal(true)}
                >
                  Review Request
                </Button>
              )}
            </div>
          </Card>
        )}

        {showOutcomeBanner && outcomeReview ? (
          <ProcessingStatusChangeOutcomeBanner
            request={outcomeReview}
            projectCountryCode={projectCountryCode}
            projectCountryName={projectCountryName}
            projectCountryRestriction={projectCountryRestriction}
          />
        ) : null}

        {showUpdateStatusButton ? (
          <Card className="w-full border-0 shadow-lg bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Processing status update
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  {canDirectApplyStatusChange
                    ? "Change hold, reactivation, or cancellation directly."
                    : "Request hold, reactivation, or cancellation for manager approval."}
                </p>
              </div>
              <Button
                type="button"
                className="bg-violet-600 hover:bg-violet-700 shrink-0"
                onClick={() => setShowUpdateStatusModal(true)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Update Processing Status
              </Button>
            </div>
          </Card>
        ) : null}

        {data.processingStatus === "cancelled" && !showOutcomeBanner ? (
          <Card className="w-full border-0 shadow-lg bg-rose-50 p-4">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-rose-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-rose-700">Processing Cancelled</h3>
                <p className="text-sm text-slate-700 mt-1">
                  This candidate&apos;s processing has been cancelled.
                </p>
              </div>
            </div>
          </Card>
        ) : null}

        {/* Main Content Grid - More Compact */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
          {/* Left Column - Steps, Project Details (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Processing Steps - Taller */}
            <ProcessingStepsCard
              steps={processingSteps}
              maxHeight="450px"
              processingStatus={data.processingStatus}
              offerLetterStatus={offerLetterStatus}
              onOfferLetterClick={() => setShowOfferLetterModal(true)}
              onOpenHire={() => setShowHireModal(true)}
              isHired={data?.candidateProjectMap?.subStatus?.name === "hired"}
              lockerFileNumber={data.originalDocumentCollection?.lockerFileNumber ?? null}
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
              canManageStepDocs={canManageStepDocs}
              onManageStepDocs={(stepKey) => {
                if (!canManageStepDocs) return;
                const step = (processingSteps || []).find(
                  (s: any) => s.template?.key === stepKey,
                );
                setManageStepDocsKey(stepKey);
                setManageStepDocsLabel(step?.template?.label || stepKey);
                setShowManageStepDocsModal(true);
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
              <DocumentCollectionHistoryModal processingId={data.id} refreshKey={historyRefreshKey} />
              <CourierHistoryModal processingId={data.id} refreshKey={historyRefreshKey} />
              
              {data.notes && (
                <Card className="w-full border-0 shadow-lg bg-gradient-to-br from-violet-50 to-indigo-50 border-l-4 border-l-violet-400 p-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-700 mb-1">
                    Notes
                  </h4>
                  <p className="text-xs text-violet-900 font-medium leading-relaxed line-clamp-3">
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
        processingId={data.id}
        onComplete={handleStepComplete}
        documentVerification={offerLetterVerification as DocumentVerification | null}
        uploadedByName={offerLetterUploadedByName}
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

      <EditFileNumberModal
        isOpen={showEditFileNumberModal}
        onClose={() => {
          setShowEditFileNumberModal(false);
          refetchCandidateDetails();
        }}
        processingId={data.id}
        initialFileNumber={data.fileNumber}
      />

      <ManageStepDocumentsModal
        isOpen={showManageStepDocsModal}
        onClose={() => setShowManageStepDocsModal(false)}
        processingId={data.id}
        stepKey={manageStepDocsKey}
        stepLabel={manageStepDocsLabel}
      />

      <UpdateProcessingStatusModal
        isOpen={showUpdateStatusModal}
        onClose={() => setShowUpdateStatusModal(false)}
        processingId={data.id}
        processingStatus={data.processingStatus}
        stepKey={data.step}
        onSubmitted={refetchStatusChangeData}
      />

      {highlightedReview && data?.candidate && data?.project && (
        <ReviewStatusChangeRequestModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          request={highlightedReview}
          candidateId={data.candidate.id}
          projectId={data.project.id}
          candidateProjectMapId={data.candidateProjectMap?.id}
          projectTitle={data.project.title}
          countryName={projectCountryName}
          projectCountryCode={projectCountryCode}
          stepKey={highlightedReview.stepKey}
          processingStatus={data.processingStatus}
          currentStatus={data.processingStatus}
          onReviewed={handleReviewed}
        />
      )}
    </div>
    </ProcessingActionLockProvider>
  );
}
