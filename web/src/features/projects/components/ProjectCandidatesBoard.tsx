import { ReactNode, useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  UserPlus,
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
import { ROLE_NAMES } from "@/config/role-names";
import { cn } from "@/lib/utils";
import {
  shouldShowDirectScreeningSkipDocVerification,
  normalizeProjectStatusToken,
} from "../utils/direct-screening-doc-verification";
import CandidateCard, {
  CandidateRecord,
} from "@/features/projects/components/CandidateCard";
import {
  getCandidateAssignmentBlockReason,
  getCandidateStatusLabel,
  getCountryRestrictionBlockReasonForCandidate,
  getProcessingBlockReasonForCandidate,
  getProjectClosureMessage,
  getProjectDeadlineNoticeMessage,
  isCandidatePositiveForAssignment,
  isProjectOpenForPipelineActions,
} from "@/features/projects/utils/project-assignment";
import { isRecruiterLockedRnrCandidate } from "@/features/candidates/utils/recruiter-candidate-pipeline.util";

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

const normalizeRegisteredStatus = (statusRaw: string) => {
  const raw = (statusRaw || "").toString().trim().toLowerCase();
  return {
    raw,
    underscored: raw.replace(/[\s-]+/g, "_"),
    compact: raw.replace(/[\s_-]+/g, ""),
  };
};

const isRegisteredProcessingStatus = (statusRaw: string) => {
  const { raw, underscored } = normalizeRegisteredStatus(statusRaw);
  return (
    underscored === "processing" ||
    underscored.startsWith("processing_") ||
    raw.includes("processing")
  );
};

export type PipelineStatusCardAccent = {
  cardClass: string;
  isProcessing: boolean;
};

const isNominatedPipelineStatus = (statusRaw: string) => {
  const { raw, underscored, compact } = normalizeRegisteredStatus(statusRaw);
  return (
    underscored === "nominated" ||
    underscored.startsWith("nominated_") ||
    compact.startsWith("nominated") ||
    raw.includes("nominated")
  );
};

const isScreeningPassedPipelineStatus = (statusRaw: string) => {
  const { raw, underscored, compact } = normalizeRegisteredStatus(statusRaw);
  return (
    underscored === "screening_passed" ||
    compact === "screeningpassed" ||
    raw === "screening passed"
  );
};

export const SCREENING_PASSED_STATUS_BADGE = {
  label: "Screening Passed",
  badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
} as const;

/** Card background accents by pipeline / global status (Tailwind tokens only). */
export const getPipelineStatusCardClass = (
  statusRaw: string,
  options?: {
    columnId?: CandidateColumnType;
    isAssigned?: boolean;
    isNominated?: boolean;
  },
): PipelineStatusCardAccent => {
  const { raw, underscored, compact } = normalizeRegisteredStatus(statusRaw);
  const { columnId, isAssigned, isNominated } = options ?? {};

  const base =
    "pipeline-status-accent border border-l-0 shadow-sm backdrop-blur-sm transition-colors duration-200";

  // Eligible pool (column or unmatched pre-assignment)
  if (
    columnId === "eligible" &&
    (!raw || !isAssigned)
  ) {
    return {
      cardClass: cn(
        base,
        "bg-blue-50 bg-gradient-to-br from-blue-50 via-sky-50 to-sky-100 border-blue-200/80",
      ),
      isProcessing: false,
    };
  }

  if (!raw) {
    if (columnId === "nominated" && isAssigned && isNominated) {
      return {
        cardClass: cn(
          base,
          "bg-purple-100 border-purple-300/80",
        ),
        isProcessing: false,
      };
    }
    return { cardClass: "", isProcessing: false };
  }

  // Deployed
  if (
    underscored === "deployed" ||
    underscored === "hired" ||
    compact === "deployed" ||
    raw.includes("deployed")
  ) {
    return {
      cardClass: cn(
        base,
        "bg-green-50 bg-gradient-to-br from-green-50 via-emerald-50 to-emerald-100 border-green-200/80",
      ),
      isProcessing: false,
    };
  }

  // Processing
  if (isRegisteredProcessingStatus(statusRaw)) {
    return {
      cardClass: cn(
        base,
        "bg-orange-50 bg-gradient-to-br from-orange-50 via-amber-50 to-amber-100 border-orange-200/80",
      ),
      isProcessing: true,
    };
  }

  // Trainer / training
  if (
    underscored.startsWith("training_") ||
    underscored.startsWith("trainer_") ||
    raw.includes("training") ||
    raw.includes("trainer")
  ) {
    return {
      cardClass: cn(
        base,
        "bg-stone-100 bg-gradient-to-br from-stone-100 via-amber-50 to-stone-50 border-stone-300/80",
      ),
      isProcessing: false,
    };
  }

  // Screening passed — success state before generic screening bucket
  if (isScreeningPassedPipelineStatus(statusRaw)) {
    return {
      cardClass: cn(
        base,
        "bg-emerald-50 bg-gradient-to-br from-emerald-50 via-green-50 to-green-100 border-emerald-200/80",
      ),
      isProcessing: false,
    };
  }

  // Interview & screening
  if (
    underscored.startsWith("interview_") ||
    underscored.startsWith("screening_") ||
    raw.includes("interview") ||
    raw.includes("screening")
  ) {
    return {
      cardClass: cn(
        base,
        "bg-violet-50 bg-gradient-to-br from-violet-50 via-purple-50 to-purple-100 border-violet-200/80",
      ),
      isProcessing: false,
    };
  }

  // Documentation & verification
  if (
    underscored === "pending_documents" ||
    underscored === "documents_submitted" ||
    underscored === "verification_in_progress" ||
    underscored === "documents_verified" ||
    underscored.includes("document") ||
    underscored.includes("verification") ||
    compact === "pendingdocuments" ||
    compact === "verificationinprogress"
  ) {
    return {
      cardClass: cn(
        base,
        "bg-red-50 bg-gradient-to-br from-red-50 via-rose-50 to-rose-100 border-red-200/80",
      ),
      isProcessing: false,
    };
  }

  // Nominated / profile shortlisting
  if (isNominatedPipelineStatus(statusRaw) || isNominated) {
    return {
      cardClass: cn(
        base,
        "bg-purple-100 border-purple-300/80",
      ),
      isProcessing: false,
    };
  }

  // Eligible / positive CRM statuses
  if (
    underscored === "interested" ||
    underscored === "qualified" ||
    underscored === "future" ||
    underscored === "on_hold" ||
    raw.includes("eligible")
  ) {
    return {
      cardClass: cn(
        base,
        "bg-blue-50 bg-gradient-to-br from-blue-50 via-sky-50 to-sky-100 border-blue-200/80",
      ),
      isProcessing: false,
    };
  }

  return { cardClass: "", isProcessing: false };
};

const getCardStatusRaw = (
  candidate: CandidateRecord,
  assignmentInfo?: { projectStatus?: string; isAssigned?: boolean },
) =>
  (
    candidate.projectSubStatus?.label ||
    candidate.projectSubStatus?.name ||
    candidate.projectSubStatus?.statusName ||
    candidate.currentProjectStatus?.statusName ||
    candidate.projectStatus?.statusName ||
    assignmentInfo?.projectStatus ||
    getCandidateStatusLabel(candidate) ||
    ""
  ).toString();


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
  onBulkAssign?: (candidateIds: string[]) => void;
  onBulkSendForScreening?: (candidateIds: string[]) => void;
  nominatedPage?: number;
  nominatedTotal?: number;
  nominatedTotalPages?: number;
  onNominatedPageChange?: (page: number) => void;
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

  const candidateGlobalStatus = getCandidateStatusLabel(candidate);

  const projectStatusToShow = isAssigned
    ? subStatusLabel ||
      subStatusName ||
      currentProjectStatus ||
      mainStatus ||
      "assigned"
    : candidateGlobalStatus || "not_in_project";

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

  // Direct screening: skip doc verification only while screening is actively in progress.
  const normalizedSubStatus = normalizeProjectStatusToken(subStatusName);
  const normalizedMainStatus = normalizeProjectStatusToken(mainStatus);
  const normalizedCurrentStatus = normalizeProjectStatusToken(currentProjectStatus);

  const isSendedForDocumentVerification =
    (assignmentFromCandidate as { isSendedForDocumentVerification?: boolean })
      ?.isSendedForDocumentVerification ?? candidate.isSendedForDocumentVerification;

  const shouldSkipDocumentVerification = shouldShowDirectScreeningSkipDocVerification({
    isNominated,
    isSendedForDocumentVerification,
    subStatusName: normalizedSubStatus,
    mainStatusName: normalizedMainStatus,
    currentProjectStatusName: normalizedCurrentStatus,
  });

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
  onBulkAssign,
  onBulkSendForScreening,
  nominatedPage,
  nominatedTotal,
  nominatedTotalPages,
  onNominatedPageChange,
  requiredScreening = false,
}: ProjectCandidatesBoardProps) => {
  const { user } = useAppSelector((state) => state.auth);
  const isRecruiter = user?.roles?.includes("Recruiter") ?? false;
  const isAgentCoordinator =
    user?.roles?.includes(ROLE_NAMES.AGENT_COORDINATOR) ?? false;
  /** Same project-board actions as recruiter: assign, verify, upload docs, bulk assign */
  const canUseRecruiterPipelineActions = isRecruiter || isAgentCoordinator;
  const isInterviewCoordinator = user?.roles?.includes("Interview Coordinator") ?? false;
  const pipelineOpen = isProjectOpenForPipelineActions(project);
  const pipelineClosureMessage = getProjectClosureMessage(project);
  const deadlineNoticeMessage = getProjectDeadlineNoticeMessage(project);

  const [selectedEligibleIds, setSelectedEligibleIds] = useState<Set<string>>(new Set());
  const [selectedNominatedIds, setSelectedNominatedIds] = useState<Set<string>>(new Set());
  const [internalNominatedPage, setInternalNominatedPage] = useState(1);
  const [eligiblePage, setEligiblePage] = useState(1);
  const [allPage, setAllPage] = useState(1);
  const PAGE_SIZE = 10;

  const effectiveNominatedPage = nominatedPage ?? internalNominatedPage;
  const handleNominatedPageChange = onNominatedPageChange ?? setInternalNominatedPage;

  const handleDragStart = (e: React.DragEvent, candidateId: string) => {
    e.dataTransfer.setData("candidateId", candidateId);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent, columnId: CandidateColumnType) => {
    e.preventDefault();
    const candidateId = e.dataTransfer.getData("candidateId");
    
    // Only handle drop to "nominated" column
    if (
      columnId === "nominated" &&
      candidateId &&
      canUseRecruiterPipelineActions &&
      pipelineOpen
    ) {
      // Find candidate in eligible or all candidates
      const candidate = [...eligibleCandidates, ...allCandidates].find(
        (c) => (c.candidateId || c.id) === candidateId
      );
      
      if (candidate) {
        onAssignCandidate(candidateId, `${candidate.firstName} ${candidate.lastName}`);
      }
    }
  };

  const isManager =
    user?.roles?.some((role) =>
      ["CEO", "Director", "Manager", "Recruiter Manager", "Team Head", "Team Lead"].includes(role)
    ) ?? false;

  const { data: eligibleResponse, isLoading: isLoadingEligible } =
    useGetEligibleCandidatesQuery({
      projectId,
      search: searchTerm || undefined,
      roleCatalogId: selectedRole !== "all" ? selectedRole : undefined,
      page: eligiblePage,
      limit: PAGE_SIZE,
    }, {
      skip: !pipelineOpen,
      refetchOnFocus: false,
      refetchOnMountOrArgChange: false,
    });

  const consolidatedCandidatesQuery = useGetConsolidatedCandidatesQuery({
    projectId,
    search: searchTerm || undefined,
    roleCatalogId: selectedRole !== "all" ? selectedRole : undefined,
    page: allPage,
    limit: PAGE_SIZE,
  }, { 
      refetchOnFocus: false,
      refetchOnMountOrArgChange: false
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

  const eligiblePagination =
    (eligibleResponse?.data as any)?.pagination ||
    (eligibleResponse?.data as any)?.data?.pagination;

  const allCandidates: CandidateRecord[] = (
    consolidatedCandidatesQuery.data?.data?.candidates || []
  ) as CandidateRecord[];

  const allPagination = consolidatedCandidatesQuery.data?.data?.pagination;

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
      refetchOnFocus: false,
      refetchOnMountOrArgChange: false
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

  const projectCountryName = project?.country?.name ?? project?.countryCode ?? undefined;

  // Manager assignments removed — rely on candidate.project and other status fields instead
  const managerAssignments: ProjectAssignment[] = [];
  const assignedToProjectIds = useMemo(() => new Set<string>(), []);

  const sanitizedNominated = useMemo(
    () =>
      nominatedCandidates.map((candidate: CandidateRecord) =>
        sanitizeCandidate(candidate, hideContactInfo)
      ),
    [nominatedCandidates, hideContactInfo]
  );

  // Reset pagination when search term or role filter changes
  useEffect(() => {
    setInternalNominatedPage(1);
    setEligiblePage(1);
    setAllPage(1);
    if (onNominatedPageChange) {
      onNominatedPageChange(1);
    }
  }, [searchTerm, selectedRole, onNominatedPageChange]);


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

  const eligibleTotal = eligiblePagination?.total ?? filteredEligible.length;
  const eligibleTotalPages = Math.max(
    1,
    eligiblePagination?.totalPages ?? Math.ceil(eligibleTotal / PAGE_SIZE)
  );
  const eligiblePageItems = eligiblePagination
    ? filteredEligible
    : filteredEligible.slice((eligiblePage - 1) * PAGE_SIZE, eligiblePage * PAGE_SIZE);

  const allTotal = allPagination?.total ?? filteredAllCandidates.length;
  const allTotalPages = Math.max(
    1,
    allPagination?.totalPages ?? Math.ceil(allTotal / PAGE_SIZE)
  );
  const allPageItems = allPagination
    ? filteredAllCandidates
    : filteredAllCandidates.slice((allPage - 1) * PAGE_SIZE, allPage * PAGE_SIZE);

  // Compute bulk-selectable eligible candidates (those not already assigned and eligible)
  // Used for the select-all toolbar in the column header
  const selectableEligibleCandidates = useMemo(() => {
    if (!canUseRecruiterPipelineActions) return [];
    return filteredEligible
      .map((candidate) => {
        const assignmentInfo = buildAssignmentInfo(candidate, projectId, managerAssignments, assignedToProjectIds);
        const eligibilityData = eligibilityMap.get(assignmentInfo.candidateId);
        const countryRestrictionBlockReason = getCountryRestrictionBlockReasonForCandidate({
          eligibilityData,
          projectCountryName,
        });
        const hasProjectCountryRestriction = Boolean(countryRestrictionBlockReason);
        const anyRoleEligible = eligibilityData?.roleEligibility?.some((r: any) => r.isEligible);
        const statusLabel = getCandidateStatusLabel(candidate);
        const isPositiveStatus = isCandidatePositiveForAssignment(statusLabel);
        const processingBlockReason = getProcessingBlockReasonForCandidate({
          eligibilityData,
          projectId,
          projectTitle: project?.title,
          context: "assign",
          isAssignedOnProject: assignmentInfo.isAssigned,
        });
        const isNotEligible =
          !isPositiveStatus ||
          eligibilityData?.isEligible === false ||
          !anyRoleEligible ||
          Boolean(processingBlockReason) ||
          hasProjectCountryRestriction;
        return { candidateId: assignmentInfo.candidateId, canSelect: !assignmentInfo.isAssigned && !isNotEligible };
      })
      .filter((c) => c.canSelect);
  }, [filteredEligible, projectId, managerAssignments, assignedToProjectIds, eligibilityMap, canUseRecruiterPipelineActions, project?.title, projectCountryName]);

  const allSelectableSelected = selectableEligibleCandidates.length > 0 &&
    selectableEligibleCandidates.every((c) => selectedEligibleIds.has(c.candidateId));

  const toggleSelectAllEligible = () => {
    if (allSelectableSelected) {
      const newSelected = new Set(selectedEligibleIds);
      selectableEligibleCandidates.forEach((c) => newSelected.delete(c.candidateId));
      setSelectedEligibleIds(newSelected);
    } else {
      const newSelected = new Set(selectedEligibleIds);
      selectableEligibleCandidates.forEach((c) => newSelected.add(c.candidateId));
      setSelectedEligibleIds(newSelected);
    }
  };

  const toggleSelectEligible = (id: string) => {
    const newSelected = new Set(selectedEligibleIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedEligibleIds(newSelected);
  };

  const toggleSelectNominated = (id: string) => {
    const newSelected = new Set(selectedNominatedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedNominatedIds(newSelected);
  };

  const selectableNominatedCandidates = useMemo(() => {
    if (!isInterviewCoordinator) return [];
    return sanitizedNominated.filter((candidate) => {
      const candidateId = candidate.candidateId || candidate.id || "";
      const eligibilityData = eligibilityMap.get(candidateId);
      if (eligibilityData?.pipelineBlockedOnThisProject) {
        return false;
      }

      const subStatusName =
        candidate.projectSubStatus?.name ||
        candidate.projectSubStatus?.statusName ||
        "";

      const mainStatusName =
        candidate.projectMainStatus?.name ||
        (candidate as any).mainStatus?.name ||
        "";

      // Only allow selection if it's strictly in nominated stage
      return (
        mainStatusName === "nominated" || 
        subStatusName.startsWith("nominated_initial")
      );
    });
  }, [sanitizedNominated, isInterviewCoordinator, eligibilityMap]);

  const toggleSelectAllNominated = () => {
    if (selectedNominatedIds.size === selectableNominatedCandidates.length) {
      setSelectedNominatedIds(new Set());
    } else {
      setSelectedNominatedIds(new Set(selectableNominatedCandidates.map(c => c.candidateId || c.id || "")));
    }
  };

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

    const totalNominated = nominatedTotal ?? sanitizedNominated.length;
    const effectiveNominatedTotalPages =
      nominatedTotalPages ?? Math.max(1, Math.ceil(totalNominated / PAGE_SIZE));
    const nominatedSlice = sanitizedNominated.slice(
      (effectiveNominatedPage - 1) * PAGE_SIZE,
      effectiveNominatedPage * PAGE_SIZE
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
            project: {
              ...(candidate.project || project),
              introductionVideoRequired:
                project?.introductionVideoRequired ??
                candidate.project?.introductionVideoRequired ??
                false,
              documentRequirements:
                candidate.project?.documentRequirements ??
                project?.documentRequirements ??
                [],
            },
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

          const nominatedEligibilityData = eligibilityMap.get(candidateId);
          const countryRestrictionBlockReason = getCountryRestrictionBlockReasonForCandidate({
            eligibilityData: nominatedEligibilityData,
            projectCountryName,
          });
          const hasProjectCountryRestriction = Boolean(countryRestrictionBlockReason);
          const pipelineBlockedByProcessing = Boolean(
            nominatedEligibilityData?.pipelineBlockedOnThisProject,
          );
          const processingBlockReason = getProcessingBlockReasonForCandidate({
            eligibilityData: nominatedEligibilityData,
            projectId,
            projectTitle: project?.title,
            context: "pipeline",
            isAssignedOnProject: true,
          });

          const showVerifyButton =
            pipelineOpen &&
            !pipelineBlockedByProcessing &&
            subStatusName === "nominated_initial";
          const showInterviewButton =
            pipelineOpen &&
            !pipelineBlockedByProcessing &&
            subStatusName === "documents_verified";

          const actions =
            pipelineOpen &&
            !pipelineBlockedByProcessing &&
            requiredScreening &&
            !isAlreadyInScreening &&
            isInterviewCoordinator
              ? [
                  {
                    label: "Send for Direct Screening",
                    action: "send_for_screening",
                    variant: "default" as const,
                    icon: Send,
                  },
                ]
              : [];

          const isSelectable = selectableNominatedCandidates.some(c => (c.candidateId || c.id) === candidateId);
          const isSelected = selectedNominatedIds.has(candidateId);
          const cardStatusRaw = getCardStatusRaw(candidate, assignmentInfo);
          const statusAccent = getPipelineStatusCardClass(cardStatusRaw, {
            columnId: "nominated",
            isAssigned: assignmentInfo.isAssigned,
            isNominated: assignmentInfo.isNominated,
          });

          return (
            <CandidateCard
              key={`nominated-${candidateId}`}
              processingBlockReason={processingBlockReason}
              pipelineBlockedByProcessing={pipelineBlockedByProcessing}
              assignmentBlockReason={processingBlockReason?.fullMessage}
              eligibilityData={nominatedEligibilityData}
              hasProjectCountryRestriction={hasProjectCountryRestriction}
              countryRestrictionBlockReason={countryRestrictionBlockReason}
              showProcessingGlance={statusAccent.isProcessing}
              className={cn(
                isSelected ? "ring-1 ring-purple-400/60" : "",
                !hasProjectCountryRestriction && statusAccent.cardClass,
              )}
              selected={isSelectable ? isSelected : undefined}
              onSelect={isSelectable ? () => toggleSelectNominated(candidateId) : undefined}
              candidate={candidateWithProject}
              projectId={projectId}
              isRecruiter={canUseRecruiterPipelineActions}
              hideContactInfo={hideContactInfo}
              showAgentName={isAgentCoordinator}
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
              showAssignButton={pipelineOpen && !assignmentInfo.isAssigned}
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
              isAlreadyInProject={assignmentInfo.isAssigned}
            />
          );
        })}

        {effectiveNominatedTotalPages > 1 && (
          <PaginationControls
            page={effectiveNominatedPage}
            totalPages={effectiveNominatedTotalPages}
            total={totalNominated}
            pageSize={PAGE_SIZE}
            onPageChange={handleNominatedPageChange}
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

    const totalEligible = eligibleTotal;
    const eligibleItems = eligiblePageItems.map((candidate) => {
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
            pipelineOpen &&
            (candidate.projectSubStatus?.name === "documents_verified" ||
              candidate.projectSubStatus?.statusName === "documents_verified");

          const eligibilityData = eligibilityMap.get(assignmentInfo.candidateId);
          const countryRestrictionBlockReason = getCountryRestrictionBlockReasonForCandidate({
            eligibilityData,
            projectCountryName,
          });
          const hasProjectCountryRestriction = Boolean(countryRestrictionBlockReason);
          const anyRoleEligible = eligibilityData?.roleEligibility?.some((r: any) => r.isEligible);
          const statusLabel = getCandidateStatusLabel(candidate);
          const isPositiveForAssignment = isCandidatePositiveForAssignment(statusLabel);
          const isRecruiterRnrLocked = isRecruiterLockedRnrCandidate(candidate);
          const processingBlockReason = getProcessingBlockReasonForCandidate({
            eligibilityData,
            projectId,
            projectTitle: project?.title,
            context: "assign",
            isAssignedOnProject: assignmentInfo.isAssigned,
          });
          const pipelineBlockedByProcessing = Boolean(
            eligibilityData?.pipelineBlockedOnThisProject,
          );
          const isNotEligible =
            !isPositiveForAssignment ||
            eligibilityData?.isEligible === false ||
            !anyRoleEligible ||
            isRecruiterRnrLocked ||
            Boolean(processingBlockReason) ||
            hasProjectCountryRestriction;
          const assignmentBlockReason =
            countryRestrictionBlockReason?.fullMessage ??
            processingBlockReason?.fullMessage ??
            getCandidateAssignmentBlockReason(
              statusLabel,
              { isCREReassigned: candidate.isCREReassigned },
            );

          // Only show checkbox if candidate can actually be assigned (not already assigned AND eligible)
          const canSelect =
            pipelineOpen && !assignmentInfo.isAssigned && !isNotEligible;

          const isSelected = selectedEligibleIds.has(assignmentInfo.candidateId);
          const cardStatusRaw = getCardStatusRaw(candidate, assignmentInfo);
          const statusAccent = getPipelineStatusCardClass(cardStatusRaw, {
            columnId: "eligible",
            isAssigned: assignmentInfo.isAssigned,
            isNominated: assignmentInfo.isNominated,
          });

          return (
              <CandidateCard
                key={`eligible-${assignmentInfo.candidateId}`}
                assignmentBlockReason={assignmentBlockReason}
                processingBlockReason={processingBlockReason}
                pipelineBlockedByProcessing={pipelineBlockedByProcessing}
                hasProjectCountryRestriction={hasProjectCountryRestriction}
                countryRestrictionBlockReason={countryRestrictionBlockReason}
                showProcessingGlance={statusAccent.isProcessing}
                className={cn(
                  isSelected ? "ring-1 ring-blue-400/60" : "",
                  !hasProjectCountryRestriction && statusAccent.cardClass,
                )}
                selected={canSelect ? isSelected : undefined}
                onSelect={canSelect ? () => toggleSelectEligible(assignmentInfo.candidateId) : undefined}
                candidate={candidateWithProject}
                projectId={projectId}
                isRecruiter={canUseRecruiterPipelineActions}
                hideContactInfo={hideContactInfo}
                showAgentName={isAgentCoordinator}
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
                showAssignButton={pipelineOpen && !assignmentInfo.isAssigned}
                onAssignToProject={(id) => onAssignCandidate(id, `${candidate.firstName} ${candidate.lastName}`)}
                onDragStart={
                  pipelineOpen && !assignmentInfo.isAssigned && !isNotEligible
                    ? handleDragStart
                    : undefined
                }
                showSkipDocumentVerification={shouldSkipDocVerification}
                skipDocumentVerificationMessage={
                  "This candidate should skip document verification because of direct screening. Once screening is completed you should do document verification."
                }
                showInterviewButton={showInterviewButton && !pipelineBlockedByProcessing}
                onSendForInterview={(id) => onSendForInterview?.(id, `${candidate.firstName} ${candidate.lastName}`)}
                isAlreadyInProject={assignmentInfo.isAssigned}
                showDocumentStatus={false}
                eligibilityData={eligibilityData}
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

    const allItems = allPageItems.map((candidate) => {
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
            pipelineOpen &&
            (candidate.projectSubStatus?.name === "documents_verified" ||
              candidate.projectSubStatus?.statusName === "documents_verified");

          const eligibilityData = eligibilityMap.get(assignmentInfo.candidateId);
          const countryRestrictionBlockReason = getCountryRestrictionBlockReasonForCandidate({
            eligibilityData,
            projectCountryName,
          });
          const hasProjectCountryRestriction = Boolean(countryRestrictionBlockReason);
          const anyRoleEligible = eligibilityData?.roleEligibility?.some((r: any) => r.isEligible);
          const statusLabel = getCandidateStatusLabel(candidate);
          const isPositiveForAssignment = isCandidatePositiveForAssignment(statusLabel);
          const isRecruiterRnrLocked = isRecruiterLockedRnrCandidate(candidate);
          const processingBlockReason = getProcessingBlockReasonForCandidate({
            eligibilityData,
            projectId,
            projectTitle: project?.title,
            context: "assign",
            isAssignedOnProject: assignmentInfo.isAssigned,
          });
          const pipelineBlockedByProcessing = Boolean(
            eligibilityData?.pipelineBlockedOnThisProject,
          );
          const isNotEligible =
            !isPositiveForAssignment ||
            eligibilityData?.isEligible === false ||
            !anyRoleEligible ||
            isRecruiterRnrLocked ||
            Boolean(processingBlockReason) ||
            hasProjectCountryRestriction;
          const assignmentBlockReason =
            countryRestrictionBlockReason?.fullMessage ??
            processingBlockReason?.fullMessage ??
            getCandidateAssignmentBlockReason(
              statusLabel,
              { isCREReassigned: candidate.isCREReassigned },
            );
          const cardStatusRaw = getCardStatusRaw(candidate, assignmentInfo);
          const statusAccent = getPipelineStatusCardClass(cardStatusRaw, {
            columnId: "all",
            isAssigned: assignmentInfo.isAssigned,
            isNominated: assignmentInfo.isNominated,
          });

          return (
            <CandidateCard
              key={`all-${assignmentInfo.candidateId}`}
              assignmentBlockReason={assignmentBlockReason}
              processingBlockReason={processingBlockReason}
              pipelineBlockedByProcessing={pipelineBlockedByProcessing}
              hasProjectCountryRestriction={hasProjectCountryRestriction}
              countryRestrictionBlockReason={countryRestrictionBlockReason}
              showProcessingGlance={statusAccent.isProcessing}
              className={!hasProjectCountryRestriction ? statusAccent.cardClass : undefined}
              candidate={candidateWithProject}
              projectId={projectId}
              isRecruiter={canUseRecruiterPipelineActions}
              hideContactInfo={hideContactInfo}
              showAgentName={isAgentCoordinator}
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
              showAssignButton={pipelineOpen && !assignmentInfo.isAssigned}
              onAssignToProject={(id) => onAssignCandidate(id, `${candidate.firstName} ${candidate.lastName}`)}
              onDragStart={
                pipelineOpen && !assignmentInfo.isAssigned && !isNotEligible
                  ? handleDragStart
                  : undefined
              }
              showSkipDocumentVerification={shouldSkipDocVerification}
              skipDocumentVerificationMessage={
                "This candidate should skip document verification because of direct screening. Once screening is completed you should do document verification."
              }
              showInterviewButton={showInterviewButton && !pipelineBlockedByProcessing}
              onSendForInterview={(id) => onSendForInterview?.(id, `${candidate.firstName} ${candidate.lastName}`)}
              isAlreadyInProject={assignmentInfo.isAssigned}
              showDocumentStatus={false}
              eligibilityData={eligibilityData}
              showContactButtons={true}
            />
          );
        })}

        {allTotalPages > 1 && (
          <PaginationControls
            page={allPage}
            totalPages={allTotalPages}
            total={allTotal}
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
    headerExtra?: ReactNode;
  }> = [
    {
      id: "nominated",
      title: "Profile Shortlisting",
      subtitle: "Currently cv Shortlisted to this project",
      count: nominatedTotal ?? sanitizedNominated.length,
      content: renderNominatedColumn(),
      ariaLabel: "Nominated candidates column",
      icon: Trophy,
      iconClasses: "bg-amber-100 text-amber-600",
      headerExtra: isInterviewCoordinator && selectableNominatedCandidates.length > 0 ? (
        <div className="flex items-center justify-between px-4 py-1.5 border-t border-amber-100/60 bg-amber-50/40">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <Checkbox
              checked={selectedNominatedIds.size === selectableNominatedCandidates.length && selectableNominatedCandidates.length > 0}
              onCheckedChange={toggleSelectAllNominated}
              className="h-3.5 w-3.5 rounded-[3px] data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
            />
            <span className="text-[11px] font-medium text-slate-500">
              {selectedNominatedIds.size > 0
                ? `${selectedNominatedIds.size} selected`
                : `Select all`}
            </span>
          </label>
          {pipelineOpen && selectedNominatedIds.size > 0 && requiredScreening && isInterviewCoordinator && (
            <Button
              size="sm"
              className="h-6 gap-1 px-2 text-[11px] font-semibold rounded-md bg-purple-600 text-white shadow-sm hover:bg-purple-700 transition-colors"
              onClick={() => onBulkSendForScreening?.(Array.from(selectedNominatedIds))}
            >
              <Send className="h-3 w-3" />
              Bulk Screening ({selectedNominatedIds.size})
            </Button>
          )}
        </div>
      ) : null,
    },
    {
      id: "eligible",
      title: "Eligible",
      subtitle: "Matches project requirements",
      count: eligibleTotal,
      content: renderEligibleColumn(),
      ariaLabel: "Eligible candidates column",
      icon: ShieldCheck,
      iconClasses: "bg-blue-100 text-blue-600",
      headerExtra: selectableEligibleCandidates.length > 0 ? (
        <div className="flex items-center justify-between px-4 py-1.5 border-t border-blue-100/60 bg-blue-50/40">
          <label
            htmlFor="select-all-eligible"
            className="flex items-center gap-1.5 cursor-pointer select-none"
          >
            <Checkbox
              id="select-all-eligible"
              checked={allSelectableSelected}
              onCheckedChange={toggleSelectAllEligible}
              className="h-3.5 w-3.5 rounded-[3px] data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
            <span className="text-[11px] font-medium text-slate-500">
              {selectedEligibleIds.size > 0
                ? `${selectedEligibleIds.size} selected`
                : `Select all`}
            </span>
          </label>
          {pipelineOpen && selectedEligibleIds.size > 0 && (
            <Button
              size="sm"
              className="h-6 gap-1 px-2 text-[11px] font-semibold rounded-md bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-colors"
              onClick={() => onBulkAssign?.(Array.from(selectedEligibleIds))}
            >
              <UserPlus className="h-3 w-3" />
              Assign ({selectedEligibleIds.size})
            </Button>
          )}
        </div>
      ) : null,
    },
    {
      id: "all",
      title: canUseRecruiterPipelineActions && !isManager ? "My Candidates" : "All Candidates",
      subtitle:
        canUseRecruiterPipelineActions && !isManager
          ? "Candidates assigned to you"
          : "Entire candidate pool",
      count: allTotal,
      content: renderAllCandidatesColumn(),
      ariaLabel:
        canUseRecruiterPipelineActions && !isManager
          ? "My candidates column"
          : "All candidates column",
      icon: Users2,
      iconClasses: "bg-sky-100 text-sky-600",
    },
  ];

  // Column-specific gradient configs
  const columnGradients: Record<CandidateColumnType, { bg: string; border: string; countBg: string; countText: string }> = {
    nominated: { bg: "bg-gradient-to-br from-amber-50/80 to-orange-50/40", border: "border-amber-100/60", countBg: "bg-amber-100", countText: "text-amber-700" },
    eligible: { bg: "bg-gradient-to-br from-blue-50/80 to-sky-50/40", border: "border-blue-100/60", countBg: "bg-blue-100", countText: "text-blue-700" },
    all: { bg: "bg-gradient-to-br from-sky-50/80 to-blue-50/40", border: "border-sky-100/60", countBg: "bg-sky-100", countText: "text-sky-700" },
  };

  return (
    <div className="space-y-5">
      {deadlineNoticeMessage ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="status"
        >
          {deadlineNoticeMessage}
        </div>
      ) : null}
      {!pipelineOpen && pipelineClosureMessage ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          {pipelineClosureMessage}
        </div>
      ) : null}
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
              onDragOver={column.id === "nominated" ? handleDragOver : undefined}
              onDrop={column.id === "nominated" ? (e) => handleDrop(e, column.id) : undefined}
            >
              <CardHeader className="!px-4 !py-3 !pb-2.5 border-b border-slate-100/80">
                <div className="flex items-start gap-2.5">
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${column.iconClasses} shadow-sm`}
                    aria-hidden="true"
                  >
                    <column.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle
                        id={`column-${column.id}-title`}
                        className="text-sm font-bold text-slate-800 truncate leading-tight min-w-0 flex-1"
                      >
                        {column.title}
                      </CardTitle>
                      <span
                        className={`text-xs font-bold ${gradient.countText} ${gradient.countBg} px-2.5 py-1 rounded-lg flex-shrink-0 tabular-nums shadow-sm`}
                        aria-live="polite"
                        aria-atomic="true"
                      >
                        {column.count}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug mt-0.5 line-clamp-2">
                      {column.subtitle}
                    </p>
                  </div>
                </div>
              </CardHeader>
              {column.headerExtra}
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
