import { ReactNode, useMemo, useState, useEffect } from "react";
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
  Trophy,
  ShieldCheck,
  Users2,
  Send,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Filter,
} from "lucide-react";
import {
  useGetEligibleCandidatesQuery,
  useCheckBulkCandidateEligibilityQuery,
} from "@/features/projects";
import {
  useGetConsolidatedCandidatesQuery,
} from "@/features/candidates";
import { useAppSelector } from "@/app/hooks";
import { useDebounce } from "@/hooks/useDebounce";
import CandidateCard, {
  CandidateRecord,
} from "@/features/projects/components/CandidateCard";

type CandidateColumnType = "nominated" | "eligible" | "all";

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


interface ProjectCandidatesBoardProps {
  projectId: string;
  project?: any;
  nominatedCandidates: CandidateRecord[];
  isLoadingNominated: boolean;
  searchTerm: string;
  selectedRole: string;
  onSearchChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  roles: any[];
  onViewCandidate: (candidateId: string) => void;
  onAssignCandidate: (candidateId: string, candidateName: string) => void;
  onVerifyCandidate: (candidateId: string, candidateName: string) => void;
  onSendForInterview?: (candidateId: string, candidateName: string) => void;
  onSendForScreening?: (candidateId: string, candidateName: string) => void;
  requiredScreening?: boolean;
  hideContactInfo?: boolean; // eslint-disable-line @typescript-eslint/no-unused-vars -- passed through to CandidateCard
}

const COLUMN_MAX_HEIGHT = "max-h-[calc(100vh-18rem)]";

// Skeleton card component for loading states
const SkeletonCard = () => (
  <div className="relative overflow-hidden rounded-xl border border-slate-100 bg-white p-3 space-y-3">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-slate-100 animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-28 bg-slate-100 rounded-md animate-pulse" />
        <div className="h-2.5 w-20 bg-slate-50 rounded-md animate-pulse" />
      </div>
      <div className="h-5 w-14 bg-slate-100 rounded-full animate-pulse" />
    </div>
    <div className="flex gap-2">
      <div className="h-5 w-16 bg-slate-50 rounded-full animate-pulse" />
      <div className="h-5 w-12 bg-slate-50 rounded-full animate-pulse" />
    </div>
    {/* shimmer overlay */}
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
  </div>
);

// Empty state component
const EmptyColumnState = ({ message, icon: Icon }: { message: string; icon: typeof Inbox }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
      <Icon className="h-6 w-6 text-slate-300" />
    </div>
    <p className="text-sm text-slate-400 font-medium text-center">{message}</p>
    <p className="text-xs text-slate-300 mt-1">Try adjusting your filters</p>
  </div>
);

// Pagination component
const PaginationControls = ({ page, totalPages, total, pageSize, onPageChange }: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) => (
  <div className="flex items-center justify-between px-1 py-2 mt-1">
    <span className="text-[11px] text-slate-400 tabular-nums">
      {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
    </span>
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="h-7 w-7 p-0 rounded-lg hover:bg-slate-100 disabled:opacity-30"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>
      <span className="text-[11px] text-slate-500 font-medium tabular-nums min-w-[2rem] text-center">
        {page}/{totalPages}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="h-7 w-7 p-0 rounded-lg hover:bg-slate-100 disabled:opacity-30"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  </div>
);

const sanitizeCandidate = (
  candidate: CandidateRecord,
  _hideContactInfo?: boolean
): CandidateRecord =>
  // we used to strip contact fields here when hideContactInfo was true,
  // but the tooltip relies on them. instead we simply return the record and
  // let the card component hide the pills conditionally.
  candidate;

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

  // Check qualifications (both `qualifications` and `candidateQualifications` shapes)
  const quals = (candidate.qualifications || candidate.candidateQualifications || []) as any[];
  const qualificationMatch = Array.isArray(quals) && quals.some((q) => {
    const names = [
      (q.name as string) || "",
      (q.qualification && (q.qualification.name as string)) || "",
      (q.qualification && (q.qualification.shortName as string)) || "",
      (q.field as string) || "",
      (q.university as string) || "",
    ]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase());
    return names.some((s) => s.includes(lowerTerm));
  });

  // Check skills
  const skillsMatch = Array.isArray(candidate.skills) && candidate.skills.some((s) => (s || "").toLowerCase().includes(lowerTerm));

  // Check role matches (designation)
  const roleMatchesMatch = Array.isArray(candidate.roleMatches) && candidate.roleMatches.some((rm) => (rm.designation || "").toLowerCase().includes(lowerTerm));

  return (
    name.includes(lowerTerm) ||
    email.includes(lowerTerm) ||
    phone.includes(lowerTerm) ||
    qualificationMatch ||
    skillsMatch ||
    roleMatchesMatch
  );
};

const buildAssignmentInfo = (
  candidate: CandidateRecord,
  projectId: string,
  managerAssignments: ProjectAssignment[],
  assignedIds: Set<string>
) => {
  const candidateId = candidate.candidateId || candidate.id || "";
  
  // Use projectDetails from consolidated API or find in projects array if available
  const isConsolidatedMatch = candidate.projectDetails?.projectId === projectId;
  const assignmentFromCandidate = isConsolidatedMatch 
    ? candidate.projectDetails 
    : candidate.projects?.find((project) => project.projectId === projectId);
    
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
    (assignmentFromCandidate as any)?.subStatus?.label ||
    (assignmentFromCandidate as any)?.subStatus || // consolidated string
    assignmentFromManager?.subStatus?.label ||
    candidate.projectSubStatus?.label;
    
  const subStatusName =
    (assignmentFromCandidate as any)?.subStatus?.name ||
    (assignmentFromCandidate as any)?.subStatus || // consolidated string
    assignmentFromManager?.subStatus?.name ||
    candidate.projectSubStatus?.name ||
    candidate.projectSubStatus?.statusName;
    
  const currentProjectStatus =
    (assignmentFromCandidate as any)?.currentProjectStatus?.statusName ||
    (assignmentFromCandidate as any)?.mainStatus || // consolidated string
    assignmentFromManager?.currentProjectStatus?.statusName ||
    candidate.currentProjectStatus?.statusName ||
    candidate.projectStatus?.statusName;
    
  const mainStatus =
    (assignmentFromCandidate as any)?.mainStatus?.name ||
    (assignmentFromCandidate as any)?.mainStatus || // consolidated string
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
      String(subStatusName || "").toLowerCase().startsWith("nominated") ||
        String(mainStatus || "").toLowerCase() === "nominated" ||
        String(currentProjectStatus || "").toLowerCase() === "nominated"
    );

  const isVerificationInProgress =
    isAssigned &&
    Boolean(
      String(subStatusName || "").toLowerCase().includes("verification") ||
        String(subStatusLabel || "").toLowerCase().includes("verification") ||
        String(currentProjectStatus || "").toLowerCase().includes("verification")
    );

  // New flag: some projects may skip document verification (direct screening).
  const shouldSkipDocumentVerification = Boolean(
    ((assignmentFromCandidate as any)?.isSendedForDocumentVerification === false ||
      candidate.isSendedForDocumentVerification === false ||
      (((assignmentFromCandidate as any)?.isSendedForDocumentVerification === undefined &&
        candidate.isSendedForDocumentVerification === undefined) &&
        (String(subStatusName || "").toLowerCase().includes("screening") ||
          String(mainStatus || "").toLowerCase().includes("screening") ||
          String(currentProjectStatus || "").toLowerCase().includes("screening")))) &&
      (String(subStatusName || "").toLowerCase().includes("screening") ||
        String(currentProjectStatus || "").toLowerCase().includes("screening") ||
        String(mainStatus || "").toLowerCase().includes("screening"))
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
  selectedRole,
  onSearchChange,
  onRoleChange,
  roles,
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
    useGetEligibleCandidatesQuery({
      projectId,
      search: searchTerm || undefined,
      roleCatalogId: selectedRole !== "all" ? selectedRole : undefined,
      limit: 10,
    }, { refetchOnFocus: true });

  const consolidatedCandidatesQuery = useGetConsolidatedCandidatesQuery({
    projectId,
    search: searchTerm || undefined,
    roleCatalogId: selectedRole !== "all" ? selectedRole : undefined,
    limit: 10,
  }, { refetchOnFocus: true });

  const eligibleCandidates: CandidateRecord[] = Array.isArray(
    eligibleResponse?.data
  )
    ? (eligibleResponse.data as CandidateRecord[])
    : eligibleResponse?.data && typeof eligibleResponse.data === "object"
    ? (eligibleResponse.data as any).candidates ||
      (eligibleResponse.data as any).data ||
      []
    : [];

  const allCandidates: CandidateRecord[] = (
    consolidatedCandidatesQuery.data?.data?.candidates || []
  ) as CandidateRecord[];

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
      refetchOnFocus: true,
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

  // Manager assignments removed — rely on candidate.project and other status fields instead
  const managerAssignments: ProjectAssignment[] = [];
  const assignedToProjectIds = useMemo(() => new Set<string>(), []);

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

  // Reset pagination when search term or role filter changes
  useEffect(() => {
    setNominatedPage(1);
    setEligiblePage(1);
    setAllPage(1);
  }, [searchTerm, selectedRole]);


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
        <div className="space-y-3">
          {[1, 2, 3].map((index) => (
            <SkeletonCard key={`nominated-skeleton-${index}`} />
          ))}
        </div>
      );
    }

    if (sanitizedNominated.length === 0) {
      return <EmptyColumnState message="No nominated candidates" icon={Trophy} />;
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

          const isAlreadyInScreening = [
            "screening_assigned",
            "screening_scheduled",
            "screening_in_progress",
            "screening_completed",
            "screening_passed",
            "screening_failed",
          ].includes(subStatusName);

          const shouldSkipDocVerification = assignmentInfo.shouldSkipDocumentVerification;

          const showVerifyButton = subStatusName === "nominated_initial";
          const showInterviewButton = subStatusName === "documents_verified";
          const hasProject = Boolean(candidate.project);

          const actions = (requiredScreening && !isAlreadyInScreening)
            ? [
                {
                  label: "Send for Direct Screening",
                  action: "send_for_screening",
                  variant: "default" as const,
                  icon: Send,
                },
              ]
            : [];

          return (
            <CandidateCard
              key={`nominated-${candidateId}`}
              candidate={candidateWithProject}
              projectId={projectId}
              isRecruiter={isRecruiter}
              hideContactInfo={hideContactInfo}
              searchTerm={searchTerm}
              onView={() => onViewCandidate(candidateId)}
              onAction={(id, action) => {
                if (action === "assign") {
                  onAssignCandidate(id, `${candidate.firstName} ${candidate.lastName}`);
                }
                if (action === "send_for_screening") {
                  onSendForScreening?.(id, `${candidate.firstName} ${candidate.lastName}`);
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
          <PaginationControls
            page={nominatedPage}
            totalPages={nominatedTotalPages}
            total={totalNominated}
            pageSize={PAGE_SIZE}
            onPageChange={setNominatedPage}
          />
        )}
      </div>
    );
  };

  const renderEligibleColumn = () => {
    if (isLoadingEligible) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((index) => (
            <SkeletonCard key={`eligible-skeleton-${index}`} />
          ))}
        </div>
      );
    }

    if (filteredEligible.length === 0) {
      return <EmptyColumnState message="No eligible candidates" icon={ShieldCheck} />;
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

          const actions: any[] = [];

          const showVerifyButton = false; // assignmentInfo.isAssigned && assignmentInfo.isNominated;

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
              hideContactInfo={hideContactInfo}
              searchTerm={searchTerm}
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
              showContactButtons={true}
            />
          );
        })}

        {eligibleTotalPages > 1 && (
          <PaginationControls
            page={eligiblePage}
            totalPages={eligibleTotalPages}
            total={totalEligible}
            pageSize={PAGE_SIZE}
            onPageChange={setEligiblePage}
          />
        )}
      </div>
    );



  };

  const renderAllCandidatesColumn = () => {
    const isLoadingAll = consolidatedCandidatesQuery.isLoading;

    if (isLoadingAll) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((index) => (
            <SkeletonCard key={`all-skeleton-${index}`} />
          ))}
        </div>
      );
    }

    if (filteredAllCandidates.length === 0) {
      return <EmptyColumnState message="No candidates available" icon={Users2} />;
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
          const actions: any[] = [];

          const showVerifyButton = false;
          /*
            assignmentInfo.isAssigned &&
            assignmentInfo.isNominated &&
            !assignmentInfo.isVerificationInProgress;
          */

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
              hideContactInfo={hideContactInfo}
              searchTerm={searchTerm}
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
              showDocumentStatus={false}
              eligibilityData={eligibilityMap.get(assignmentInfo.candidateId)}
              showContactButtons={true}
            />
          );
        })}

        {allTotalPages > 1 && (
          <PaginationControls
            page={allPage}
            totalPages={allTotalPages}
            total={totalAll}
            pageSize={PAGE_SIZE}
            onPageChange={setAllPage}
          />
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

  // Column-specific gradient configs
  const columnGradients: Record<CandidateColumnType, { bg: string; border: string; countBg: string; countText: string }> = {
    nominated: { bg: "bg-gradient-to-br from-amber-50/80 to-orange-50/40", border: "border-amber-100/60", countBg: "bg-amber-100", countText: "text-amber-700" },
    eligible: { bg: "bg-gradient-to-br from-emerald-50/80 to-green-50/40", border: "border-emerald-100/60", countBg: "bg-emerald-100", countText: "text-emerald-700" },
    all: { bg: "bg-gradient-to-br from-sky-50/80 to-blue-50/40", border: "border-sky-100/60", countBg: "bg-sky-100", countText: "text-sky-700" },
  };

  return (
    <div className="space-y-5">
      {/* Search & Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder="Search by name, email, phone, qualification..."
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            className="pl-10 h-10 bg-white border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus-visible:ring-blue-500/20 focus-visible:border-blue-300 transition-colors"
            aria-label="Search all candidates"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <Select value={selectedRole} onValueChange={onRoleChange}>
            <SelectTrigger className="w-[200px] h-10 bg-white border-slate-200 rounded-lg text-sm">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {columns.map((column) => {
          const gradient = columnGradients[column.id];
          return (
            <Card
              key={column.id}
              className={`border ${gradient.border} shadow-sm hover:shadow-md transition-shadow duration-300 ${gradient.bg} backdrop-blur-sm rounded-2xl flex flex-col overflow-hidden`}
              aria-labelledby={`column-${column.id}-title`}
            >
              <CardHeader className="!px-4 !py-3 !pb-2.5 border-b border-slate-100/80">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${column.iconClasses} shadow-sm`}
                      aria-hidden="true"
                    >
                      <column.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle
                        id={`column-${column.id}-title`}
                        className="text-sm font-bold text-slate-800 truncate leading-tight"
                      >
                        {column.title}
                      </CardTitle>
                      <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
                        {column.subtitle}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold ${gradient.countText} ${gradient.countBg} px-2.5 py-1 rounded-lg flex-shrink-0 tabular-nums shadow-sm`}
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {column.count}
                  </span>
                </div>
              </CardHeader>
              <CardContent
                className={`flex-1 px-3 py-2 overflow-y-auto ${COLUMN_MAX_HEIGHT} space-y-3 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent`}
                role="list"
                aria-label={column.ariaLabel}
              >
                {column.content}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectCandidatesBoard;
