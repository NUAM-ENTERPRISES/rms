import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useGetInterviewQuery } from "../api";
import { useGetCandidatesToTransferQuery } from "@/features/processing/data/processing.endpoints";
import { useUpdateInterviewStatusMutation } from "../api";
import { PassedCandidateDetailPanel } from "../components/PassedCandidateDetailPanel";
import { SingleTransferToProcessingModal } from "../components/SingleTransferToProcessingModal";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import { OfferLetterUploadModal } from "@/features/documents/components/OfferLetterUploadModal";
import { useAppDispatch } from "@/app/hooks";
import { processingApi } from "@/features/processing/data/processing.endpoints";
import {
  getOfferLetterOverrideKey,
  getOfferLetterUrlFromUpload,
  hasOfferLetter,
  resolveOfferLetterFileUrl,
} from "../utils/offerLetter";

function normalizeInterviewRecord(interview: any) {
  const roleCatalogId =
    interview.candidateProjectMap?.roleNeeded?.roleCatalogId ||
    interview.candidateProjectMap?.roleNeeded?.roleCatalog?.id;
  const matchingVerifications = (
    interview.candidateProjectMap?.documentVerifications ?? []
  ).filter(
    (verification: { roleCatalogId?: string | null }) =>
      !roleCatalogId ||
      !verification.roleCatalogId ||
      verification.roleCatalogId === roleCatalogId,
  );
  const offerLetterData = interview.offerLetterData ?? matchingVerifications[0] ?? null;

  return {
    ...interview,
    isTransferredToProcessing:
      interview.isTransferredToProcessing ?? !!interview.candidateProjectMap?.processing,
    offerLetterData,
    isOfferLetterUploaded:
      interview.isOfferLetterUploaded ?? matchingVerifications.length > 0,
  };
}

export default function PassedCandidateDetailPage() {
  const { interviewId } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [offerLetterModal, setOfferLetterModal] = useState<{
    isOpen: boolean;
    candidateId: string | null;
    interviewId: string | null;
  }>({
    isOpen: false,
    candidateId: null,
    interviewId: null,
  });
  const [pdfViewerState, setPdfViewerState] = useState<{
    isOpen: boolean;
    fileUrl: string;
    fileName: string;
    candidateId: string | null;
  }>({
    isOpen: false,
    fileUrl: "",
    fileName: "",
    candidateId: null,
  });
  const [offerLetterOverrides, setOfferLetterOverrides] = useState<Record<string, string>>({});

  const {
    data: interviewResponse,
    isLoading: isInterviewLoading,
    error: interviewError,
  } = useGetInterviewQuery(interviewId!, { skip: !interviewId });

  const candidateId =
    interviewResponse?.data?.candidateProjectMap?.candidateId ||
    interviewResponse?.data?.candidateProjectMap?.candidate?.id;

  const { data: transferResponse, isLoading: isTransferLoading } =
    useGetCandidatesToTransferQuery(
      { candidateId: candidateId!, page: 1, limit: 20 },
      { skip: !candidateId },
    );

  const interview = useMemo(() => {
    if (!interviewId) return null;

    const fromTransferList = transferResponse?.data?.interviews?.find(
      (item) => item.id === interviewId,
    );
    if (fromTransferList) return fromTransferList;

    if (!interviewResponse?.data) return null;
    return normalizeInterviewRecord(interviewResponse.data);
  }, [interviewId, interviewResponse?.data, transferResponse?.data?.interviews]);

  useEffect(() => {
    if (!interview) return;
    const serverUrl = interview.offerLetterData?.document?.fileUrl;
    if (!serverUrl) return;

    const key = getOfferLetterOverrideKey(interview);
    setOfferLetterOverrides((prev) =>
      prev[key] === serverUrl ? prev : { ...prev, [key]: serverUrl },
    );
  }, [interview]);

  const isOfferVerified = useMemo(() => {
    if (!interview) return false;
    return (
      interview.offerLetterData?.status === "verified" ||
      interview.offerLetterData?.document?.status === "verified" ||
      (interview.candidateProjectMap?.documentVerifications?.some(
        (dv: any) => dv.document?.docType === "offer_letter" && dv.status === "verified",
      ) ??
        false)
    );
  }, [interview]);

  const activePdfUrl = useMemo(() => {
    if (!pdfViewerState.isOpen || !interview) return "";
    const originalUrl =
      resolveOfferLetterFileUrl(interview, offerLetterOverrides) || pdfViewerState.fileUrl;
    return originalUrl
      ? `${originalUrl}${originalUrl.includes("?") ? "&" : "?"}t=${Date.now()}`
      : "";
  }, [pdfViewerState.isOpen, pdfViewerState.fileUrl, interview, offerLetterOverrides]);

  const [, { isLoading: isUpdating }] = useUpdateInterviewStatusMutation();

  const projectTitle =
    interview?.candidateProjectMap?.project?.title || interview?.project?.title || "";
  const roleDesignation =
    (interview?.candidateProjectMap?.roleNeeded || interview?.roleNeeded)?.designation ||
    (interview?.candidateProjectMap?.roleNeeded || interview?.roleNeeded)?.roleCatalog
      ?.designation ||
    "Unknown Role";

  const isLoading = isInterviewLoading || (Boolean(candidateId) && isTransferLoading);

  if (!interviewId) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Invalid candidate link.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (interviewError || !interview) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load candidate details.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (interview.outcome?.toLowerCase() !== "passed" || !interview.readyForProcessingAt) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>This candidate is not ready for processing.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const candidate = interview.candidateProjectMap?.candidate || interview.candidate;

  return (
    <>
      <PassedCandidateDetailPanel
        interview={interview}
        offerLetterOverrides={offerLetterOverrides}
        isOfferVerified={isOfferVerified}
        isUpdating={isUpdating}
        onClose={() => navigate("/ready-for-processing")}
        onTransfer={() => setTransferModalOpen(true)}
        onViewOfferLetter={(selectedCandidate) => {
          const fileUrl = resolveOfferLetterFileUrl(interview, offerLetterOverrides);
          if (fileUrl) {
            setPdfViewerState({
              isOpen: true,
              fileUrl,
              fileName: `Offer Letter - ${selectedCandidate?.firstName} ${selectedCandidate?.lastName}`,
              candidateId: selectedCandidate?.id,
            });
          }
        }}
        onUploadOfferLetter={(nextCandidateId, nextInterviewId) => {
          setOfferLetterModal({
            isOpen: true,
            candidateId: nextCandidateId,
            interviewId: nextInterviewId,
          });
        }}
      />

      <SingleTransferToProcessingModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        candidateId={candidate?.id}
        candidateName={`${candidate?.firstName} ${candidate?.lastName}`}
        agentName={interview.agentName || candidate?.agent?.name}
        agentType={interview.agentType || candidate?.agent?.agentType}
        recruiterName={interview.candidateProjectMap?.recruiter?.name}
        projectId={interview.candidateProjectMap?.project?.id || interview.project?.id}
        projectTitle={projectTitle}
        roleCatalogId={
          (interview.candidateProjectMap?.roleNeeded || interview.roleNeeded)?.roleCatalogId ||
          (interview.candidateProjectMap?.roleNeeded || interview.roleNeeded)?.roleCatalog?.id ||
          ""
        }
        roleDesignation={roleDesignation}
        isOfferVerified={isOfferVerified}
        isAlreadyUploaded={
          interview.isOfferLetterUploaded || !!offerLetterOverrides[candidate?.id]
        }
        existingFileUrl={resolveOfferLetterFileUrl(interview, offerLetterOverrides)}
        onSuccess={() => {
          setTransferModalOpen(false);
          navigate("/ready-for-processing");
        }}
      />

      {offerLetterModal.isOpen && (
        <OfferLetterUploadModal
          isOpen={offerLetterModal.isOpen}
          onClose={() =>
            setOfferLetterModal({ isOpen: false, candidateId: null, interviewId: null })
          }
          candidateId={offerLetterModal.candidateId!}
          candidateName={`${candidate?.firstName} ${candidate?.lastName}`}
          projectId={
            interview.candidateProjectMap?.project?.id || interview.project?.id || ""
          }
          projectTitle={projectTitle || "Project"}
          roleCatalogId={
            (interview.candidateProjectMap?.roleNeeded || interview.roleNeeded)?.roleCatalogId ||
            (interview.candidateProjectMap?.roleNeeded || interview.roleNeeded)?.roleCatalog?.id ||
            ""
          }
          roleDesignation={roleDesignation}
          isAlreadyUploaded={hasOfferLetter(interview, offerLetterOverrides)}
          existingFileUrl={resolveOfferLetterFileUrl(interview, offerLetterOverrides)}
          onSuccess={(uploadData) => {
            const fileUrl = getOfferLetterUrlFromUpload(uploadData);
            if (!fileUrl) return;

            const overrideKey = getOfferLetterOverrideKey(interview);
            setOfferLetterOverrides((prev) => ({ ...prev, [overrideKey]: fileUrl }));

            try {
              dispatch(processingApi.util.invalidateTags([{ type: "ProcessingSummary" }]));
              dispatch(
                processingApi.endpoints.getCandidatesToTransfer.initiate(
                  { candidateId: candidate?.id, page: 1, limit: 20 },
                  { forceRefetch: true },
                ),
              );
            } catch (err) {
              console.warn("Refresh failed", err);
            }
          }}
        />
      )}

      <PDFViewer
        fileUrl={activePdfUrl}
        fileName={pdfViewerState.fileName}
        isOpen={pdfViewerState.isOpen}
        onClose={() =>
          setPdfViewerState({ ...pdfViewerState, isOpen: false, candidateId: null })
        }
      />
    </>
  );
}
