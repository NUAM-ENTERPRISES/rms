import { useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertCircle, Eye, FileText, Send, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import { OfferLetterUploadModal } from "@/features/documents/components/OfferLetterUploadModal";
import { RequestOfferLetterUploadModal } from "@/features/documents/components/RequestOfferLetterUploadModal";
import {
  useGetDocumentsQuery,
  useGetOfferLetterUploadRequestsQuery,
} from "@/features/candidates/api";
import { useCan, useHasRole } from "@/hooks/useCan";
import { OfferLetterBadge } from "./OfferLetterBadge";
import {
  canShowOfferLetterRequestButton,
  canShowOfferLetterUploadButton,
  canUserUploadOfferLetter,
  findOfferLetterForNomination,
  findOfferLetterUploadRequestForNomination,
  getOfferLetterOverrideKey,
  getOfferLetterUploadRequestCoordinatorDisplayMessage,
  getOfferLetterUploadRequestDisplayMessage,
  getOfferLetterUrlFromUpload,
  getOfferLetterUploaderName,
  hasOfferLetter,
  OFFER_LETTER_UPLOAD_REQUEST_COORDINATOR_TITLE,
  OFFER_LETTER_UPLOAD_REQUEST_TITLE,
  resolveOfferLetterFileUrl,
  type OfferLetterInterviewItem,
} from "../utils/offerLetter";

function mergeInterviewOfferLetterFromDocument(
  interview: OfferLetterInterviewItem,
  documentOfferLetter?: {
    fileUrl?: string;
    fileName?: string;
    status?: string;
    createdAt?: string;
    uploadedByUser?: { name?: string; email?: string } | null;
  },
): OfferLetterInterviewItem {
  if (!documentOfferLetter?.fileUrl) {
    return interview;
  }

  return {
    ...interview,
    isOfferLetterUploaded: true,
    offerLetterData: {
      ...(interview.offerLetterData ?? {}),
      status: documentOfferLetter.status ?? interview.offerLetterData?.status,
      document: {
        ...(interview.offerLetterData?.document ?? {}),
        fileUrl: documentOfferLetter.fileUrl,
        fileName: documentOfferLetter.fileName,
        createdAt: documentOfferLetter.createdAt,
        uploadedByUser:
          documentOfferLetter.uploadedByUser ??
          interview.offerLetterData?.document?.uploadedByUser,
      },
    },
  };
}

type InterviewOfferLetterSectionProps = {
  interview: OfferLetterInterviewItem & {
    id?: string;
    outcome?: string;
  };
  candidateName: string;
  onUploadSuccess?: () => void;
};

function resolveRoleCatalogId(interview: InterviewOfferLetterSectionProps["interview"]): string | undefined {
  const roleNeeded = interview.candidateProjectMap?.roleNeeded;
  return (
    roleNeeded?.roleCatalog?.id ||
    roleNeeded?.roleCatalogId ||
    undefined
  );
}

export function InterviewOfferLetterSection({
  interview,
  candidateName,
  onUploadSuccess,
}: InterviewOfferLetterSectionProps) {
  const isInterviewCoordinator = useHasRole("Interview Coordinator");
  const isRecruiter = useHasRole("Recruiter");
  const canUploadInterviews = useCan("write:interviews");
  const [overrideUrl, setOverrideUrl] = useState<string | undefined>();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [pdfViewer, setPdfViewer] = useState({
    isOpen: false,
    fileUrl: "",
    fileName: "",
  });

  const projectId =
    interview.candidateProjectMap?.project?.id || interview.project?.id;
  const candidateId =
    interview.candidateProjectMap?.candidate?.id || interview.candidate?.id;
  const candidateProjectMapId = interview.candidateProjectMap?.id;
  const projectTitle =
    interview.candidateProjectMap?.project?.title ||
    interview.project?.title ||
    "Project";
  const roleDesignation =
    interview.candidateProjectMap?.roleNeeded?.designation ||
    interview.roleNeeded?.designation ||
    "Role";
  const roleCatalogId = resolveRoleCatalogId(interview);
  const isPassed = interview.outcome?.toLowerCase() === "passed";

  const interviewHasOfferLetter = hasOfferLetter(interview);
  const { data: documentsData, refetch: refetchDocuments } = useGetDocumentsQuery(
    { candidateId: candidateId ?? "", page: 1, limit: 10, docType: "offer_letter" },
    { skip: !candidateId || interviewHasOfferLetter },
  );

  const documentOfferLetter = useMemo(() => {
    if (!projectId || interviewHasOfferLetter) return undefined;
    return findOfferLetterForNomination(documentsData?.data?.documents ?? [], {
      nominationMapId: candidateProjectMapId,
      projectId,
      roleCatalogId,
    });
  }, [
    documentsData?.data?.documents,
    candidateProjectMapId,
    projectId,
    roleCatalogId,
    interviewHasOfferLetter,
  ]);

  const resolvedInterview = useMemo(
    () => mergeInterviewOfferLetterFromDocument(interview, documentOfferLetter),
    [interview, documentOfferLetter],
  );

  const overrides = useMemo(
    () =>
      overrideUrl
        ? { [getOfferLetterOverrideKey(resolvedInterview)]: overrideUrl }
        : undefined,
    [resolvedInterview, overrideUrl],
  );

  const offerLetterUploaded = hasOfferLetter(resolvedInterview, overrides);
  const fileUrl = resolveOfferLetterFileUrl(resolvedInterview, overrides);
  const uploaderName = getOfferLetterUploaderName(resolvedInterview);
  const uploadedAt = resolvedInterview.offerLetterData?.document?.createdAt ?? null;
  const isVerified = resolvedInterview.offerLetterData?.status === "verified";

  const { data: uploadRequestsData, refetch: refetchUploadRequests } =
    useGetOfferLetterUploadRequestsQuery(candidateId ?? "", { skip: !candidateId });

  const uploadRequest = useMemo(() => {
    const requests = uploadRequestsData?.data ?? [];
    if (!projectId) return undefined;
    return findOfferLetterUploadRequestForNomination(requests, {
      candidateProjectMapId,
      projectId,
      roleCatalogId,
    });
  }, [uploadRequestsData?.data, candidateProjectMapId, projectId, roleCatalogId]);

  const canUpload = canUserUploadOfferLetter({
    isRecruiter,
    isInterviewCoordinator,
    canUploadDocuments: false,
    canWriteCandidates: false,
    canUploadInterviews: false,
    assumeInterviewPassed: isPassed,
  });

  const showUploadButton = canShowOfferLetterUploadButton({
    isRecruiter,
    hasOfferLetter: offerLetterUploaded,
    canUpload: canUpload && !isVerified && Boolean(projectId && candidateId && roleCatalogId),
  });

  const canRequestOfferLetter = isInterviewCoordinator || canUploadInterviews;
  const showRequestButton = canShowOfferLetterRequestButton({
    isRecruiter,
    hasOfferLetter: offerLetterUploaded,
    hasPendingRequest: Boolean(uploadRequest),
    canRequest: canRequestOfferLetter && isPassed && Boolean(candidateProjectMapId),
  });

  const hasPendingRequest = Boolean(uploadRequest) && !offerLetterUploaded;
  const showRecruiterRequestBanner = hasPendingRequest && isRecruiter;
  const showCoordinatorRequestBanner =
    hasPendingRequest && !isRecruiter && canRequestOfferLetter;

  const canView = offerLetterUploaded && Boolean(fileUrl);

  if (!projectId || !candidateId) {
    return null;
  }

  return (
    <>
      <Card className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-500" />
            <div>
              <h3 className="text-lg font-bold text-slate-800">Offer Letter</h3>
              <p className="text-xs text-slate-500">
                Signed offer letter for this project nomination
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {offerLetterUploaded ? (
              <OfferLetterBadge
                uploaderName={uploaderName}
                uploadedAt={uploadedAt}
              />
            ) : (
              <Badge
                variant="secondary"
                className="bg-slate-100 text-slate-600 border-none text-[10px] uppercase font-bold"
              >
                Not uploaded
              </Badge>
            )}
            {isVerified && (
              <Badge
                variant="secondary"
                className="bg-indigo-100 text-indigo-700 border-none text-[10px] uppercase font-bold"
              >
                Verified
              </Badge>
            )}
          </div>
        </div>

        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-slate-900 truncate">{projectTitle}</p>
              <p className="text-sm text-slate-500 truncate">{roleDesignation}</p>
              {!isPassed && !offerLetterUploaded && (isRecruiter || isInterviewCoordinator) && (
                <p className="text-xs text-amber-700">
                  Upload is available after the interview is marked as passed.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {hasPendingRequest && (
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-700 border-none text-[10px] uppercase font-bold"
                >
                  Requested
                </Badge>
              )}
              {canView && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5"
                  onClick={() =>
                    setPdfViewer({
                      isOpen: true,
                      fileUrl: fileUrl!,
                      fileName: `Offer Letter - ${candidateName}`,
                    })
                  }
                >
                  <Eye className="h-4 w-4" />
                  View
                </Button>
              )}
              {showRequestButton && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50"
                  onClick={() => setIsRequestOpen(true)}
                >
                  <Send className="h-4 w-4" />
                  Request
                </Button>
              )}
              {showUploadButton && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                  onClick={() => setIsUploadOpen(true)}
                >
                  <Upload className="h-4 w-4" />
                  {offerLetterUploaded ? "Re-upload" : "Upload"}
                </Button>
              )}
            </div>
          </div>

          {showRecruiterRequestBanner && uploadRequest && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/90 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-amber-900">
                    {OFFER_LETTER_UPLOAD_REQUEST_TITLE}
                  </p>
                  <p className="text-sm text-amber-800 leading-relaxed">
                    {getOfferLetterUploadRequestDisplayMessage(uploadRequest.reason)}
                  </p>
                  {uploadRequest.requestedAt && (
                    <p className="text-xs text-amber-700">
                      Requested{" "}
                      {format(new Date(uploadRequest.requestedAt), "dd MMM yyyy, HH:mm")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {showCoordinatorRequestBanner && uploadRequest && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/90 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-blue-900">
                    {OFFER_LETTER_UPLOAD_REQUEST_COORDINATOR_TITLE}
                  </p>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    {getOfferLetterUploadRequestCoordinatorDisplayMessage(uploadRequest.reason)}
                  </p>
                  {uploadRequest.requestedAt && (
                    <p className="text-xs text-blue-700">
                      Sent to recruiter{" "}
                      {format(new Date(uploadRequest.requestedAt), "dd MMM yyyy, HH:mm")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isRequestOpen && candidateProjectMapId && (
        <RequestOfferLetterUploadModal
          isOpen={isRequestOpen}
          onOpenChange={(open) => setIsRequestOpen(open)}
          candidateId={candidateId}
          candidateProjectMapId={candidateProjectMapId}
          candidateName={candidateName}
          projectTitle={projectTitle}
          roleCatalogId={roleCatalogId}
          onSuccess={() => {
            setIsRequestOpen(false);
            void refetchUploadRequests();
          }}
        />
      )}

      {isUploadOpen && roleCatalogId && (
        <OfferLetterUploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          candidateId={candidateId}
          candidateName={candidateName}
          projectId={projectId}
          projectTitle={projectTitle}
          roleCatalogId={roleCatalogId}
          roleDesignation={roleDesignation}
          existingFileUrl={fileUrl}
          isAlreadyUploaded={isRecruiter ? false : offerLetterUploaded}
          onSuccess={(data) => {
            const nextUrl = getOfferLetterUrlFromUpload(data);
            if (nextUrl) setOverrideUrl(nextUrl);
            setIsUploadOpen(false);
            void refetchUploadRequests();
            void refetchDocuments();
            onUploadSuccess?.();
          }}
        />
      )}

      <PDFViewer
        isOpen={pdfViewer.isOpen}
        onClose={() => setPdfViewer((prev) => ({ ...prev, isOpen: false }))}
        fileUrl={pdfViewer.fileUrl}
        fileName={pdfViewer.fileName}
      />
    </>
  );
}
