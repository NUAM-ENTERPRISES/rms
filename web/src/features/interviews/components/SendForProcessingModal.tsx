import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Briefcase, Eye, Loader2, Send, Upload, User, Users } from "lucide-react";
import { OfferLetterBadge } from "./OfferLetterBadge";
import { OfferLetterUploadModal } from "@/features/documents/components/OfferLetterUploadModal";
import { RequestOfferLetterUploadModal } from "@/features/documents/components/RequestOfferLetterUploadModal";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import { useCan, useHasRole } from "@/hooks/useCan";
import { cn } from "@/lib/utils";
import {
  buildOfferLetterNominationKey,
  canShowOfferLetterRequestButton,
  canShowOfferLetterUploadButton,
  findOfferLetterUploadRequestForNomination,
  getOfferLetterUploaderName,
  getOfferLetterUrlFromUpload,
  hasOfferLetter,
  resolveOfferLetterFileUrl,
  type OfferLetterUploadRequestItem,
} from "../utils/offerLetter";
import { useGetInterviewsQuery, type Interview } from "../api";
import { candidatesApi, useGetOfferLetterUploadRequestsQuery } from "@/features/candidates/api";
import { useAppDispatch } from "@/app/hooks";

export type SendForProcessingCandidate = {
  interviewId: string;
  candidateId: string;
  candidateProjectMapId: string;
  candidateName: string;
  projectId: string;
  projectTitle: string;
  roleCatalogId: string;
  roleDesignation: string;
  recruiterName?: string | null;
  hasOfferLetter?: boolean;
  offerLetterUploadedBy?: string | null;
  existingFileUrl?: string;
};

type CandidateGroup = {
  candidateId: string;
  candidateName: string;
  projects: SendForProcessingCandidate[];
};

interface SendForProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedInterviewIds: string[]) => void;
  isLoading?: boolean;
  mode: "single" | "bulk";
  candidates: SendForProcessingCandidate[];
  /** Interview row the user clicked — pre-selected when multiple projects exist. */
  primaryInterviewId?: string;
  onOfferLetterUploaded?: (interviewId: string, fileUrl: string) => void;
}

type OfferLetterModalTarget = SendForProcessingCandidate;

export function mapInterviewToSendForProcessingCandidate(
  item: Interview,
  offerLetterOverrides?: Record<string, string>,
): SendForProcessingCandidate {
  const candidateProjectMap = item.candidateProjectMap;
  const candidate = candidateProjectMap?.candidate || item.candidate;
  const project = candidateProjectMap?.project || item.project;
  const roleCatalogId =
    candidateProjectMap?.roleNeeded?.roleCatalog?.id ||
    (candidateProjectMap?.roleNeeded as { roleCatalogId?: string })?.roleCatalogId ||
    "";

  return {
    interviewId: item.id,
    candidateId: candidate?.id || "",
    candidateProjectMapId: candidateProjectMap?.id || "",
    candidateName: candidate
      ? `${candidate.firstName} ${candidate.lastName}`
      : "Unknown Candidate",
    projectId: project?.id || item.project?.id || "",
    projectTitle: project?.title || "Unknown Project",
    roleCatalogId,
    roleDesignation: candidateProjectMap?.roleNeeded?.designation || "Role",
    recruiterName:
      candidateProjectMap?.recruiter?.name ||
      (item as { recruiter?: { name?: string } }).recruiter?.name ||
      null,
    hasOfferLetter: hasOfferLetter(item, offerLetterOverrides),
    offerLetterUploadedBy: getOfferLetterUploaderName(item),
    existingFileUrl: resolveOfferLetterFileUrl(item, offerLetterOverrides),
  };
}

/** One project nomination per candidate — drop duplicate interview rows for the same project. */
export function dedupeCandidatesByProject(
  items: SendForProcessingCandidate[],
): SendForProcessingCandidate[] {
  const byKey = new Map<string, SendForProcessingCandidate>();

  for (const item of items) {
    const key = `${item.candidateId}:${buildOfferLetterNominationKey(item.projectId, item.roleCatalogId)}`;
    if (!byKey.has(key)) {
      byKey.set(key, item);
    }
  }

  return Array.from(byKey.values());
}

function groupCandidatesByPerson(items: SendForProcessingCandidate[]): CandidateGroup[] {
  const map = new Map<string, CandidateGroup>();

  for (const item of items) {
    const existing = map.get(item.candidateId);
    if (existing) {
      const nominationKey = buildOfferLetterNominationKey(item.projectId, item.roleCatalogId);
      const alreadyListed = existing.projects.some(
        (project) =>
          buildOfferLetterNominationKey(project.projectId, project.roleCatalogId) ===
          nominationKey,
      );
      if (!alreadyListed) {
        existing.projects.push(item);
      }
    } else {
      map.set(item.candidateId, {
        candidateId: item.candidateId,
        candidateName: item.candidateName,
        projects: [item],
      });
    }
  }

  return Array.from(map.values());
}

export function SendForProcessingModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  mode,
  candidates,
  primaryInterviewId,
  onOfferLetterUploaded,
}: SendForProcessingModalProps) {
  const canUploadDocuments = useCan("write:documents");
  const canUploadInterviews = useCan("write:interviews");
  const canWriteCandidates = useCan("write:candidates");
  const isInterviewCoordinator = useHasRole("Interview Coordinator");
  const isRecruiter = useHasRole("Recruiter");
  const canUploadOfferLetter =
    canUploadDocuments ||
    canWriteCandidates ||
    isRecruiter ||
    isInterviewCoordinator ||
    canUploadInterviews;
  const canRequestOfferLetter = isInterviewCoordinator || canUploadInterviews;
  const dispatch = useAppDispatch();

  const [offerLetterOverrides, setOfferLetterOverrides] = useState<Record<string, string>>({});
  const [uploadTarget, setUploadTarget] = useState<OfferLetterModalTarget | null>(null);
  const [requestTarget, setRequestTarget] = useState<OfferLetterModalTarget | null>(null);
  const [uploadRequestsByCandidate, setUploadRequestsByCandidate] = useState<
    Record<string, OfferLetterUploadRequestItem[]>
  >({});
  const [selectedByCandidate, setSelectedByCandidate] = useState<Record<string, string>>({});
  const [acknowledged, setAcknowledged] = useState(false);
  const [pdfViewer, setPdfViewer] = useState<{
    isOpen: boolean;
    fileUrl: string;
    fileName: string;
  }>({ isOpen: false, fileUrl: "", fileName: "" });

  const uniqueCandidateIds = useMemo(
    () => [...new Set(candidates.map((candidate) => candidate.candidateId).filter(Boolean))],
    [candidates],
  );
  const singleCandidateId =
    mode === "single" && uniqueCandidateIds.length === 1
      ? uniqueCandidateIds[0]
      : undefined;

  const { data: singleCandidateUploadRequests, refetch: refetchSingleUploadRequests } =
    useGetOfferLetterUploadRequestsQuery(singleCandidateId ?? "", {
      skip: !isOpen || !singleCandidateId,
    });

  const { data: passedInterviewsData, isFetching: isFetchingPassedInterviews } =
    useGetInterviewsQuery(
      { candidateId: singleCandidateId, status: "passed", page: 1, limit: 50 },
      { skip: !isOpen || !singleCandidateId },
    );

  const nominationCandidates = useMemo(() => {
    const fromProps = dedupeCandidatesByProject(candidates);

    if (!singleCandidateId) {
      return fromProps;
    }

    const fromApi = dedupeCandidatesByProject(
      (passedInterviewsData?.data?.interviews ?? [])
        .filter(
          (interview) =>
            !interview.readyForProcessingAt && !interview.candidateSentForProcessingAt,
        )
        .map((interview) => mapInterviewToSendForProcessingCandidate(interview)),
    );

    return dedupeCandidatesByProject([...fromProps, ...fromApi]);
  }, [candidates, singleCandidateId, passedInterviewsData]);

  const candidateGroups = useMemo(
    () => groupCandidatesByPerson(nominationCandidates),
    [nominationCandidates],
  );

  const displayCandidateIds = useMemo(
    () => nominationCandidates.map((candidate) => candidate.interviewId).join(","),
    [nominationCandidates],
  );

  const selectionInitKey = useMemo(
    () =>
      [
        displayCandidateIds,
        primaryInterviewId ?? "",
        candidates
          .map((candidate) => candidate.interviewId)
          .sort()
          .join(","),
      ].join("|"),
    [displayCandidateIds, primaryInterviewId, candidates],
  );

  const selectedInterviewIds = useMemo(
    () => Object.values(selectedByCandidate).filter(Boolean),
    [selectedByCandidate],
  );
  const selectedCount = selectedInterviewIds.length;
  const lastSelectionInitKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      lastSelectionInitKeyRef.current = null;
      setOfferLetterOverrides({});
      setUploadTarget(null);
      setRequestTarget(null);
      setUploadRequestsByCandidate({});
      setSelectedByCandidate({});
      setAcknowledged(false);
      return;
    }

    if (uniqueCandidateIds.length <= 1) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const entries = await Promise.all(
        uniqueCandidateIds.map(async (candidateId) => {
          try {
            const result = await dispatch(
              candidatesApi.endpoints.getOfferLetterUploadRequests.initiate(candidateId, {
                forceRefetch: true,
              }),
            ).unwrap();
            return [candidateId, result.data ?? []] as const;
          } catch {
            return [candidateId, []] as const;
          }
        }),
      );

      if (!cancelled) {
        setUploadRequestsByCandidate(Object.fromEntries(entries));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, uniqueCandidateIds, dispatch]);

  const getUploadRequestsForCandidate = (candidateId: string) => {
    if (singleCandidateId && candidateId === singleCandidateId) {
      return singleCandidateUploadRequests?.data ?? [];
    }
    return uploadRequestsByCandidate[candidateId] ?? [];
  };

  const getPendingUploadRequest = (candidate: SendForProcessingCandidate) =>
    findOfferLetterUploadRequestForNomination(
      getUploadRequestsForCandidate(candidate.candidateId),
      {
        candidateProjectMapId: candidate.candidateProjectMapId,
        projectId: candidate.projectId,
        roleCatalogId: candidate.roleCatalogId,
      },
    );

  useEffect(() => {
    if (!isOpen || !displayCandidateIds) {
      return;
    }

    if (lastSelectionInitKeyRef.current === selectionInitKey) {
      return;
    }

    lastSelectionInitKeyRef.current = selectionInitKey;

    const preferredIdSet = new Set(candidates.map((candidate) => candidate.interviewId));
    const initial: Record<string, string> = {};

    for (const group of groupCandidatesByPerson(nominationCandidates)) {
      const preferred =
        (primaryInterviewId &&
          group.projects.find((project) => project.interviewId === primaryInterviewId)) ||
        group.projects.find((project) => preferredIdSet.has(project.interviewId)) ||
        group.projects[0];

      if (preferred) {
        initial[group.candidateId] = preferred.interviewId;
      }
    }

    setSelectedByCandidate(initial);
    setAcknowledged(false);
  }, [isOpen, selectionInitKey, displayCandidateIds, primaryInterviewId, nominationCandidates, candidates]);

  const getCandidateOfferState = (candidate: SendForProcessingCandidate) => {
    const overrideUrl = offerLetterOverrides[candidate.interviewId];
    const fileUrl = overrideUrl || candidate.existingFileUrl;
    const hasOfferLetterDoc = candidate.hasOfferLetter || !!overrideUrl;
    return { fileUrl, hasOfferLetter: hasOfferLetterDoc };
  };

  const activePdfUrl = useMemo(() => {
    if (!pdfViewer.isOpen || !pdfViewer.fileUrl) return "";
    return `${pdfViewer.fileUrl}${pdfViewer.fileUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
  }, [pdfViewer.isOpen, pdfViewer.fileUrl]);

  const selectProjectForCandidate = (candidateId: string, interviewId: string) => {
    setSelectedByCandidate((prev) => ({
      ...prev,
      [candidateId]: interviewId,
    }));
  };

  const handleUploadSuccess = (uploadData?: Parameters<typeof getOfferLetterUrlFromUpload>[0]) => {
    const fileUrl = getOfferLetterUrlFromUpload(uploadData);
    if (uploadTarget && fileUrl) {
      setOfferLetterOverrides((prev) => ({
        ...prev,
        [uploadTarget.interviewId]: fileUrl,
      }));
      onOfferLetterUploaded?.(uploadTarget.interviewId, fileUrl);
    }
    setUploadTarget(null);
  };

  const descriptionText = useMemo(() => {
    if (candidateGroups.length === 1) {
      const projectCount = candidateGroups[0]?.projects.length ?? 0;
      if (projectCount <= 1) {
        return "Review the project nomination below. Only one project per candidate can be sent for processing.";
      }
      return "This candidate passed for multiple projects. Choose one project to send — only one project per candidate can go to processing.";
    }
    return `${candidateGroups.length} candidates will be sent — one project nomination per candidate.`;
  }, [candidateGroups]);

  const handleOfferLetterRequestSuccess = async (candidateId: string) => {
    if (singleCandidateId && candidateId === singleCandidateId) {
      await refetchSingleUploadRequests();
      return;
    }

    try {
      const result = await dispatch(
        candidatesApi.endpoints.getOfferLetterUploadRequests.initiate(candidateId, {
          forceRefetch: true,
        }),
      ).unwrap();
      setUploadRequestsByCandidate((prev) => ({
        ...prev,
        [candidateId]: result.data ?? [],
      }));
    } catch {
      // Refetch failure is non-blocking; request was still sent.
    }
  };

  const renderOfferLetterActions = (candidate: SendForProcessingCandidate, compact = false) => {
    const { fileUrl, hasOfferLetter: hasOfferLetterDoc } = getCandidateOfferState(candidate);
    const pendingUploadRequest = getPendingUploadRequest(candidate);
    const hasPendingRequest = Boolean(pendingUploadRequest);

    return (
      <div className={cn("flex flex-wrap items-center gap-2", compact && "shrink-0")}>
        {hasOfferLetterDoc ? (
          <OfferLetterBadge
            size={compact ? "xs" : "sm"}
            align={compact ? "end" : "start"}
            uploaderName={candidate.offerLetterUploadedBy}
          />
        ) : hasPendingRequest ? (
          <Badge
            variant="secondary"
            className={cn(
              "uppercase font-bold border-none bg-blue-100 text-blue-700",
              compact ? "text-[9px]" : "text-[10px]",
            )}
          >
            Requested
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className={cn(
              "uppercase font-bold border-none bg-amber-100 text-amber-700",
              compact ? "text-[9px]" : "text-[10px]",
            )}
          >
            Not uploaded
          </Badge>
        )}
        {hasOfferLetterDoc && fileUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={compact ? "h-7 w-7 p-0" : "h-8 gap-1.5"}
            onClick={() =>
              setPdfViewer({
                isOpen: true,
                fileUrl,
                fileName: `Offer Letter - ${candidate.candidateName}`,
              })
            }
            title="View offer letter"
          >
            <Eye className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            {!compact && "View"}
          </Button>
        )}
        {canShowOfferLetterRequestButton({
          isRecruiter,
          hasOfferLetter: hasOfferLetterDoc,
          hasPendingRequest,
          canRequest: canRequestOfferLetter && Boolean(candidate.candidateProjectMapId),
        }) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              compact ? "h-7 gap-1 px-2 text-xs" : "h-8 gap-1.5",
              "text-amber-700 border-amber-200 hover:bg-amber-50",
            )}
            onClick={(event) => {
              event.stopPropagation();
              setRequestTarget(candidate);
            }}
            title="Request offer letter from recruiter"
          >
            <Send className={compact ? "h-3.5 w-3.5 shrink-0" : "h-4 w-4 shrink-0"} />
            Request
          </Button>
        )}
        {canShowOfferLetterUploadButton({
          isRecruiter,
          hasOfferLetter: hasOfferLetterDoc,
          canUpload: canUploadOfferLetter,
        }) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              compact ? "h-7 w-7 p-0" : "h-8 gap-1.5",
              "text-indigo-700 border-indigo-200 hover:bg-indigo-50",
            )}
            onClick={(event) => {
              event.stopPropagation();
              setUploadTarget(candidate);
            }}
            title="Upload offer letter"
          >
            <Upload className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            {!compact && "Upload"}
          </Button>
        )}
      </div>
    );
  };

  const renderProjectRow = (
    project: SendForProcessingCandidate,
    group: CandidateGroup,
    showRadio: boolean,
  ) => {
    const isSelected = selectedByCandidate[group.candidateId] === project.interviewId;
    const inputId = `send-processing-project-${project.interviewId}`;

    return (
      <div
        key={project.interviewId}
        className={cn(
          "rounded-xl border p-3 transition-colors",
          isSelected
            ? "border-emerald-200 bg-emerald-50/50"
            : "border-slate-100 bg-white",
          showRadio && "cursor-pointer hover:border-emerald-100",
        )}
        onClick={showRadio ? () => selectProjectForCandidate(group.candidateId, project.interviewId) : undefined}
        onKeyDown={
          showRadio
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  selectProjectForCandidate(group.candidateId, project.interviewId);
                }
              }
            : undefined
        }
        role={showRadio ? "radio" : undefined}
        aria-checked={showRadio ? isSelected : undefined}
        tabIndex={showRadio ? 0 : undefined}
      >
        <div className="flex items-start gap-3">
          {showRadio ? (
            <input
              type="radio"
              id={inputId}
              name={`send-processing-${group.candidateId}`}
              checked={isSelected}
              onChange={() => selectProjectForCandidate(group.candidateId, project.interviewId)}
              className="mt-1 h-4 w-4 shrink-0 accent-emerald-600"
              aria-label={`Send ${project.projectTitle} for ${project.candidateName}`}
            />
          ) : null}
          <div className="min-w-0 flex-1 space-y-2">
            <label
              htmlFor={showRadio ? inputId : undefined}
              className={cn("block space-y-1", showRadio && "cursor-pointer")}
            >
              <div className="flex items-center gap-2 text-sm text-slate-800">
                <Briefcase className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="font-semibold truncate">{project.projectTitle}</span>
              </div>
              <p className={cn("text-xs text-slate-500", showRadio && "pl-0")}>
                {project.roleDesignation}
              </p>
            </label>
            <div>{renderOfferLetterActions(project, true)}</div>
          </div>
        </div>
      </div>
    );
  };

  const allCandidatesHaveSelection =
    candidateGroups.length > 0 &&
    candidateGroups.every((group) => Boolean(selectedByCandidate[group.candidateId]));

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-xl max-h-[min(90vh,720px)] flex flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <Send className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-slate-900">
                  Send for Ready For Processing
                </DialogTitle>
                <DialogDescription className="text-slate-500 mt-1">
                  {descriptionText}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2 space-y-4">
            {isFetchingPassedInterviews && singleCandidateId ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading project nominations...
              </div>
            ) : (
              <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                {candidateGroups.map((group) => {
                  const showProjectPicker = group.projects.length > 1;
                  const selectedProject = group.projects.find(
                    (project) => project.interviewId === selectedByCandidate[group.candidateId],
                  );

                  return (
                    <div
                      key={group.candidateId}
                      className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900">{group.candidateName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {showProjectPicker
                              ? `${group.projects.length} projects passed — select one to send`
                              : "1 project nomination"}
                          </p>
                          {(selectedProject?.recruiterName || group.projects[0]?.recruiterName) && (
                            <div className="flex items-center gap-2 text-sm text-slate-600 mt-2">
                              <Users className="h-4 w-4 shrink-0 text-slate-400" />
                              <span className="text-slate-500">Recruiter:</span>
                              <span className="font-medium text-slate-800 truncate">
                                {selectedProject?.recruiterName || group.projects[0]?.recruiterName}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-1">
                          {showProjectPicker ? "Select project to send" : "Project nomination"}
                        </p>
                        {group.projects.map((project) =>
                          renderProjectRow(project, group, showProjectPicker),
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="send-processing-acknowledgement"
                  checked={acknowledged}
                  onCheckedChange={(checked) => setAcknowledged(checked === true)}
                  className="mt-0.5"
                  aria-describedby="send-processing-acknowledgement-text"
                />
                <label
                  htmlFor="send-processing-acknowledgement"
                  id="send-processing-acknowledgement-text"
                  className="text-sm text-slate-700 leading-relaxed cursor-pointer"
                >
                  I confirm that I will call the candidate, obtain the necessary updates from
                  them, and send this candidate for processing for the selected project
                  {selectedCount === 1 ? "" : "s"} only if it is the appropriate nomination.
                  Only one project per candidate can be sent for processing.
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 sm:gap-2 px-6 py-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onConfirm(selectedInterviewIds)}
              disabled={
                isLoading ||
                !allCandidatesHaveSelection ||
                !acknowledged ||
                isFetchingPassedInterviews
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {selectedCount <= 1 ? "Send for Processing" : `Send ${selectedCount} for Processing`}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {uploadTarget && (
        <OfferLetterUploadModal
          isOpen={!!uploadTarget}
          onClose={() => setUploadTarget(null)}
          candidateId={uploadTarget.candidateId}
          candidateName={uploadTarget.candidateName}
          projectId={uploadTarget.projectId}
          projectTitle={uploadTarget.projectTitle}
          roleCatalogId={uploadTarget.roleCatalogId}
          roleDesignation={uploadTarget.roleDesignation}
          isAlreadyUploaded={
            !isRecruiter && getCandidateOfferState(uploadTarget).hasOfferLetter
          }
          existingFileUrl={getCandidateOfferState(uploadTarget).fileUrl}
          onSuccess={handleUploadSuccess}
        />
      )}

      {requestTarget && requestTarget.candidateProjectMapId && (
        <RequestOfferLetterUploadModal
          isOpen={!!requestTarget}
          onOpenChange={(open) => !open && setRequestTarget(null)}
          candidateId={requestTarget.candidateId}
          candidateProjectMapId={requestTarget.candidateProjectMapId}
          candidateName={requestTarget.candidateName}
          projectTitle={requestTarget.projectTitle}
          roleCatalogId={requestTarget.roleCatalogId}
          onSuccess={() => void handleOfferLetterRequestSuccess(requestTarget.candidateId)}
        />
      )}

      <PDFViewer
        isOpen={pdfViewer.isOpen}
        onClose={() => setPdfViewer({ isOpen: false, fileUrl: "", fileName: "" })}
        fileUrl={activePdfUrl}
        fileName={pdfViewer.fileName}
      />
    </>
  );
}
