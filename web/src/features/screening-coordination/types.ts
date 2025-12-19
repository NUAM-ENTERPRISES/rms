// ==================== SCREENING COORDINATION FEATURE TYPES ====================
// Central types for the entire screening-coordination feature

import { ReactNode } from "react";

// ==================== MOCK INTERVIEW TEMPLATE TYPES ====================

export interface ScreeningTemplateItem {
  id: string;
  templateId: string;
  category: string;
  criterion: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScreeningTemplate {
  id: string;
  roleId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  role?: {
    id: string;
    name: string;
    slug: string;
  };
  items?: ScreeningTemplateItem[];
  _count?: {
    items: number;
    screenings: number;
  };
}

export interface CreateTemplateItemRequest {
  category: string;
  criterion: string;
  order?: number;
}

export interface UpdateTemplateItemRequest {
  category?: string;
  criterion?: string;
  order?: number;
}

export interface CreateTemplateRequest {
  roleId: string;
  name: string;
  description?: string;
  isActive?: boolean;
  items?: CreateTemplateItemRequest[];
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface QueryTemplatesRequest {
  roleId?: string;
  isActive?: boolean;
}

// ==================== MOCK INTERVIEW TYPES ====================

export interface Screening {
  id: string;
  candidateProjectMapId: string;
  coordinatorId: string;
  scheduledTime?: string;
  duration: number;
  meetingLink?: string;
  mode: string;
  conductedAt?: string;
  status: string;
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
    roleCatalog?: {
      id: string;
      name: string;
      slug: string;
      category: string;
    } | null;
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
  templateId?: string;
  template?: ScreeningTemplate; // Selected template with items
  checklistItems?: ScreeningChecklistItem[];
  trainingAssignment?: TrainingAssignment;
}

export interface ScreeningChecklistItem {
  id: string;
  screeningId: string;
  templateItemId?: string; // Link to template item if from template
  category: string;
  criterion: string;
  passed: boolean;
  rating?: number;
  score?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScreeningRequest {
  candidateProjectMapId: string;
  coordinatorId: string;
  templateId?: string; // Selected template for this interview
  scheduledTime?: string;
  duration?: number;
  meetingLink?: string;
  mode?: string;
}

export interface UpdateScreeningRequest {
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
  templateItemId?: string; // Link to template item if from template
  passed: boolean;
  rating?: number;
  score?: number;
  notes?: string;
}

export interface CompleteScreeningRequest {
  overallRating: number;
  decision: string;
  remarks?: string;
  strengths?: string;
  areasOfImprovement?: string;
  checklistItems: ChecklistItemInput[];
}

export interface QueryScreeningsRequest {
  candidateProjectMapId?: string;
  coordinatorId?: string;
  decision?: string;
  mode?: string;
  scheduledDate?: string;
  conductedDate?: string;
}

// Query params for assigned mock interviews list
export interface QueryAssignedScreeningsRequest {
  page?: number;
  limit?: number;
  projectId?: string;
  candidateId?: string;
  recruiterId?: string;
}

// Item returned by the assigned-mock-interviews endpoint
export interface AssignedScreeningItem {
  id: string; // candidateProject id
  candidate: { id: string; firstName: string; lastName: string; email?: string };
  project: { id: string; title: string };
  roleNeeded?: { id: string; designation?: string };
  recruiter?: { id: string; name?: string; email?: string };
  mainStatus?: { id?: string; name?: string; label?: string; color?: string };
  subStatus?: { id?: string; name?: string; label?: string; color?: string };
  assignedAt?: string; // ISO timestamp
  createdAt?: string;
  updatedAt?: string;
}

// ==================== TRAINING TYPES ====================

export interface TrainingAssignment {
  id: string;
  candidateProjectMapId: string;
  screeningId?: string;
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
      email: ReactNode;
      id: string;
      firstName: string;
      lastName: string;
    };
    project: {
      id: string;
      title: string;
      requiredScreening: boolean;
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
  screening?: Screening;
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
  screeningId?: string;
  assignedBy: string;
  trainingType: string;
  focusAreas?: string[];
  priority?: string;
  targetCompletionDate?: string;
  notes?: string;
}

export interface UpdateTrainingAssignmentRequest {
  candidateProjectMapId?: string;
  screeningId?: string;
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

// Request to send a candidate for interview (training-specific API)
export interface SendForInterviewRequest {
  projectId: string;
  candidateId: string;
  type: "screening_assigned" | "interview_assigned";
  recruiterId?: string;
  notes?: string;
}

export interface QueryTrainingAssignmentsRequest {
  candidateProjectMapId?: string;
  screeningId?: string;
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

export const SCREENING_CATEGORY = {
  TECHNICAL_SKILLS: "technical_skills",
  COMMUNICATION: "communication",
  PROFESSIONALISM: "professionalism",
  ROLE_SPECIFIC: "role_specific",
} as const;

export const SCREENING_DECISION = {
  APPROVED: "approved",
  NEEDS_TRAINING: "needs_training",
  REJECTED: "rejected",
} as const;

export const SCREENING_MODE = {
  VIDEO: "video",
  PHONE: "phone",
  IN_PERSON: "in_person",
} as const;

export const TRAINING_STATUS = {
  ASSIGNED: "assigned",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  SCREENING_ASSIGNED: "screening_assigned",
  INTERVIEW_ASSIGNED: "interview_assigned",
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

export function isScreeningCategory(value: string): value is keyof typeof SCREENING_CATEGORY {
  return Object.values(SCREENING_CATEGORY).includes(value as any);
}

export function isScreeningDecision(value: string): value is keyof typeof SCREENING_DECISION {
  return Object.values(SCREENING_DECISION).includes(value as any);
}

export function isTrainingStatus(
  value: string
): value is keyof typeof TRAINING_STATUS {
  return Object.values(TRAINING_STATUS).includes(value as any);
}
