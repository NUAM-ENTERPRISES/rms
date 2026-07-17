import { UserAccountStatus } from '@prisma/client';

export interface UserWithRoles {
  id: string;
  employeeCode?: string | null;
  email: string;
  name: string;
  phone?: string;
  dateOfBirth?: Date;
  accountStatus?: UserAccountStatus;
  accountStatusUpdatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  userRoles: Array<{
    role: {
      id: string;
      name: string;
      description?: string;
    };
  }>;
  userProfessionScopes?: Array<{
    id: string;
    professionTypeId: string;
    professionType: {
      id: string;
      name: string;
      label: string;
    };
  }>;
  documentsControlAccess?: {
    originalDocumentIntakeEnabled: boolean;
    courierManagementEnabled: boolean;
  };
  /** Current-month performance rating for Recruiter role users (list views). */
  performanceRating?: {
    score: number;
    rating: string;
  } | null;
}

export interface PaginatedUsers {
  users: UserWithRoles[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  /** Search-scoped status totals for filter tiles (ignores accountStatus/roles filters). */
  accountStatusCounts: UserAccountStatusCounts;
}

export interface UserAccountStatusCounts {
  all: number;
  active: number;
  inactive: number;
  blocked: number;
}

export interface UserAccountStatusHistoryItem {
  id: string;
  previousStatus: UserAccountStatus | null;
  newStatus: UserAccountStatus;
  remarks: string;
  createdAt: Date;
  changedBy: {
    id: string;
    name: string;
    email: string;
    employeeCode: string | null;
  } | null;
}

export interface PaginatedAccountStatusHistory {
  items: UserAccountStatusHistoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
