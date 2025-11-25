import { ReactNode, useMemo } from "react";
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
  UserPlus,
  Trophy,
  ShieldCheck,
  Users2,
} from "lucide-react";
import {
  useGetEligibleCandidatesQuery,
  useGetProjectCandidatesByRoleQuery,
} from "@/features/projects";
import {
  useGetCandidatesQuery,
  useGetRecruiterMyCandidatesQuery,
} from "@/features/candidates";
import { useAppSelector } from "@/app/hooks";
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
    Boolean(assignmentFromCandidate || assignmentFromManager) ||
    assignedIds.has(candidateId);

  const subStatusLabel =
    assignmentFromCandidate?.subStatus?.label ||
    assignmentFromManager?.subStatus?.label;
  const subStatusName =
    assignmentFromCandidate?.subStatus?.name ||
    assignmentFromManager?.subStatus?.name;
  const currentProjectStatus =
    assignmentFromCandidate?.currentProjectStatus?.statusName ||
    assignmentFromManager?.currentProjectStatus?.statusName;
  const mainStatus =
    assignmentFromCandidate?.mainStatus?.name ||
    assignmentFromManager?.mainStatus?.name;

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

  return {
    candidateId,
    isAssigned,
    projectStatus: projectStatusToShow,
    isNominated,
    isVerificationInProgress,
  };
};

const ProjectCandidatesBoard = ({
  projectId,
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
  hideContactInfo = false,
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

  const sanitizedNominated = useMemo(
    () =>
      nominatedCandidates.map((candidate: CandidateRecord) =>
        sanitizeCandidate(candidate, hideContactInfo)
      ),
    [nominatedCandidates, hideContactInfo]
  );

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

    return sanitizedNominated.map((candidate) => {
      const candidateId = candidate.candidateId || candidate.id;
      if (!candidateId) return null;

      const subStatusName =
        candidate.projectSubStatus?.name ||
        candidate.projectSubStatus?.statusName ||
        "";
      const isVerificationInProgress =
        subStatusName === "verification_in_progress_document";
      const showVerifyButton = subStatusName === "nominated_initial";
      const hasProject = Boolean(candidate.project);

      const actions =
        !hasProject && !isVerificationInProgress
          ? [
              {
                label: "Assign to Project",
                action: "assign",
                variant: "default" as const,
                icon: UserPlus,
              },
            ]
          : [];

      return (
        <CandidateCard
          key={`nominated-${candidateId}`}
          candidate={candidate}
          onView={() => onViewCandidate(candidateId)}
          onAction={(id, action) => {
            if (action === "assign") {
              onAssignCandidate(
                id,
                `${candidate.firstName} ${candidate.lastName}`
              );
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
          showVerifyButton={showVerifyButton}
          onVerify={() =>
            onVerifyCandidate(
              candidateId,
              `${candidate.firstName} ${candidate.lastName}`
            )
          }
          isAlreadyInProject={hasProject}
        />
      );
    });
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

    return filteredEligible.map((candidate) => {
      const assignmentInfo = buildAssignmentInfo(
        candidate,
        projectId,
        managerAssignments,
        assignedToProjectIds
      );

      const sanitized = sanitizeCandidate(candidate, hideContactInfo);

      const actions = !assignmentInfo.isAssigned
        ? [
            {
              label: "Assign to Project",
              action: "assign",
              variant: "default" as const,
              icon: UserPlus,
            },
          ]
        : [];

      const showVerifyButton =
        !assignmentInfo.isAssigned || assignmentInfo.isNominated;

      return (
        <CandidateCard
          key={`eligible-${assignmentInfo.candidateId}`}
          candidate={sanitized}
          onView={() => onViewCandidate(assignmentInfo.candidateId)}
          onAction={(id, action) => {
            if (action === "assign") {
              onAssignCandidate(
                id,
                `${candidate.firstName} ${candidate.lastName}`
              );
            }
          }}
          actions={actions}
          projectStatus={assignmentInfo.projectStatus}
          showMatchScore
          matchScore={candidate.matchScore}
          showVerifyButton={showVerifyButton}
          onVerify={() =>
            onVerifyCandidate(
              assignmentInfo.candidateId,
              `${candidate.firstName} ${candidate.lastName}`
            )
          }
          isAlreadyInProject={assignmentInfo.isAssigned}
        />
      );
    });
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

    return filteredAllCandidates.map((candidate) => {
      const assignmentInfo = buildAssignmentInfo(
        candidate,
        projectId,
        managerAssignments,
        assignedToProjectIds
      );

      const sanitized = sanitizeCandidate(candidate, hideContactInfo);
      const actions = !assignmentInfo.isAssigned
        ? [
            {
              label: "Assign to Project",
              action: "assign",
              variant: "default" as const,
              icon: UserPlus,
            },
          ]
        : [];

      const showVerifyButton =
        !assignmentInfo.isAssigned ||
        (assignmentInfo.isNominated &&
          !assignmentInfo.isVerificationInProgress);

      return (
        <CandidateCard
          key={`all-${assignmentInfo.candidateId}`}
          candidate={sanitized}
          onView={() => onViewCandidate(assignmentInfo.candidateId)}
          onAction={(id, action) => {
            if (action === "assign") {
              onAssignCandidate(
                id,
                `${candidate.firstName} ${candidate.lastName}`
              );
            }
          }}
          actions={actions}
          projectStatus={assignmentInfo.projectStatus}
          showVerifyButton={showVerifyButton}
          onVerify={() =>
            onVerifyCandidate(
              assignmentInfo.candidateId,
              `${candidate.firstName} ${candidate.lastName}`
            )
          }
          isAlreadyInProject={assignmentInfo.isAssigned}
        />
      );
    });
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
