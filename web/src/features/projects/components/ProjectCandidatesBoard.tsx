import { ReactNode, useMemo, ComponentType, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  Trophy,
  ShieldCheck,
  Users2,
  Send,
} from "lucide-react";
import {
  useGetEligibleCandidatesQuery,
  useGetProjectCandidatesByRoleQuery,
  useCheckBulkCandidateEligibilityQuery,
} from "@/features/projects";
import {
  useGetCandidatesQuery,
  useGetRecruiterMyCandidatesQuery,
} from "@/features/candidates";
import { useAppSelector } from "@/app/hooks";
import { useDebounce } from "@/hooks/useDebounce";
import CandidateCard, {
  CandidateRecord,
} from "@/features/projects/components/CandidateCard";

type CandidateColumnType = "nominated" | "eligible" | "all";

type StatusOption = {
  id: string | number;
  label?: string;
  name?: string;
  statusName?: string;
};

type ProjectAssignment = {
  id?: string;
  candidateId?: string;
  subStatus?: {
    name?: string;
    label?: string;
  };
  currentProjectStatus?: {
    statusName?: string;
  };
  mainStatus?: {
    name?: string;
  };
};

const hasAssignmentData = (
  value: unknown
): value is { data?: ProjectAssignment[] } =>
  typeof value === "object" && value !== null && "data" in value;

interface ProjectCandidatesBoardProps {
  projectId: string;
  project?: any;
  nominatedCandidates: CandidateRecord[];
  isLoadingNominated: boolean;
  searchTerm: string;
  selectedStatus: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  statuses: StatusOption[];
  onViewCandidate: (candidateId: string) => void;
  onAssignCandidate: (candidateId: string, candidateName: string) => void;
  onVerifyCandidate: (candidateId: string, candidateName: string) => void;
  onSendForInterview?: (candidateId: string, candidateName: string) => void;
  onSendForScreening?: (candidateId: string, candidateName: string) => void;
  requiredScreening?: boolean;
  hideContactInfo?: boolean;
}

const COLUMN_MAX_HEIGHT = "max-h-[calc(100vh-20rem)]";

const sanitizeCandidate = (
  candidate: CandidateRecord,
  hideContactInfo?: boolean
): CandidateRecord =>
  hideContactInfo
    ? {
        ...candidate,
        email: undefined,
        contact: undefined,
        mobileNumber: undefined,
        countryCode: undefined,
      }
    : candidate;

const matchesSearchTerm = (candidate: CandidateRecord, term: string) => {
  if (!term) return true;
  const lowerTerm = term.toLowerCase();
  const name = `${candidate.firstName || ""} ${
    candidate.lastName || ""
  }`.toLowerCase();
  const email = candidate.email?.toLowerCase() || "";
  const phone =
    candidate.mobileNumber?.toLowerCase() ||
    candidate.contact?.toLowerCase() ||
    "";

  return (
    name.includes(lowerTerm) ||
    email.includes(lowerTerm) ||
    phone.includes(lowerTerm)
  );
};

const buildAssignmentInfo = (
  candidate: CandidateRecord,
  projectId: string,
  managerAssignments: ProjectAssignment[],
  assignedIds: Set<string>
) => {
  const candidateId = candidate.candidateId || candidate.id || "";
  const assignmentFromCandidate = candidate.projects?.find(
    (project) => project.projectId === projectId
  );
  const assignmentFromManager = managerAssignments.find(
    (assignment) => assignment.candidateId === candidateId
  );

  const isAssigned =
    Boolean(
      assignmentFromCandidate ||
        assignmentFromManager ||
        candidate.projectSubStatus ||
        candidate.projectMainStatus
    ) || assignedIds.has(candidateId);

  const subStatusLabel =
    assignmentFromCandidate?.subStatus?.label ||
    assignmentFromManager?.subStatus?.label ||
    candidate.projectSubStatus?.label;
  const subStatusName =
    assignmentFromCandidate?.subStatus?.name ||
    assignmentFromManager?.subStatus?.name ||
    candidate.projectSubStatus?.name ||
    candidate.projectSubStatus?.statusName;
  const currentProjectStatus =
    assignmentFromCandidate?.currentProjectStatus?.statusName ||
    assignmentFromManager?.currentProjectStatus?.statusName ||
    candidate.currentProjectStatus?.statusName ||
    candidate.projectStatus?.statusName;
  const mainStatus =
    assignmentFromCandidate?.mainStatus?.name ||
    assignmentFromManager?.mainStatus?.name ||
    candidate.projectMainStatus?.name;

  const projectStatusToShow = isAssigned
    ? subStatusLabel ||
      subStatusName ||
      currentProjectStatus ||
      mainStatus ||
      "assigned"
    : "not_in_project";

  const isNominated =
    isAssigned &&
    Boolean(
      subStatusName?.toLowerCase().startsWith("nominated") ||
        mainStatus?.toLowerCase() === "nominated" ||
        currentProjectStatus?.toLowerCase() === "nominated"
    );

  const isVerificationInProgress =
    isAssigned &&
    Boolean(
      subStatusName?.toLowerCase().includes("verification") ||
        subStatusLabel?.toLowerCase().includes("verification") ||
        currentProjectStatus?.toLowerCase().includes("verification")
    );

  // New flag: some projects may skip document verification (direct screening).
  // When a candidate is linked to this project and the backend marks
  // `isSendedForDocumentVerification: false`, we should hide the
  // "Send for Verification" button and show an informational icon.
  // Skip document verification only when the project indicates direct
  // screening (sub-status or main-status contains 'screening') AND
  // the backend flag `isSendedForDocumentVerification` is explicitly false.
  // We also check if the flag is missing but the status clearly indicates screening.
  const shouldSkipDocumentVerification = Boolean(
    (assignmentFromCandidate?.isSendedForDocumentVerification === false ||
      candidate.isSendedForDocumentVerification === false ||
      ((assignmentFromCandidate?.isSendedForDocumentVerification === undefined &&
        candidate.isSendedForDocumentVerification === undefined) &&
        (subStatusName?.toLowerCase().includes("screening") ||
          mainStatus?.toLowerCase().includes("screening") ||
          currentProjectStatus?.toLowerCase().includes("screening")))) &&
      (subStatusName?.toLowerCase().includes("screening") ||
        currentProjectStatus?.toLowerCase().includes("screening") ||
        mainStatus?.toLowerCase().includes("screening"))
  );

  return {
    candidateId,
    isAssigned,
    projectStatus: projectStatusToShow,
    isNominated,
    isVerificationInProgress,
    shouldSkipDocumentVerification,
  };
};

const ProjectCandidatesBoard = ({
  projectId,
  project,
  nominatedCandidates,
  isLoadingNominated,
  searchTerm,
  selectedStatus,
  onSearchChange,
  onStatusChange,
  statuses,
  onViewCandidate,
  onAssignCandidate,
  onVerifyCandidate,
  onSendForInterview,
  hideContactInfo = false,
  onSendForScreening,
  requiredScreening = false,
}: ProjectCandidatesBoardProps) => {
  const { user } = useAppSelector((state) => state.auth);
  const isRecruiter = user?.roles?.includes("Recruiter") ?? false;
  const isManager =
    user?.roles?.some((role) =>
      ["CEO", "Director", "Manager", "Team Head", "Team Lead"].includes(role)
    ) ?? false;

  const { data: eligibleResponse, isLoading: isLoadingEligible } =
    useGetEligibleCandidatesQuery(projectId);

  const recruiterCandidatesQuery = useGetRecruiterMyCandidatesQuery(undefined, {
    skip: !isRecruiter || isManager,
  });
  const allCandidatesQuery = useGetCandidatesQuery(undefined, {
    skip: isRecruiter && !isManager,
  });

  const { data: managerAssignmentsData } = useGetProjectCandidatesByRoleQuery({
    projectId,
    role: "Manager",
  });

  const eligibleCandidates: CandidateRecord[] = Array.isArray(
    eligibleResponse?.data
  )
    ? (eligibleResponse.data as CandidateRecord[])
    : eligibleResponse?.data && typeof eligibleResponse.data === "object"
    ? (eligibleResponse.data as any).candidates ||
      (eligibleResponse.data as any).data ||
      []
    : [];

  // Extract candidates data - matching original RecruiterCandidatesTab pattern
  const recruiterCandidatesData =
    isRecruiter && !isManager ? recruiterCandidatesQuery.data : undefined;

  const allCandidatesData =
    !isRecruiter || isManager ? allCandidatesQuery.data : undefined;

  // Determine which data to use (matching original pattern)
  const candidatesData =
    isRecruiter && !isManager
      ? (recruiterCandidatesData as { data?: CandidateRecord[] } | undefined)
          ?.data
      : allCandidatesData;

  // Extract candidates array - handle both direct array and nested structure
  const allCandidates: CandidateRecord[] = Array.isArray(candidatesData)
    ? candidatesData
    : candidatesData &&
      typeof candidatesData === "object" &&
      "candidates" in candidatesData &&
      Array.isArray(
        (candidatesData as { candidates?: CandidateRecord[] }).candidates
      )
    ? (candidatesData as { candidates: CandidateRecord[] }).candidates
    : candidatesData &&
      typeof candidatesData === "object" &&
      "data" in candidatesData &&
      Array.isArray((candidatesData as { data?: CandidateRecord[] }).data)
    ? (candidatesData as { data: CandidateRecord[] }).data
    : [];

  // Trigger bulk eligibility check when candidates are loaded
  const allCandidateIds = useMemo(() => {
    const ids = new Set<string>();
    nominatedCandidates.forEach((c) => {
      const id = c.candidateId || c.id;
      if (id) ids.add(id);
    });
    eligibleCandidates.forEach((c) => {
      const id = c.candidateId || c.id;
      if (id) ids.add(id);
    });
    allCandidates.forEach((c) => {
      const id = c.candidateId || c.id;
      if (id) ids.add(id);
    });
    return Array.from(ids).sort();
  }, [nominatedCandidates, eligibleCandidates, allCandidates]);

  // Debounce the candidate IDs to avoid multiple API calls as different lists load
  const debouncedCandidateIds = useDebounce(allCandidateIds, 500);

  const { data: bulkEligibilityResponse } = useCheckBulkCandidateEligibilityQuery(
    {
      projectId,
      candidateIds: debouncedCandidateIds,
    },
    {
      skip: !projectId || debouncedCandidateIds.length === 0,
    }
  );

  // Map bulk eligibility data for easy access
  const eligibilityMap = useMemo(() => {
    const map = new Map<string, any>();
    if (
      bulkEligibilityResponse?.data &&
      Array.isArray(bulkEligibilityResponse.data)
    ) {
      bulkEligibilityResponse.data.forEach((item) => {
        map.set(item.candidateId, item);
      });
    }
    return map;
  }, [bulkEligibilityResponse]);

  const managerAssignmentsSource = managerAssignmentsData as unknown;
  const managerAssignmentsPayload = hasAssignmentData(managerAssignmentsSource)
    ? (Reflect.get(managerAssignmentsSource, "data") as
        | ProjectAssignment[]
        | undefined)
    : (managerAssignmentsSource as ProjectAssignment[] | undefined);

  const managerAssignments: ProjectAssignment[] = Array.isArray(
    managerAssignmentsPayload
  )
    ? (managerAssignmentsPayload as ProjectAssignment[])
    : [];
  const assignedToProjectIds = useMemo(
    () =>
      new Set(
        managerAssignments
          .map((assignment) => assignment.candidateId)
          .filter((id): id is string => Boolean(id))
      ),
    [managerAssignments]
  );

  const PAGE_SIZE = 10;

  const [nominatedPage, setNominatedPage] = useState(1);
  const [eligiblePage, setEligiblePage] = useState(1);
  const [allPage, setAllPage] = useState(1);

  const sanitizedNominated = useMemo(
    () =>
      nominatedCandidates.map((candidate: CandidateRecord) =>
        sanitizeCandidate(candidate, hideContactInfo)
      ),
    [nominatedCandidates, hideContactInfo]
  );

  // Reset pagination when search term changes
  useEffect(() => {
    setNominatedPage(1);
    setEligiblePage(1);
    setAllPage(1);
  }, [searchTerm]);


  const filteredEligible = useMemo(
    () =>
      eligibleCandidates.filter(
        (candidate: CandidateRecord) =>
          matchesSearchTerm(candidate, searchTerm) && candidate.id !== undefined
      ),
    [eligibleCandidates, searchTerm]
  );


  const filteredAllCandidates = useMemo(
    () =>
      allCandidates.filter(
        (candidate: CandidateRecord) =>
          matchesSearchTerm(candidate, searchTerm) && candidate.id !== undefined
      ),
    [allCandidates, searchTerm]
  );


  const renderNominatedColumn = () => {
    if (isLoadingNominated) {
      return (
        <div className="space-y-2">
          {[1, 2, 3].map((index) => (
            <div
              key={`nominated-skeleton-${index}`}
              className="h-16 bg-slate-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
      );
    }

    if (sanitizedNominated.length === 0) {
      return (
        <div className="text-center py-8 text-slate-500 text-sm">
          No nominated candidates
        </div>
      );
    }

    const totalNominated = sanitizedNominated.length;
    const nominatedTotalPages = Math.max(1, Math.ceil(totalNominated / PAGE_SIZE));
    const nominatedSlice = sanitizedNominated.slice(
      (nominatedPage - 1) * PAGE_SIZE,
      nominatedPage * PAGE_SIZE
    );

    const items = nominatedSlice.map((candidate) => {
      const assignmentInfo = buildAssignmentInfo(
        candidate,
        projectId,
        managerAssignments,
        assignedToProjectIds
      );

      return { candidate, assignmentInfo };
    });

    return (
      <div className="space-y-3">
        {items.map(({ candidate, assignmentInfo }) => {
          const candidateId = candidate.candidateId || candidate.id;
          if (!candidateId) return null; 

          const candidateWithProject = {
            ...candidate,
            project: candidate.project || project,
          };

          const subStatusName =
            candidate.projectSubStatus?.name ||
            candidate.projectSubStatus?.statusName ||
            "";

          const shouldSkipDocVerification = assignmentInfo.shouldSkipDocumentVerification;

          const showVerifyButton = subStatusName === "nominated_initial";
          const showInterviewButton = subStatusName === "documents_verified";
          const hasProject = Boolean(candidate.project);

          const actions: {
            label: string;
            action: string;
            variant?:
              | "default"
              | "outline"
              | "secondary"
              | "ghost"
              | "destructive";
            icon?: ComponentType<{ className?: string }>;
          }[] = [];

          return (
            <CandidateCard
              key={`nominated-${candidateId}`}
              candidate={candidateWithProject}
              projectId={projectId}
              isRecruiter={isRecruiter}
              onView={() => onViewCandidate(candidateId)}
              onAction={(id, action) => {
                if (action === "assign") {
                  onAssignCandidate(id, `${candidate.firstName} ${candidate.lastName}`);
                }
              }}
              actions={actions}
              projectStatus={
                candidate.projectSubStatus?.label ||
                candidate.projectSubStatus?.name ||
                candidate.currentProjectStatus?.statusName ||
                candidate.projectStatus?.statusName ||
                "nominated"
              }
              showMatchScore={
                candidate.matchScore !== undefined && candidate.matchScore !== null
              }
              matchScore={candidate.matchScore}
              showVerifyButton={!shouldSkipDocVerification && showVerifyButton}
              onVerify={() =>
                onVerifyCandidate(candidateId, `${candidate.firstName} ${candidate.lastName}`)
              }
              showAssignButton={!hasProject}
              onAssignToProject={(id) =>
                onAssignCandidate(id, `${candidate.firstName} ${candidate.lastName}`)
              }
              showSkipDocumentVerification={shouldSkipDocVerification}
              skipDocumentVerificationMessage={
                "This candidate should skip document verification because of direct screening. Once screening is completed you should do document verification."
              }
              showInterviewButton={showInterviewButton}
              onSendForInterview={(id) =>
                onSendForInterview?.(id, `${candidate.firstName} ${candidate.lastName}`)
              }
              isAlreadyInProject={hasProject}
              eligibilityData={eligibilityMap.get(candidateId)}
            />
          );
        })}

        {nominatedTotalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2">
            <div className="text-xs text-slate-500">
              Showing {Math.min((nominatedPage - 1) * PAGE_SIZE + 1, totalNominated)} - {Math.min(nominatedPage * PAGE_SIZE, totalNominated)} of {totalNominated}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setNominatedPage((p) => Math.max(1, p - 1))} disabled={nominatedPage === 1}>
                Prev
              </Button>
              <div className="text-sm">{nominatedPage} / {nominatedTotalPages}</div>
              <Button variant="outline" size="sm" onClick={() => setNominatedPage((p) => Math.min(nominatedTotalPages, p + 1))} disabled={nominatedPage === nominatedTotalPages}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderEligibleColumn = () => {
    if (isLoadingEligible) {
      return (
        <div className="space-y-2">
          {[1, 2, 3].map((index) => (
            <div
              key={`eligible-skeleton-${index}`}
              className="h-16 bg-slate-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
      );
    }

    if (filteredEligible.length === 0) {
      return (
        <div className="text-center py-8 text-slate-500 text-sm">
          No eligible candidates
        </div>
      );
    }

    const totalEligible = filteredEligible.length;
    const eligibleTotalPages = Math.max(1, Math.ceil(totalEligible / PAGE_SIZE));
    const eligibleSlice = filteredEligible.slice((eligiblePage - 1) * PAGE_SIZE, eligiblePage * PAGE_SIZE);

    const eligibleItems = eligibleSlice.map((candidate) => {
      const assignmentInfo = buildAssignmentInfo(
        candidate,
        projectId,
        managerAssignments,
        assignedToProjectIds
      );
      return { candidate, assignmentInfo };
    });

    return (
      <div className="space-y-3">
        {eligibleItems.map(({ candidate, assignmentInfo }) => {
          const sanitized = sanitizeCandidate(candidate, hideContactInfo);
          const candidateWithProject = {
            ...sanitized,
            project: sanitized.project || project,
          };

          const actions = !assignmentInfo.isAssigned
            ? [
                ...(requiredScreening
                  ? [
                      {
                        label: "Send for Direct Screening",
                        action: "send_for_screening",
                        variant: "default" as const,
                        icon: Send,
                      },
                    ]
                  : []),
              ]
            : [];

          const showVerifyButton =
            assignmentInfo.isAssigned && assignmentInfo.isNominated;

          const shouldSkipDocVerification = assignmentInfo.shouldSkipDocumentVerification;

          const showInterviewButton =
            candidate.projectSubStatus?.name === "documents_verified" ||
            candidate.projectSubStatus?.statusName === "documents_verified";

          return (
            <CandidateCard
              key={`eligible-${assignmentInfo.candidateId}`}
              candidate={candidateWithProject}
              projectId={projectId}
              isRecruiter={isRecruiter}
              onView={() => onViewCandidate(assignmentInfo.candidateId)}
              onAction={(id, action) => {
                if (action === "assign") {
                  onAssignCandidate(id, `${candidate.firstName} ${candidate.lastName}`);
                }
                if (action === "send_for_screening") {
                  onSendForScreening?.(id, `${candidate.firstName} ${candidate.lastName}`);
                }
              }}
              actions={actions}
              projectStatus={assignmentInfo.projectStatus}
              showMatchScore
              matchScore={candidate.matchScore}
              showVerifyButton={!shouldSkipDocVerification && showVerifyButton}
              onVerify={() =>
                onVerifyCandidate(assignmentInfo.candidateId, `${candidate.firstName} ${candidate.lastName}`)
              }
              showAssignButton={!assignmentInfo.isAssigned}
              onAssignToProject={(id) => onAssignCandidate(id, `${candidate.firstName} ${candidate.lastName}`)}
              showSkipDocumentVerification={shouldSkipDocVerification}
              skipDocumentVerificationMessage={
                "This candidate should skip document verification because of direct screening. Once screening is completed you should do document verification."
              }
              showInterviewButton={showInterviewButton}
              onSendForInterview={(id) => onSendForInterview?.(id, `${candidate.firstName} ${candidate.lastName}`)}
              isAlreadyInProject={assignmentInfo.isAssigned}
              showDocumentStatus={false}
              eligibilityData={eligibilityMap.get(assignmentInfo.candidateId)}
            />
          );
        })}

        {eligibleTotalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2">
            <div className="text-xs text-slate-500">
              Showing {Math.min((eligiblePage - 1) * PAGE_SIZE + 1, totalEligible)} - {Math.min(eligiblePage * PAGE_SIZE, totalEligible)} of {totalEligible}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setEligiblePage((p) => Math.max(1, p - 1))} disabled={eligiblePage === 1}>
                Prev
              </Button>
              <div className="text-sm">{eligiblePage} / {eligibleTotalPages}</div>
              <Button variant="outline" size="sm" onClick={() => setEligiblePage((p) => Math.min(eligibleTotalPages, p + 1))} disabled={eligiblePage === eligibleTotalPages}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    );



  };

  const renderAllCandidatesColumn = () => {
    const isLoadingAll =
      recruiterCandidatesQuery.isLoading || allCandidatesQuery.isLoading;

    if (isLoadingAll) {
      return (
        <div className="space-y-2">
          {[1, 2, 3].map((index) => (
            <div
              key={`all-skeleton-${index}`}
              className="h-16 bg-slate-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
      );
    }

    if (filteredAllCandidates.length === 0) {
      return (
        <div className="text-center py-8 text-slate-500 text-sm">
          No candidates available
        </div>
      );
    }

    const totalAll = filteredAllCandidates.length;
    const allTotalPages = Math.max(1, Math.ceil(totalAll / PAGE_SIZE));
    const allSlice = filteredAllCandidates.slice((allPage - 1) * PAGE_SIZE, allPage * PAGE_SIZE);

    const allItems = allSlice.map((candidate) => {
      const assignmentInfo = buildAssignmentInfo(
        candidate,
        projectId,
        managerAssignments,
        assignedToProjectIds
      );
      return { candidate, assignmentInfo };
    });

    return (
      <div className="space-y-3">
        {allItems.map(({ candidate, assignmentInfo }) => {
          const sanitized = sanitizeCandidate(candidate, hideContactInfo);
          const candidateWithProject = {
            ...sanitized,
            project: sanitized.project || project,
          };
          const actions = !assignmentInfo.isAssigned
            ? [
                ...(requiredScreening
                  ? [
                      {
                        label: "Send for Direct Screening",
                        action: "send_for_screening",
                        variant: "default" as const,
                        icon: Send,
                      },
                    ]
                  : []),
              ]
            : [];

          const showVerifyButton =
            assignmentInfo.isAssigned &&
            assignmentInfo.isNominated &&
            !assignmentInfo.isVerificationInProgress;

          const shouldSkipDocVerification = Boolean(
            assignmentInfo.shouldSkipDocumentVerification === true
          );
          const showInterviewButton =
            candidate.projectSubStatus?.name === "documents_verified" ||
            candidate.projectSubStatus?.statusName === "documents_verified";

          return (
            <CandidateCard
              key={`all-${assignmentInfo.candidateId}`}
              candidate={candidateWithProject}
              projectId={projectId}
              isRecruiter={isRecruiter}
              onView={() => onViewCandidate(assignmentInfo.candidateId)}
              onAction={(id, action) => {
                if (action === "assign") {
                  onAssignCandidate(id, `${candidate.firstName} ${candidate.lastName}`);
                }
                if (action === "send_for_screening") {
                  onSendForScreening?.(id, `${candidate.firstName} ${candidate.lastName}`);
                }
              }}
              actions={actions}
              projectStatus={assignmentInfo.projectStatus}
              showVerifyButton={!shouldSkipDocVerification && showVerifyButton}
              onVerify={() =>
                onVerifyCandidate(assignmentInfo.candidateId, `${candidate.firstName} ${candidate.lastName}`)
              }
              showAssignButton={!assignmentInfo.isAssigned}
              onAssignToProject={(id) => onAssignCandidate(id, `${candidate.firstName} ${candidate.lastName}`)}
              showSkipDocumentVerification={shouldSkipDocVerification}
              skipDocumentVerificationMessage={
                "This candidate should skip document verification because of direct screening. Once screening is completed you should do document verification."
              }
              showInterviewButton={showInterviewButton}
              onSendForInterview={(id) => onSendForInterview?.(id, `${candidate.firstName} ${candidate.lastName}`)}
              isAlreadyInProject={assignmentInfo.isAssigned}
              showDocumentStatus={assignmentInfo.isAssigned}
              eligibilityData={eligibilityMap.get(assignmentInfo.candidateId)}
            />
          );
        })}

        {allTotalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2">
            <div className="text-xs text-slate-500">
              Showing {Math.min((allPage - 1) * PAGE_SIZE + 1, totalAll)} - {Math.min(allPage * PAGE_SIZE, totalAll)} of {totalAll}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setAllPage((p) => Math.max(1, p - 1))} disabled={allPage === 1}>
                Prev
              </Button>
              <div className="text-sm">{allPage} / {allTotalPages}</div>
              <Button variant="outline" size="sm" onClick={() => setAllPage((p) => Math.min(allTotalPages, p + 1))} disabled={allPage === allTotalPages}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    );


  };

  const columns: Array<{
    id: CandidateColumnType;
    title: string;
    subtitle: string;
    count: number;
    content: ReactNode;
    ariaLabel: string;
    icon: typeof Trophy;
    iconClasses: string;
  }> = [
    {
      id: "nominated",
      title: "Nominated",
      subtitle: "Currently linked to this project",
      count: sanitizedNominated.length,
      content: renderNominatedColumn(),
      ariaLabel: "Nominated candidates column",
      icon: Trophy,
      iconClasses: "bg-amber-100 text-amber-600",
    },
    {
      id: "eligible",
      title: "Eligible",
      subtitle: "Matches project requirements",
      count: filteredEligible.length,
      content: renderEligibleColumn(),
      ariaLabel: "Eligible candidates column",
      icon: ShieldCheck,
      iconClasses: "bg-emerald-100 text-emerald-600",
    },
    {
      id: "all",
      title: isRecruiter && !isManager ? "My Candidates" : "All Candidates",
      subtitle:
        isRecruiter && !isManager
          ? "Candidates assigned to you"
          : "Entire candidate pool",
      count: filteredAllCandidates.length,
      content: renderAllCandidatesColumn(),
      ariaLabel:
        isRecruiter && !isManager
          ? "My candidates column"
          : "All candidates column",
      icon: Users2,
      iconClasses: "bg-sky-100 text-sky-600",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder="Search candidates..."
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            className="pl-10"
            aria-label="Search all candidates"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <Select value={selectedStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status.id} value={status.id.toString()}>
                  {status.label || status.statusName || status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {columns.map((column) => (
          <Card
            key={column.id}
            className="border-0 shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl flex flex-col"
            aria-labelledby={`column-${column.id}-title`}
          >
            <CardHeader className="!px-3 !py-1.5 !pb-1.5 border-b border-slate-200">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${column.iconClasses}`}
                    aria-hidden="true"
                  >
                    <column.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle
                      id={`column-${column.id}-title`}
                      className="text-sm font-semibold text-slate-900 truncate leading-tight"
                    >
                      {column.title}
                    </CardTitle>
                    <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
                      {column.subtitle}
                    </p>
                  </div>
                </div>
                <span
                  className="text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full flex-shrink-0"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {column.count}
                </span>
              </div>
            </CardHeader>
            <CardContent
              className={`flex-1 px-2 overflow-y-auto ${COLUMN_MAX_HEIGHT} space-y-3`}
              role="list"
              aria-label={column.ariaLabel}
            >
              {column.content}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ProjectCandidatesBoard;
