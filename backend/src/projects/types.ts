import {
  Project,
  RoleNeeded,
  CandidateProjects,
  DocumentRequirement,
  Client,
  User,
  Team,
} from '@prisma/client';

export interface ProjectWithRelations extends Project {
  client: Client | null;
  creator: User;
  team: Team | null;
  country: {
    code: string;
    name: string;
    region: string;
    callingCode: string | null;
    currency?: string;
    timezone: string | null;
    isActive: boolean;
  } | null;
  documentRequirements: DocumentRequirement[];
  rolesNeeded: (RoleNeeded & {
    roleCatalog?: {
      id: string;
      name: string;
      label: string;
      shortName?: string | null;
      isActive?: boolean;
      roleDepartment?: { id: string; name: string; shortName?: string | null } | null;
    } | null;
    educationRequirementsList?: any[];
  })[];
  candidateProjects?: (CandidateProjects & {
    candidate: {
      id: string;
      firstName: string;
      lastName: string;
      countryCode: string;
      mobileNumber: string;
      email: string | null;
      currentStatus: {
        statusName: string;
      } | null;
    };
  })[];
}

export interface PaginatedProjects {
  projects: ProjectWithRelations[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  cancelledProjects: number;
  projectsByStatus: {
    active: number;
    completed: number;
    cancelled: number;
  };
  projectsByClient: {
    [clientId: string]: {
      count: number;
      name: string;
    };
  };
  upcomingDeadlines: ProjectWithRelations[];
}

export interface RecruiterAnalytics {
  urgentProject: {
    id: string;
    title: string;
    priority: string;
    deadline: Date | null;
    clientName: string | null;
    daysUntilDeadline: number | null;
  } | null;
  overdueProjects: {
    id: string;
    title: string;
    clientName: string | null;
    overdueDays: number | null;
  }[];
  untouchedCandidatesCount: number;
  untouchedCandidates: {
    id: string;
    name: string;
    countryCode: string | null;
    currentRole: string | null;
    assignedProjectId: string | null;
    assignedProjectTitle: string | null;
  }[];
  hiredOrSelectedCount: number;
  activeCandidateCount: number;
  upcomingInterviewsCount: number;
  assignedProjectCount: number;
}
