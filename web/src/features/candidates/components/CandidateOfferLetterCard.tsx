import React, { useMemo, useState } from "react";
import { FileText, Upload, Eye, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
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
  canShowOfferLetterUploadButton,
  canUserUploadOfferLetter,
  hasPassedInterviewForNomination,
  type OfferLetterInterviewItem,
} from "@/features/interviews/utils/offerLetter";
import { format } from "date-fns";

interface CandidateOfferLetterCardProps {
  candidateId: string;
  candidateName: string;
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
}) => {
  const canUploadDocuments = useCan("write:documents");
  const canUploadInterviews = useCan("write:interviews");
  const canWriteCandidates = useCan("write:candidates");
  const isInterviewCoordinator = useHasRole("Interview Coordinator");
  const isRecruiter = useHasRole("Recruiter");
  const [uploadTarget, setUploadTarget] = useState<UploadTarget | null>(null);
  const [pdfViewer, setPdfViewer] = useState<{
    isOpen: boolean;
    fileUrl: string;
    fileName: string;
  }>({ isOpen: false, fileUrl: "", fileName: "" });
  const [localOverrides, setLocalOverrides] = useState<Record<string, string>>({});

  const { data: projectsData, isLoading: projectsLoading, refetch: refetchProjects } =
    useGetCandidateProjectsQuery({ candidateId, page: 1, limit: 50 }, { skip: !candidateId });

  const { data: documentsData, isLoading: docsLoading, refetch: refetchDocs } =
    useGetDocumentsQuery(
      { candidateId, page: 1, limit: 50, docType: "offer_letter" },
      { skip: !candidateId }
    );

  const { data: uploadRequestsData, refetch: refetchUploadRequests } =
    useGetOfferLetterUploadRequestsQuery(candidateId, { skip: !candidateId });

  const { data: passedInterviewsData } = useGetInterviewsQuery(
    { candidateId, status: "passed", page: 1, limit: 50 },
    { skip: !candidateId },
  );

  const projects = projectsData?.data ?? [];
  const offerLetters = documentsData?.data?.documents ?? [];
  const uploadRequests = uploadRequestsData?.data ?? [];
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
        const roleCatalogId =
          nomination.roleNeeded?.roleCatalogId ||
          (nomination.roleNeeded as { roleCatalog?: { id?: string } })?.roleCatalog?.id;
        const projectId = nomination.project!.id;
        const key = buildOfferLetterNominationKey(projectId, roleCatalogId);
        const hasPassedInterview = hasPassedInterviewForNomination({
          nominationMapId: nomination.id,
          projectId,
          roleCatalogId,
          passedInterviewLookup,
        });
        const doc = roleCatalogId
          ? offerLetters.find(
              (d) =>
                d.roleCatalogId === roleCatalogId ||
                d.roleCatalog?.id === roleCatalogId,
            )
          : undefined;
        const overrideUrl = localOverrides[key];
        const fileUrl = overrideUrl || doc?.fileUrl;
        const uploadRequest = uploadRequests.find(
          (request) =>
            request.projectId === projectId &&
            (request.roleCatalogId === roleCatalogId ||
              (!request.roleCatalogId && !roleCatalogId)),
        );

        return {
          key,
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
          subStatusName:
            nomination.subStatus?.name ||
            nomination.currentProjectStatus?.statusName ||
            null,
          uploadRequest,
        };
      });
  }, [projects, offerLetters, localOverrides, uploadRequests, passedInterviewLookup]);

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

  const isLoading = projectsLoading || docsLoading;

  const handleUploadSuccess = (uploadData?: {
    document?: { fileUrl?: string };
    fileUrl?: string;
  }) => {
    const fileUrl = uploadData?.document?.fileUrl || uploadData?.fileUrl;
    if (uploadTarget && fileUrl) {
      const key = `${uploadTarget.projectId}-${uploadTarget.roleCatalogId}`;
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
      <Card className="overflow-hidden rounded-3xl border-0 bg-white/90 shadow-xl backdrop-blur-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
            <div className="rounded-2xl bg-indigo-50 p-2.5">
              <FileText className="h-6 w-6 text-indigo-600" />
            </div>
            Offer Letters
          </CardTitle>
          <CardDescription className="ml-1 font-medium text-slate-500">
            Upload offer letters per project nomination after the candidate has passed the interview. Recruiters and interview coordinators can upload when received from the candidate.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm font-medium">Loading offer letters...</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
              <p className="text-sm font-medium text-slate-700">No project nominations yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Nominate this candidate to a project to upload offer letters here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <div
                  key={row.key}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="font-semibold text-slate-900 truncate">{row.projectTitle}</p>
                      <p className="text-sm text-slate-500 truncate">{row.roleDesignation}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {row.hasDocument ? (
                          <OfferLetterBadge
                            uploaderName={row.uploadedByLabel}
                            uploadedAt={row.uploadedAt}
                          />
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-slate-100 text-slate-600 border-none text-[10px] uppercase font-bold"
                          >
                            Not uploaded
                          </Badge>
                        )}
                        {row.isVerified && (
                          <Badge
                            variant="secondary"
                            className="bg-indigo-100 text-indigo-700 border-none text-[10px] uppercase font-bold gap-1"
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
                              className="bg-amber-50 text-amber-700 border-none text-[10px] uppercase font-bold"
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
                          className="h-8 gap-1.5"
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
                          className="h-8 gap-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
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
                    <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-semibold text-amber-900">
                            Upload requested — sent for processing without offer letter
                          </p>
                          <p className="text-sm text-amber-800 leading-relaxed">
                            {row.uploadRequest.reason}
                          </p>
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
