// ==================== MOCK INTERVIEW COORDINATION FEATURE TYPES ====================
// Central types for the entire mock-interview-coordination feature

// ==================== MOCK INTERVIEW TEMPLATE TYPES ====================

export interface MockInterviewChecklistTemplate {
  id: string;
  roleId: string;
  category: string;
  criterion: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  role?: {
    id: string;
    designation: string;
    slug: string;
  };
}

export interface CreateTemplateRequest {
  roleId: string;
  category: string;
  criterion: string;
  order?: number;
  isActive?: boolean;
}

export interface UpdateTemplateRequest {
  roleId?: string;
  category?: string;
  criterion?: string;
  order?: number;
  isActive?: boolean;
}

export interface QueryTemplatesRequest {
  roleId?: string;
  category?: string;
  isActive?: boolean;
}

// ==================== MOCK INTERVIEW TYPES ====================

export interface MockInterview {
  id: string;
  candidateProjectMapId: string;
  coordinatorId: string;
  scheduledTime?: string;
  duration: number;
  meetingLink?: string;
  mode: string;
  conductedAt?: string;
  overallRating?: number;
  overallScore?: number;
  decision?: string;
  remarks?: string;
  notes?: string;
  strengths?: string;
  areasOfImprovement?: string;
  createdAt: string;
  updatedAt: string;
  candidateProjectMap?: {
    id: string;
    candidate: {
      id: string;
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
    };
    project: {
      id: string;
      title: string;
    };
    roleNeeded: {
      id: string;
      designation: string;
    };
    recruiter?: {
      id: string;
      name: string;
      email: string;
    };
  };
  coordinator?: {
    id: string;
    name: string;
    email: string;
  };
  checklistItems?: MockInterviewChecklistItem[];
  trainingAssignment?: TrainingAssignment;
}

export interface MockInterviewChecklistItem {
  id: string;
  mockInterviewId: string;
  category: string;
  criterion: string;
  passed: boolean;
  rating?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMockInterviewRequest {
  candidateProjectMapId: string;
  coordinatorId: string;
  scheduledTime?: string;
  duration?: number;
  meetingLink?: string;
  mode?: string;
}

export interface UpdateMockInterviewRequest {
  candidateProjectMapId?: string;
  coordinatorId?: string;
  scheduledTime?: string;
  duration?: number;
  meetingLink?: string;
  mode?: string;
}

export interface ChecklistItemInput {
  category: string;
  criterion: string;
  passed: boolean;
  rating?: number;
  notes?: string;
}

export interface CompleteMockInterviewRequest {
  overallRating: number;
  decision: string;
  remarks?: string;
  strengths?: string;
  areasOfImprovement?: string;
  checklistItems: ChecklistItemInput[];
}

export interface QueryMockInterviewsRequest {
  candidateProjectMapId?: string;
  coordinatorId?: string;
  decision?: string;
  mode?: string;
  scheduledDate?: string;
  conductedDate?: string;
}

// ==================== TRAINING TYPES ====================

export interface TrainingAssignment {
  id: string;
  candidateProjectMapId: string;
  mockInterviewId?: string;
  assignedBy: string;
  trainingType: string;
  focusAreas: string[];
  priority: string;
  status: string;
  assignedAt: string;
  startedAt?: string;
  completedAt?: string;
  targetCompletionDate?: string;
  notes?: string;
  improvementNotes?: string;
  overallPerformance?: string;
  recommendations?: string;
  createdAt: string;
  updatedAt: string;
  candidateProjectMap?: {
    id: string;
    candidate: {
      id: string;
      firstName: string;
      lastName: string;
    };
    project: {
      id: string;
      title: string;
    };
    roleNeeded: {
      id: string;
      designation: string;
    };
  };
  assignedByUser?: {
    id: string;
    name: string;
    email: string;
  };
  mockInterview?: MockInterview;
  sessions?: TrainingSession[];
}

export interface TrainingSession {
  id: string;
  trainingAssignmentId: string;
  sessionDate: string;
  duration: number;
  sessionType: string;
  topicsCovered: string[];
  plannedActivities?: string;
  trainer?: string;
  attended: boolean;
  completedAt?: string;
  performanceRating?: number;
  feedback?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTrainingAssignmentRequest {
  candidateProjectMapId: string;
  mockInterviewId?: string;
  assignedBy: string;
  trainingType: string;
  focusAreas?: string[];
  priority?: string;
  targetCompletionDate?: string;
  notes?: string;
}

export interface UpdateTrainingAssignmentRequest {
  candidateProjectMapId?: string;
  mockInterviewId?: string;
  assignedBy?: string;
  trainingType?: string;
  focusAreas?: string[];
  priority?: string;
  targetCompletionDate?: string;
  notes?: string;
}

export interface CompleteTrainingRequest {
  improvementNotes?: string;
  overallPerformance?: string;
  recommendations?: string;
}

export interface CreateTrainingSessionRequest {
  trainingAssignmentId: string;
  sessionDate: string;
  duration?: number;
  sessionType: string;
  topicsCovered?: string[];
  plannedActivities?: string;
  trainer?: string;
  attended?: boolean;
  notes?: string;
}

export interface QueryTrainingAssignmentsRequest {
  candidateProjectMapId?: string;
  mockInterviewId?: string;
  assignedBy?: string;
  trainingType?: string;
  priority?: string;
  status?: string;
  assignedDate?: string;
}

// ==================== API RESPONSE TYPES ====================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// ==================== CONSTANTS ====================

export const MOCK_INTERVIEW_CATEGORY = {
  TECHNICAL_SKILLS: "technical_skills",
  COMMUNICATION: "communication",
  PROFESSIONALISM: "professionalism",
  ROLE_SPECIFIC: "role_specific",
} as const;

export const MOCK_INTERVIEW_DECISION = {
  APPROVED: "approved",
  NEEDS_TRAINING: "needs_training",
  REJECTED: "rejected",
} as const;

export const MOCK_INTERVIEW_MODE = {
  VIDEO: "video",
  PHONE: "phone",
  IN_PERSON: "in_person",
} as const;

export const TRAINING_STATUS = {
  ASSIGNED: "assigned",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const TRAINING_TYPE = {
  INTERVIEW_SKILLS: "interview_skills",
  TECHNICAL: "technical",
  COMMUNICATION: "communication",
  ROLE_SPECIFIC: "role_specific",
} as const;

export const TRAINING_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;

export const TRAINING_PERFORMANCE = {
  POOR: "poor",
  FAIR: "fair",
  GOOD: "good",
  EXCELLENT: "excellent",
} as const;

// ==================== TYPE GUARDS ====================

export function isMockInterviewCategory(
  value: string
): value is keyof typeof MOCK_INTERVIEW_CATEGORY {
  return Object.values(MOCK_INTERVIEW_CATEGORY).includes(value as any);
}

export function isMockInterviewDecision(
  value: string
): value is keyof typeof MOCK_INTERVIEW_DECISION {
  return Object.values(MOCK_INTERVIEW_DECISION).includes(value as any);
}

export function isTrainingStatus(
  value: string
): value is keyof typeof TRAINING_STATUS {
  return Object.values(TRAINING_STATUS).includes(value as any);
}
