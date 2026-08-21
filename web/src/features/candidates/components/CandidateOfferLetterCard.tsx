import React, { useMemo, useState } from "react";
import { FileText, Upload, Eye, Loader2, CheckCircle2, AlertCircle, Send } from "lucide-react";
import { RequestOfferLetterUploadModal } from "@/features/documents/components/RequestOfferLetterUploadModal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useGetCandidateProjectsQuery,
  useGetDocumentsQuery,
  useGetOfferLetterUploadRequestsQuery,
} from "../api";
import { OfferLetterUploadModal } from "@/features/documents/components/OfferLetterUploadModal";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import { useCan, useHasRole } from "@/hooks/useCan";
import { OfferLetterBadge } from "@/features/interviews/components/OfferLetterBadge";
import { useGetInterviewsQuery } from "@/features/interviews/api";
import {
  buildOfferLetterNominationKey,
  buildPassedInterviewNominationLookup,
  canShowOfferLetterRequestButton,
  canShowOfferLetterUploadButton,
  canUserUploadOfferLetter,
  findOfferLetterForNomination,
  findOfferLetterUploadRequestForNomination,
  getOfferLetterUploadRequestDisplayMessage,
  getOfferLetterUploadRequestRequesterLabel,
  hasPassedInterviewForNomination,
  isOfferLetterUploadEligible,
  OFFER_LETTER_UPLOAD_REQUEST_TITLE,
  type OfferLetterDocumentItem,
  type OfferLetterInterviewItem,
} from "@/features/interviews/utils/offerLetter";
import { format } from "date-fns";
import { SURFACE_AMBER_SOFT } from "@/lib/page-shell-styles";

interface CandidateOfferLetterCardProps {
  candidateId: string;
  candidateName: string;
  /** When set, only load offer-letter data for this project nomination */
  projectId?: string;
  candidateProjectMapId?: string;
}

const getUploaderLabel = (
  uploadedByUser?: { name?: string; email?: string } | null,
  uploadedBy?: string,
): string | null => {
  if (uploadedByUser?.name) return uploadedByUser.name;
  if (uploadedByUser?.email) return uploadedByUser.email;
  if (uploadedBy) return uploadedBy;
  return null;
};

type UploadTarget = {
  projectId: string;
  projectTitle: string;
  roleCatalogId: string;
  roleDesignation: string;
  existingFileUrl?: string;
  isAlreadyUploaded?: boolean;
};

export const CandidateOfferLetterCard: React.FC<CandidateOfferLetterCardProps> = ({
  candidateId,
  candidateName,
  projectId,
  candidateProjectMapId,
}) => {
  const isScopedToProject = Boolean(projectId);
  const canReadInterviews = useCan("read:interviews");
  const shouldFetchInterviews = canReadInterviews && !isScopedToProject;
  const canUploadDocuments = useCan("write:documents");
  const canUploadInterviews = useCan("write:interviews");
  const canWriteCandidates = useCan("write:candidates");
  const isInterviewCoordinator = useHasRole("Interview Coordinator");
  const isRecruiter = useHasRole("Recruitment Executive");
  const [uploadTarget, setUploadTarget] = useState<UploadTarget | null>(null);
  const [requestTarget, setRequestTarget] = useState<{
    candidateProjectMapId: string;
    projectTitle: string;
    roleCatalogId?: string;
  } | null>(null);
  const [pdfViewer, setPdfViewer] = useState<{
    isOpen: boolean;
    fileUrl: string;
    fileName: string;
  }>({ isOpen: false, fileUrl: "", fileName: "" });
  const [localOverrides, setLocalOverrides] = useState<Record<string, string>>({});

  const { data: projectsData, isLoading: projectsLoading, refetch: refetchProjects } =
    useGetCandidateProjectsQuery(
      {
        candidateId,
        ...(projectId ? { projectId, page: 1, limit: 1 } : { page: 1, limit: 50 }),
      },
      { skip: !candidateId },
    );

  const { data: documentsData, isLoading: docsLoading, refetch: refetchDocs } =
    useGetDocumentsQuery(
      { candidateId, page: 1, limit: 10, docType: "offer_letter" },
      { skip: !candidateId }
    );

  const { data: uploadRequestsData, refetch: refetchUploadRequests } =
    useGetOfferLetterUploadRequestsQuery(candidateId, { skip: !candidateId });

  const { data: passedInterviewsData } = useGetInterviewsQuery(
    {
      candidateId,
      status: "passed",
      page: 1,
      limit: 50,
      ...(projectId ? { projectId } : {}),
    },
    { skip: !candidateId || !shouldFetchInterviews },
  );

  const projects = projectsData?.data ?? [];
  const offerLetters = documentsData?.data?.documents ?? [];
  const uploadRequests = useMemo(() => {
    const all = uploadRequestsData?.data ?? [];
    if (!candidateProjectMapId) {
      return all;
    }
    return all.filter(
      (request) =>
        !request.candidateProjectMapId ||
        request.candidateProjectMapId === candidateProjectMapId,
    );
  }, [uploadRequestsData?.data, candidateProjectMapId]);
  const passedInterviewLookup = useMemo(
    () =>
      buildPassedInterviewNominationLookup(
        (passedInterviewsData?.data?.interviews ??
          []) as OfferLetterInterviewItem[],
      ),
    [passedInterviewsData],
  );

  const rows = useMemo(() => {
    return projects
      .filter((nomination) => nomination.project?.id)
      .map((nomination) => {
        const subStatusName =
          nomination.subStatus?.name ||
          nomination.currentProjectStatus?.statusName ||
          null;
        const roleCatalogId =
          nomination.roleNeeded?.roleCatalogId ||
          (nomination.roleNeeded as { roleCatalog?: { id?: string } })?.roleCatalog?.id ||
          passedInterviewLookup.roleCatalogByMapId.get(nomination.id);
        const projectId = nomination.project!.id;
        const key = buildOfferLetterNominationKey(projectId, roleCatalogId);
        const hasPassedInterview =
          hasPassedInterviewForNomination({
            nominationMapId: nomination.id,
            projectId,
            roleCatalogId,
            passedInterviewLookup,
          }) ||
          (!shouldFetchInterviews && isOfferLetterUploadEligible(subStatusName));
        const doc = findOfferLetterForNomination(
          offerLetters as OfferLetterDocumentItem[],
          {
            nominationMapId: nomination.id,
            projectId,
            roleCatalogId,
          },
        );
        const overrideUrl = localOverrides[key];
        const fileUrl = overrideUrl || doc?.fileUrl;
        const uploadRequest = findOfferLetterUploadRequestForNomination(uploadRequests, {
          candidateProjectMapId: nomination.id,
          projectId,
          roleCatalogId,
        });

        return {
          key,
          candidateProjectMapId: nomination.id,
          projectId,
          projectTitle: nomination.project?.title || "Project",
          roleCatalogId,
          roleDesignation: nomination.roleNeeded?.designation || "Role",
          status: doc?.status,
          fileUrl,
          fileName: doc?.fileName,
          hasDocument: !!(doc || overrideUrl),
          isVerified: doc?.status === "verified",
          uploadedByLabel: getUploaderLabel(doc?.uploadedByUser, doc?.uploadedBy),
          uploadedAt: doc?.createdAt,
          canUploadForRole: !!roleCatalogId,
          hasPassedInterview,
          subStatusName,
          uploadRequest,
        };
      });
  }, [projects, offerLetters, localOverrides, uploadRequests, passedInterviewLookup, shouldFetchInterviews]);

  const canUploadForRow = (
    subStatusName?: string | null,
    hasPassedInterview?: boolean,
  ) =>
    canUserUploadOfferLetter({
      isRecruiter,
      isInterviewCoordinator,
      canUploadDocuments,
      canWriteCandidates,
      canUploadInterviews,
      subStatusName,
      hasPassedInterview,
    });

  const canRequestOfferLetter = isInterviewCoordinator || canUploadInterviews;

  const isLoading = projectsLoading || docsLoading;

  const handleUploadSuccess = (uploadData?: {
    document?: { fileUrl?: string };
    fileUrl?: string;
  }) => {
    const fileUrl = uploadData?.document?.fileUrl || uploadData?.fileUrl;
    if (uploadTarget && fileUrl) {
      const key = buildOfferLetterNominationKey(
        uploadTarget.projectId,
        uploadTarget.roleCatalogId,
      );
      setLocalOverrides((prev) => ({
        ...prev,
        [key]: fileUrl,
      }));
    }
    void refetchDocs();
    void refetchProjects();
    void refetchUploadRequests();
  };

  return (
    <>
      <Card className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm dark:bg-card dark:shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-3 text-xl font-bold text-foreground">
            <div className="rounded-2xl bg-indigo-50 p-2.5 dark:!bg-muted/40">
              <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
            </div>
            Offer Letters
          </CardTitle>
          <CardDescription className="ml-1 font-medium text-muted-foreground">
            After the candidate passes the interview, call them to collect the signed offer letter and upload it per project nomination. If sent for processing before upload, follow the request below to call the candidate and upload the letter.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm font-medium">Loading offer letters...</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/60 px-4 py-8 text-center dark:!bg-muted/20">
              <p className="text-sm font-medium text-foreground">No project nominations yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Nominate this candidate to a project to upload offer letters here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <div
                  key={row.key}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/60 p-4 dark:!bg-muted/20"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="font-semibold text-foreground truncate">{row.projectTitle}</p>
                      <p className="text-sm text-muted-foreground truncate">{row.roleDesignation}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {row.hasDocument ? (
                          <OfferLetterBadge
                            uploaderName={row.uploadedByLabel}
                            uploadedAt={row.uploadedAt}
                          />
                        ) : (
                          <Badge
                            variant="secondary"
                            className="gap-1 border-none bg-muted text-[10px] font-bold uppercase text-muted-foreground dark:!bg-muted/40"
                          >
                            Not uploaded
                          </Badge>
                        )}
                        {row.isVerified && (
                          <Badge
                            variant="secondary"
                            className="gap-1 border-none bg-indigo-100 text-[10px] font-bold uppercase text-indigo-700 dark:!bg-muted/40 dark:text-indigo-300"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Verified
                          </Badge>
                        )}
                        {!row.hasDocument &&
                          !canUploadForRow(row.subStatusName, row.hasPassedInterview) &&
                          (isRecruiter || isInterviewCoordinator) && (
                            <Badge
                              variant="secondary"
                              className={`${SURFACE_AMBER_SOFT} border-none text-[10px] font-bold uppercase`}
                            >
                              Awaiting interview pass
                            </Badge>
                          )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {row.hasDocument && row.fileUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 dark:border-border dark:hover:!bg-muted/40"
                          onClick={() =>
                            setPdfViewer({
                              isOpen: true,
                              fileUrl: row.fileUrl!,
                              fileName: row.fileName || `Offer Letter - ${candidateName}`,
                            })
                          }
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      )}
                      {canShowOfferLetterRequestButton({
                        isRecruiter,
                        hasOfferLetter: row.hasDocument,
                        hasPendingRequest: Boolean(row.uploadRequest),
                        canRequest: canRequestOfferLetter && row.hasPassedInterview,
                      }) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50 dark:!border-border dark:text-amber-300 dark:hover:!bg-muted/40"
                          onClick={() =>
                            setRequestTarget({
                              candidateProjectMapId: row.candidateProjectMapId,
                              projectTitle: row.projectTitle,
                              roleCatalogId: row.roleCatalogId,
                            })
                          }
                        >
                          <Send className="h-4 w-4" />
                          Request
                        </Button>
                      )}
                      {canShowOfferLetterUploadButton({
                        isRecruiter,
                        hasOfferLetter: row.hasDocument,
                        canUpload:
                          canUploadForRow(row.subStatusName, row.hasPassedInterview) &&
                          !row.isVerified &&
                          row.canUploadForRole,
                      }) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50 dark:!border-border dark:text-indigo-300 dark:hover:!bg-muted/40"
                          onClick={() =>
                            setUploadTarget({
                              projectId: row.projectId,
                              projectTitle: row.projectTitle,
                              roleCatalogId: row.roleCatalogId!,
                              roleDesignation: row.roleDesignation,
                              existingFileUrl: row.fileUrl,
                              isAlreadyUploaded: isRecruiter ? false : row.hasDocument,
                            })
                          }
                        >
                          <Upload className="h-4 w-4" />
                          Upload
                        </Button>
                      )}
                    </div>
                  </div>

                  {row.uploadRequest && !row.hasDocument && (
                    <div className={`rounded-xl border p-3 ${SURFACE_AMBER_SOFT}`}>
                      <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-semibold text-amber-900 dark:text-foreground">
                            {OFFER_LETTER_UPLOAD_REQUEST_TITLE}
                          </p>
                          <p className="text-sm leading-relaxed text-amber-800 dark:text-muted-foreground">
                            {getOfferLetterUploadRequestDisplayMessage(
                              row.uploadRequest.reason,
                            )}
                          </p>
                          {(() => {
                            const requesterLabel = getOfferLetterUploadRequestRequesterLabel(
                              row.uploadRequest.reason,
                            );
                            return requesterLabel ? (
                              <p className="text-xs text-amber-700 dark:text-amber-300">
                                Requested by {requesterLabel}
                              </p>
                            ) : null;
                          })()}
                          {row.uploadRequest.requestedAt && (
                            <p className="text-xs text-amber-700">
                              Requested{" "}
                              {format(new Date(row.uploadRequest.requestedAt), "dd MMM yyyy, HH:mm")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {requestTarget && (
        <RequestOfferLetterUploadModal
          isOpen={!!requestTarget}
          onOpenChange={(open) => !open && setRequestTarget(null)}
          candidateId={candidateId}
          candidateProjectMapId={requestTarget.candidateProjectMapId}
          candidateName={candidateName}
          projectTitle={requestTarget.projectTitle}
          roleCatalogId={requestTarget.roleCatalogId}
          onSuccess={() => void refetchUploadRequests()}
        />
      )}

      {uploadTarget && (
        <OfferLetterUploadModal
          isOpen={!!uploadTarget}
          onClose={() => setUploadTarget(null)}
          candidateId={candidateId}
          candidateName={candidateName}
          projectId={uploadTarget.projectId}
          projectTitle={uploadTarget.projectTitle}
          roleCatalogId={uploadTarget.roleCatalogId}
          roleDesignation={uploadTarget.roleDesignation}
          isAlreadyUploaded={uploadTarget.isAlreadyUploaded}
          existingFileUrl={uploadTarget.existingFileUrl}
          onSuccess={handleUploadSuccess}
        />
      )}

      <PDFViewer
        isOpen={pdfViewer.isOpen}
        onClose={() => setPdfViewer({ isOpen: false, fileUrl: "", fileName: "" })}
        fileUrl={pdfViewer.fileUrl}
        fileName={pdfViewer.fileName}
      />
    </>
  );
};
