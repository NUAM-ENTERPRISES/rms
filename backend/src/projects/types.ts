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

/** Minimal project row for pickers / link dialogs (no roles, documents, etc.). */
export interface ProjectPickerItem {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  client: {
    id: string;
    name: string;
    type: string;
  } | null;
}

export interface PaginatedProjectPicker {
  projects: ProjectPickerItem[];
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
