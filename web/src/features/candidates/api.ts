import { baseApi } from "@/app/api/baseApi";
import { buildProcessingStatusChangeInvalidationTags } from "@/app/providers/notification-handlers/processing-status-change-handler";
import type { CandidateProfileCompletionPayload } from "./profileCompletion";

/** Aggregated pipeline activity counts from GET /candidates/:id */
export type CandidateActivitySnapshot = {
  projectsAssigned: number;
  inDocumentation: number;
  inInterview: number;
  processingOrDeployed: number;
  offersInPipeline: number;
  placements: number;
  verifiedDocuments: number;
  pendingDocuments: number;
  profileCompletion: number;
  pipelineUpdates: number;
};

// Document types
export interface Document {
  id: string;
  candidateId: string;
  docType: string;
  /** Set by API list endpoint when docName is empty (catalog display name) */
  documentDisplayName?: string;
  /** Alias of docType for table columns */
  documentType?: string;
  docName?: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  expiryDate?: string;
  documentNumber?: string;
  notes?: string;
  status: string;
  uploadedBy: string;
  uploadedByUser?: { id: string; name: string; email: string } | null;
  verifiedBy?: string;
  roleCatalogId?: string;
  roleCatalog?: {
    id: string;
    name: string;
    label: string;
  };
  workExperienceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadDocumentRequest {
  candidateId: string;
  formData: FormData;
}

// Types
export interface Candidate {
  id: string;
  candidateCode?: string | null;
  firstName: string;
  lastName: string;
  contact: string;
  email?: string;
  profileImage?: string;
  source: string;
  gender?: string;
  dateOfBirth: string; // Now mandatory
  currentStatus: {
    id: number;
    statusName: string;
  };
  totalExperience?: number;
  currentSalary?: number;
  currentEmployer?: string;
  currentRole?: string;
  expectedMinSalary?: number;
  expectedMaxSalary?: number;
  expectedSalary?: number; // Legacy field
  preferredCountries?: Array<{
    country: {
      id: string;
      name: string;
      code: string;
    };
  }>;
  facilityPreferences?: Array<{
    id: string;
    facilityType: string;
  }>;
  rolePreferences?: Array<{
    roleCatalogId: string;
    roleCatalog: {
      id: string;
      label: string;
      name: string;
      roleDepartment?: {
        id: string;
        label: string;
        name: string;
      } | null;
    };
  }>;
  professionTypeId?: string;
  professionType?: {
    id: string;
    name: string;
    label: string;
  };
  sectorType?: string;
  visaType?: string;

  // Physical / personal attributes
  height?: number;
  weight?: number;
  skinTone?: string;
  languageProficiency?: string;
  smartness?: string;
  licensingExam?: string;
  dataFlow?: boolean;
  eligibility?: boolean;
  eligibilityNumber?: string | null;
  religionId?: string | null;
  religion?: { id: string; name: string } | null;

  // New fields for better contact management
  countryCode?: string | null;
  mobileNumber?: string | null;
  passportNumber?: string | null;
  name?: string; // Computed field: firstName + lastName

  // Referral fields
  referralCompanyName?: string | null;
  referralEmail?: string | null;
  referralCountryCode?: string | null;
  referralPhone?: string | null;
  referralDescription?: string | null;

  addressCountryCode?: string | null;
  addressStateId?: string | null;
  address?: string | null;
  addressPincode?: string | null;
  alternatePhone?: string | null;
  addressCountry?: { code: string; name: string } | null;
  addressState?: { id: string; name: string; code: string } | null;

  // Educational Qualifications (legacy fields)
  highestEducation?: string;
  university?: string;
  graduationYear?: number;
  gpa?: number;

  // Legacy fields for backward compatibility
  experience?: number;
  skills?: string[];
  createdBy?: {
    name: string;
    email: string;
  } | null;
  /** Legacy API field — use getCandidateOperationsState() in UI. */
  isHandledByCRE?: boolean;
  /** Legacy API field — use getCandidateOperationsState() in UI. */
  isCREReassigned?: boolean;
  /** Legacy API field — use getCandidateOperationsState() in UI. */
  creStatusNote?: string | null;
  /** Legacy API field — use getCandidateOperationsState() in UI. */
  creStatus?: { id: number; statusName: string } | null;
  assignedTo?: string;
  matchScore?: number;
  createdAt: string;
  updatedAt: string;
  /** Present when the API includes profile scoring (list + detail). */
  profileCompletion?: CandidateProfileCompletionPayload;
  recruiter?: {
    id: string;
    name: string;
    email: string;
  };
  isNominated?: boolean;
  projectSubStatus?: any;
  projectMainStatus?: any;
  projectDetails?: {
    projectId: string;
    projectTitle: string;
    mainStatus: string;
    subStatus: string;
    nominatedRole: string;
    roleNeeded?: {
      id: string;
      projectId: string;
      roleCatalogId: string;
      designation: string;
      roleCatalog: {
        id: string;
        name: string;
        label: string;
        type: string;
        shortName?: string;
        description?: string;
        isActive: boolean;
      };
    } | null;
  } | null;
  projects?: CandidateProjectMap[];
  workExperiences?: WorkExperience[];
  qualifications?: (CandidateQualification & {
    qualification: {
      id: string;
      name: string;
      shortName?: string;
      level: string;
      field: string;
      program?: string;
      description?: string;
    };
  })[];

  /** Computed on GET /candidates/:id from work experience + qualifications. */
  careerGapAnalysis?: CareerGapAnalysis;

  /** Aggregated pipeline activity counts (GET /candidates/:id). */
  activitySnapshot?: CandidateActivitySnapshot;

  // On hold tracking fields
  onHoldDuration?: number | null;
  onHoldUntil?: string | null;

  // Future status tracking
  futureDate?: string | null;

  // Additional properties for detailed view
  assignedRecruiter?: {
    id: string;
    name: string;
    email: string;
  };

  // Pipeline data
  pipeline?: {
    projects: Array<{
      projectId: string;
      projectTitle: string;
      stages: Array<{
        stage: string;
        isCurrent: boolean;
        isCompleted: boolean;
        title: string;
        description: string;
        date?: string;
        icon?: string;
        color?: string;
      }>;
      currentStage: string;
      overallProgress: number;
    }>;
    overallProgress: number;
  };

  // Metrics data
  metrics?: {
    applications: number;
    totalApplications: number;
    interviews: number;
    interviewsScheduled: number;
    interviewsCompleted: number;
    offersReceived: number;
    placements: number;
    averageResponseTime: number;
  };

  // History data
  history?: Array<{
    id: string;
    action: string;
    description: string;
    date: string;
    user: string;
  }>;

  // Additional properties used in UI
  candidateQualifications?: any[];
  candidateExperience?: number;
  documents?: any[];
  roleMatches?: Array<{
    roleId?: string;
    designation?: string;
    score?: number;
  }>;
}

export interface CandidateQualification {
  id: string;
  qualificationId: string;
  qualificationName?: string;
  university?: string;
  graduationYear?: number;
  gpa?: number;
  isCompleted: boolean;
  notes?: string;
  countryCode?: string | null;
  country?: { code: string; name: string } | null;
}

export interface WorkExperience {
  id: string;
  candidateId: string;
  companyName?: string;
  roleCatalogId: string;
  jobTitle: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
  salary?: number;
  location?: string;
  countryCode?: string | null;
  country?: { code: string; name: string } | null;
  skills: string[];
  achievements?: string;
  createdAt: string;
  updatedAt: string;
  roleCatalog?: {
    id: string;
    name: string;
    label: string;
    roleDepartmentId: string;
  };
}

export type CareerGapType =
  | "between_jobs"
  | "education_to_work"
  | "current_unemployment";

export interface CareerGap {
  type: CareerGapType;
  startDate: string;
  endDate: string;
  months: number;
  label: string;
}

export interface CareerGapAnalysis {
  totalExperienceMonths: number;
  totalGapMonths: number;
  longestGapMonths: number;
  hasCurrentEmployment: boolean;
  gaps: CareerGap[];
}

export interface CreateWorkExperienceRequest {
  candidateId: string;
  companyName?: string;
  roleCatalogId: string;
  jobTitle: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  salary?: number;
  location?: string;
  countryCode?: string;
  skills?: string;
  achievements?: string;
}

export interface CreateCandidateQualificationRequest {
  candidateId: string;
  qualificationId: string;
  university?: string;
  graduationYear?: number;
  gpa?: number;
  isCompleted?: boolean;
  notes?: string;
  countryCode?: string;
}

export interface UpdateCandidateQualificationRequest {
  id: string;
  qualificationId?: string;
  university?: string;
  graduationYear?: number | null;
  gpa?: number | null;
  isCompleted?: boolean;
  notes?: string;
  countryCode?: string | null;
}

export interface UpdateWorkExperienceRequest {
  id: string;
  companyName?: string;
  roleCatalogId?: string;
  jobTitle?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  salary?: number;
  location?: string;
  countryCode?: string | null;
  skills?: string;
  achievements?: string;
}



export type CandidateProjectItem = {
  id: string;
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    mobileNumber?: string;
  };
  project: {
    id: string;
    title: string;
    status?: string;
  };
  roleNeeded?: {
    id: string;
    designation: string;
    minExperience?: number;
    maxExperience?: number;
    roleCatalogId?: string;
    roleCatalog?: {
      id: string;
      name?: string;
      label?: string;
    };
  } | null;
  recruiter?: {
    id: string;
    name: string;
    email?: string;
  } | null;
  currentProjectStatus?: {
    id?: number;
    statusName?: string;
  } | null;
  subStatus?: {
    id?: string;
    name?: string;
    label?: string;
  } | null;
  assignedAt?: string;
};

export type CandidateProjectsResponse = {
  success: boolean;
  data: CandidateProjectItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export interface CandidateProjectMap {
  id: string;
  projectId: string;
  candidateId: string;
  status: string;
  nominatedDate: string;
  nominatedBy: string;
  approvedBy?: string;
  approvedDate?: string;
  rejectedBy?: string;
  rejectedDate?: string;
  documentsSubmittedDate?: string;
  documentsVerifiedDate?: string;
  selectedDate?: string;
  hiredDate?: string;
  notes?: string;
  rejectionReason?: string;
  title?: string;
  client?: string;
  deadline?: string;
  matchScore?: number;
  isAssigned?: boolean;
  assignedAt?: string;
  currentProjectStatus: {
    id: number;
    statusName: string;
  }
  subStatus: {
    id: number;
    label: string;
  };
 
  project: {
    id: string;
    title: string;
    client: {
      id: string;
      name: string;
    };
  };
  recruiter?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface PassportLookupCandidateSummary {
  id: string;
  candidateCode: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  countryCode: string | null;
  mobileNumber: string | null;
}

export interface PassportLookupResult {
  found: boolean;
  candidate?: PassportLookupCandidateSummary;
}

export interface ProfessionType {
  id: string;
  name: string;
  label: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateCandidateRequest {
  firstName: string;
  lastName: string;
  countryCode?: string;
  mobileNumber?: string;
  passportNumber?: string;
  email?: string;
  source?: string;
  dateOfBirth: string;
  totalExperience?: number;
  currentSalary?: number;
  currentEmployer?: string;
  currentRole?: string;
  expectedMinSalary?: number;
  expectedMaxSalary?: number;
  expectedSalary?: number; // Legacy
  professionTypeId: string;
  sectorType?: string;
  visaType?: string;
  preferredCountries?: string[];
  facilityPreferences?: string[];
  preferredRoles?: string[];
  highestEducation?: string;
  university?: string;
  graduationYear?: number;
  gpa?: number;
  qualifications?: Array<{
    qualificationId: string;
    university?: string;
    graduationYear?: number;
    gpa?: number;
    isCompleted: boolean;
    notes?: string;
  }>;
  workExperiences?: Array<{
    companyName: string;
    roleCatalogId: string;
    jobTitle: string;
    startDate: string;
    endDate?: string;
    isCurrent: boolean;
    description?: string;
    salary?: number;
    location?: string;
    skills?: string;
    achievements?: string;
  }>;
  skills?: string;
  teamId?: string;
  /** Required when source is agent */
  agentId?: string;
  /** Optional: agent-linked project IDs (declaration only, not nomination) */
  declaredProjectIds?: string[];
  addressCountryCode?: string;
  addressStateId?: string;
  address?: string;
  addressPincode?: string;
  alternatePhone?: string;
  height?: number;
  weight?: number;
  skinTone?: string;
  languageProficiency?: string;
  smartness?: string;
  religionId?: string;
  licensingExam?: string;
  dataFlow?: boolean;
  eligibility?: boolean;
  eligibilityNumber?: string;
}

export interface UpdateCandidateRequest {
  id: string;
  firstName?: string;
  lastName?: string;
  countryCode?: string;
  mobileNumber?: string;
  email?: string;
  source?: string;
  gender?: string;
  dateOfBirth?: string;
  currentStatusId?: number;
  totalExperience?: number;
  currentSalary?: number;
  currentEmployer?: string;
  currentRole?: string;
  expectedMinSalary?: number;
  expectedMaxSalary?: number;
  professionTypeId?: string;
  sectorType?: string;
  visaType?: string;
  preferredCountries?: string[];
  facilityPreferences?: string[];
  preferredRoles?: string[];
  highestEducation?: string;
  university?: string;
  graduationYear?: number;
  gpa?: number;
  skills?: string;
  teamId?: string;
  height?: number;
  weight?: number;
  skinTone?: string;
  languageProficiency?: string;
  smartness?: string;
  licensingExam?: string;
  dataFlow?: boolean;
  eligibility?: boolean;
  eligibilityNumber?: string | null;
  religionId?: string | null;
  /** Agent-linked declarations (intent only); only for agent-sourced candidates */
  declaredProjectIds?: string[];
  addressCountryCode?: string | null;
  addressStateId?: string | null;
  address?: string | null;
  addressPincode?: string | null;
  alternatePhone?: string | null;
  passportNumber?: string | null;
}

export interface UpdateCandidateStatusRequest {
  currentStatusId: number;
  reason?: string;
  onHoldDurationDays?: number;
  onHoldUntil?: string;
  futureDate?: string;
  futureYear?: number;
  callbackAt?: string;
}

export interface AssignRecruiterRequest {
  recruiterId: string;
  reason?: string;
}

export interface RecruiterAssignment {
  id: string;
  candidateId: string;
  recruiterId: string;
  assignedBy: string;
  assignedAt: string;
  unassignedAt?: string;
  unassignedBy?: string;
  reason?: string;
  isActive: boolean;
  recruiter: {
    id: string;
    name: string;
    email: string;
  };
  assignedByUser: {
    id: string;
    name: string;
    email: string;
  };
  unassignedByUser?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CandidateListQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  currentStatus?: string;
  dateFilter?: string;
  dateFrom?: string;
  dateTo?: string;
  gender?: string;
  countryPreferences?: string[];
  sectorTypes?: string[];
  facilityPreferences?: string[];
  sources?: string[];
  source?: string;
  minExperience?: number;
  maxExperience?: number;
  minSalary?: number;
  maxSalary?: number;
  minAge?: number;
  maxAge?: number;
  visaType?: string;
  qualification?: string;
  roleCatalogId?: string;
  teamId?: string;
  assignedTo?: string;
  heightMin?: number;
  heightMax?: number;
  weightMin?: number;
  weightMax?: number;
  skinTone?: string;
  languageProficiency?: string;
  smartness?: string;
  licensingExam?: string;
  dataFlow?: boolean;
  eligibility?: boolean;
  workExperienceCompany?: string;
  workExperienceTitle?: string;
  operationsCallAttempts?: number;
}

export interface GetCandidatesParams extends CandidateListQueryParams {}

export interface GetRecruiterMyCandidatesParams extends CandidateListQueryParams {}

export function appendCandidateListQueryParams(
  queryParams: URLSearchParams,
  params: CandidateListQueryParams,
): void {
  if (params.assignedTo) queryParams.append("assignedTo", params.assignedTo);
  if (params.page) queryParams.append("page", params.page.toString());
  if (params.limit) queryParams.append("limit", params.limit.toString());
  if (params.status) queryParams.append("status", params.status);
  if (params.currentStatus) queryParams.append("currentStatus", params.currentStatus);
  if (params.search) queryParams.append("search", params.search);
  if (params.dateFilter) queryParams.append("dateFilter", params.dateFilter);
  if (params.dateFrom) queryParams.append("dateFrom", params.dateFrom);
  if (params.dateTo) queryParams.append("dateTo", params.dateTo);
  if (params.gender) queryParams.append("gender", params.gender);
  if (params.roleCatalogId) queryParams.append("roleCatalogId", params.roleCatalogId);
  if (params.teamId) queryParams.append("teamId", params.teamId);

  if (params.countryPreferences) {
    params.countryPreferences.forEach((cp) =>
      queryParams.append("countryPreferences", cp),
    );
  }
  if (params.sectorTypes) {
    params.sectorTypes.forEach((st) => queryParams.append("sectorTypes", st));
  }
  if (params.facilityPreferences) {
    params.facilityPreferences.forEach((fp) =>
      queryParams.append("facilityPreferences", fp),
    );
  }
  if (params.sources) {
    params.sources.forEach((s) => queryParams.append("sources", s));
  } else if (params.source) {
    queryParams.append("source", params.source);
  }

  if (params.minExperience !== undefined) {
    queryParams.append("minExperience", params.minExperience.toString());
  }
  if (params.maxExperience !== undefined) {
    queryParams.append("maxExperience", params.maxExperience.toString());
  }
  if (params.minSalary !== undefined) {
    queryParams.append("minSalary", params.minSalary.toString());
  }
  if (params.maxSalary !== undefined) {
    queryParams.append("maxSalary", params.maxSalary.toString());
  }
  if (params.minAge !== undefined) {
    queryParams.append("minAge", params.minAge.toString());
  }
  if (params.maxAge !== undefined) {
    queryParams.append("maxAge", params.maxAge.toString());
  }
  if (params.visaType) queryParams.append("visaType", params.visaType);
  if (params.qualification) queryParams.append("qualification", params.qualification);
  if (params.heightMin !== undefined) {
    queryParams.append("heightMin", params.heightMin.toString());
  }
  if (params.heightMax !== undefined) {
    queryParams.append("heightMax", params.heightMax.toString());
  }
  if (params.weightMin !== undefined) {
    queryParams.append("weightMin", params.weightMin.toString());
  }
  if (params.weightMax !== undefined) {
    queryParams.append("weightMax", params.weightMax.toString());
  }
  if (params.skinTone) queryParams.append("skinTone", params.skinTone);
  if (params.languageProficiency) {
    queryParams.append("languageProficiency", params.languageProficiency);
  }
  if (params.smartness) queryParams.append("smartness", params.smartness);
  if (params.licensingExam) queryParams.append("licensingExam", params.licensingExam);
  if (params.dataFlow !== undefined) {
    queryParams.append("dataFlow", String(params.dataFlow));
  }
  if (params.eligibility !== undefined) {
    queryParams.append("eligibility", String(params.eligibility));
  }
  if (params.workExperienceCompany) {
    queryParams.append("workExperienceCompany", params.workExperienceCompany);
  }
  if (params.workExperienceTitle) {
    queryParams.append("workExperienceTitle", params.workExperienceTitle);
  }
  if (params.operationsCallAttempts !== undefined) {
    queryParams.append(
      "operationsCallAttempts",
      params.operationsCallAttempts.toString(),
    );
  }
}

export interface RecruiterMyCandidatesResponse {
  success: boolean;
  data: Candidate[];
  counts: {
    totalAssigned: number;
    untouched: number;
    rnr: number;
    onHold: number;
    interested: number;
    qualified: number;
    future: number;
    deployed: number; // new backend key
    working?: number; // legacy
    notInterested: number;
    notEligible: number;
    otherEnquiry: number;
  };
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  message: string;
}

export interface AllCandidatesResponse {
  success?: boolean;
  data?: Candidate[];
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
  counts?: {
    total?: number;
    totalAssigned?: number;
    untouched?: number;
    rnr?: number;
    onHold?: number;
    interested?: number;
    qualified?: number;
    future?: number;
    deployed?: number; // preferred new key
    working?: number; // legacy
    notInterested?: number;
    notEligible?: number;
    otherEnquiry?: number;
  };
  message?: string;
}

export interface ConsolidatedCandidatesResponse {
  success: boolean;
  data: {
    candidates: Candidate[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  message: string;
}

export type PendingStatusChangeRequest = {
  id: string;
  requestType:
    | "block"
    | "reactivate"
    | "processing_cancel"
    | "processing_hold"
    | "processing_reactivate";
  requestedStatus?: string;
  reason: string;
  createdAt: string;
  stepKey?: string;
  restrictCountryCode?: string | null;
  restrictCountryName?: string | null;
  requestedCountryRestriction?: boolean;
  processingCandidateId?: string;
  status?: string;
  reviewNotes?: string | null;
  requester?: {
    id: string;
    name: string;
    email?: string;
  };
  reviewer?: {
    id: string;
    name: string;
    email?: string;
  };
};

export type CandidateCountryRestriction = {
  id: string;
  candidateId: string;
  countryCode: string;
  restrictionType: string;
  reason: string;
  sourceMeta?: {
    stepKey?: string;
    projectId?: string;
    projectTitle?: string;
    processingStepId?: string;
    processingCandidateId?: string;
    notes?: string;
  } | null;
  restrictedAt: string;
  isActive: boolean;
  liftedAt?: string | null;
  liftReason?: string | null;
  country?: { code: string; name: string };
  restrictedBy?: { id: string; name: string };
  liftedBy?: { id: string; name: string } | null;
};

export type CandidateCountryRestrictionsPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedCandidateCountryRestrictions = {
  items: CandidateCountryRestriction[];
  pagination: CandidateCountryRestrictionsPagination;
};

export type ReviewedStatusChangeRequest = PendingStatusChangeRequest & {
  status: "approved" | "rejected";
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  reviewer?: {
    id: string;
    name: string;
    email?: string;
  };
};

export type StatusChangeRequestHistoryItem = ReviewedStatusChangeRequest & {
  status: "pending" | "approved" | "rejected";
};

export interface GetCandidateProjectPipelineResponse {
    success: boolean;
    data: {
      candidateProjectMapId?: string;
      isPipelineBlocked?: boolean;
      pipelineBlockedReason?: string | null;
      processingConflict?: {
        projectId: string;
        projectTitle: string;
      } | null;
      pipelineBlockedOnThisProject?: boolean;
      pendingStatusChangeRequest?: PendingStatusChangeRequest | null;
      latestReviewedStatusChangeRequest?: ReviewedStatusChangeRequest | null;
      previousMainStatus?: { id: string; name: string; label: string };
      previousSubStatus?: { id: string; name: string; label: string };
      statusBlockedAt?: string;
      currentStatus?: {
        mainStatus?: { id: string; name: string; label: string; color?: string };
        subStatus?: { id: string; name: string; label: string; color?: string };
        timeInStatus?: string;
      };
      candidate: Candidate & {
        mobileNumber?: string;
        countryCode?: string;
        profileImage?: string;
        teamId?: string;
        currentStatusId?: number;
        qualifications?: Array<{
          id: string;
          qualificationId: string;
          university?: string;
          graduationYear?: number;
          gpa?: number;
          isCompleted: boolean;
          notes?: string;
          qualification: {
            id: string;
            name: string;
            shortName?: string;
            description?: string;
          };
        }>;
        experience?: number;
        expectedSalary?: number;
        currentEmployer?: string;
        currentRole?: string;
        graduationYear?: number;
        highestEducation?: string;
        gpa?: number;
        university?: string;
        skills?: string[];
        source?: string;
      };
      project: {
        id: string;
        title: string;
        status: string;
        description?: string;
        deadline?: string;
        createdAt?: string;
        updatedAt?: string;
        priority?: string;
        countryCode?: string;
        projectType?: string;
        resumeEditable?: boolean;
        groomingRequired?: string;
        hideContactInfo?: boolean;
        clientId?: string;
        teamId?: string;
        client?: {
          id: string;
          name: string;
          type?: string;
        };
        team?: {
          id: string;
          name: string;
        };
        rolesNeeded?: Array<{
          id: string;
          designation: string;
          quantity: number;
        }>;
        documentRequirements?: Array<{
          id: string;
          docType: string;
          mandatory: boolean;
        }>;
        interviews?: Array<{
          id: string;
          scheduledTime: string;
          type: string;
        }>;
      };
      history: Array<{
        id: string;
        candidateProjectMapId: string;
        projectStatus: {
          id: number;
          statusName: string;
        };
        changedBy: {
          id: string;
          name: string;
          email: string;
        };
        reason: string;
        notes: string;
        statusChangedAt: string;
        createdAt: string;
        updatedAt: string;
      }>;
      totalEntries: number;
    };
    message: string;
}

export type RegisteredSubStatusTileStat = {
  key: string;
  subStatusName: string;
  label: string;
  count: number;
};

export type RegisteredSubStatusStats = {
  tiles: RegisteredSubStatusTileStat[];
};

export type CandidateOverviewStats = {
  total: number;
  positive: number;
  untouched?: number;
  negative: number;
  /** Nominated to project (profile shortlisting). */
  profileShortlisting?: number;
  /** @deprecated Use profileShortlisting */
  nominated: number;
  /** Documents stage after Send for Verification. */
  registered?: number;
  documentReceived: number;
  documentation?: number;
  interviewAssigned: number;
  screening?: number;
  interview?: number;
  processing?: number;
  medical: number;
  visa: number;
  deployed: number;
  /** History-based counts for Registered documentation sub-statuses. */
  registeredSubStatus?: RegisteredSubStatusStats;
  /** History-based counts for Screening sub-statuses. */
  screeningSubStatus?: RegisteredSubStatusStats;
  /** History-based counts for Interview sub-statuses. */
  interviewSubStatus?: RegisteredSubStatusStats;
  /** History-based counts for Processing sub-statuses. */
  processingSubStatus?: RegisteredSubStatusStats;
};

type CandidateOverviewQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  currentStatus?: string;
  recruiterId?: string;
  dateFilter?: string;
  dateFrom?: string;
  dateTo?: string;
  gender?: string;
  mainStatus?: string;
  subStatus?: string;
  processingStep?: string;
  countryPreferences?: string[];
  sectorTypes?: string[];
  facilityPreferences?: string[];
  sources?: string[];
  source?: string;
  minExperience?: number;
  maxExperience?: number;
  minSalary?: number;
  maxSalary?: number;
  minAge?: number;
  maxAge?: number;
  visaType?: string;
  qualification?: string;
  heightMin?: number;
  heightMax?: number;
  weightMin?: number;
  weightMax?: number;
  skinTone?: string;
  languageProficiency?: string;
  smartness?: string;
  licensingExam?: string;
  dataFlow?: boolean;
  eligibility?: boolean;
  workExperienceCompany?: string;
  workExperienceTitle?: string;
};

function appendCandidateOverviewQueryParams(
  queryParams: URLSearchParams,
  params: CandidateOverviewQueryParams,
  options?: { includePagination?: boolean; includeTileFilters?: boolean },
) {
  const includePagination = options?.includePagination ?? true;
  const includeTileFilters = options?.includeTileFilters ?? true;

  if (includePagination && params.page) {
    queryParams.append("page", params.page.toString());
  }
  if (includePagination && params.limit) {
    queryParams.append("limit", params.limit.toString());
  }
  if (params.search) queryParams.append("search", params.search);
  if (includeTileFilters && params.status) {
    queryParams.append("status", params.status);
  }
  if (includeTileFilters && params.mainStatus) {
    queryParams.append("mainStatus", params.mainStatus);
  }
  if (includeTileFilters && params.subStatus) {
    queryParams.append("subStatus", params.subStatus);
  }
  if (includeTileFilters && params.processingStep) {
    queryParams.append("processingStep", params.processingStep);
  }
  if (includeTileFilters && params.currentStatus) {
    queryParams.append("currentStatus", params.currentStatus);
  }
  if (params.recruiterId) queryParams.append("recruiterId", params.recruiterId);
  if (params.dateFilter) queryParams.append("dateFilter", params.dateFilter);
  if (params.dateFrom) queryParams.append("dateFrom", params.dateFrom);
  if (params.dateTo) queryParams.append("dateTo", params.dateTo);
  if (params.gender) queryParams.append("gender", params.gender);

  if (params.countryPreferences) {
    params.countryPreferences.forEach((cp) =>
      queryParams.append("countryPreferences", cp),
    );
  }
  if (params.sectorTypes) {
    params.sectorTypes.forEach((st) => queryParams.append("sectorTypes", st));
  }
  if (params.facilityPreferences) {
    params.facilityPreferences.forEach((fp) =>
      queryParams.append("facilityPreferences", fp),
    );
  }
  if (params.sources) {
    params.sources.forEach((s) => queryParams.append("sources", s));
  } else if (params.source) {
    queryParams.append("source", params.source);
  }

  if (params.minExperience !== undefined) {
    queryParams.append("minExperience", params.minExperience.toString());
  }
  if (params.maxExperience !== undefined) {
    queryParams.append("maxExperience", params.maxExperience.toString());
  }
  if (params.minSalary !== undefined) {
    queryParams.append("minSalary", params.minSalary.toString());
  }
  if (params.maxSalary !== undefined) {
    queryParams.append("maxSalary", params.maxSalary.toString());
  }
  if (params.minAge !== undefined) {
    queryParams.append("minAge", params.minAge.toString());
  }
  if (params.maxAge !== undefined) {
    queryParams.append("maxAge", params.maxAge.toString());
  }
  if (params.visaType) queryParams.append("visaType", params.visaType);
  if (params.qualification) {
    queryParams.append("qualification", params.qualification);
  }
  if (params.heightMin !== undefined) {
    queryParams.append("heightMin", params.heightMin.toString());
  }
  if (params.heightMax !== undefined) {
    queryParams.append("heightMax", params.heightMax.toString());
  }
  if (params.weightMin !== undefined) {
    queryParams.append("weightMin", params.weightMin.toString());
  }
  if (params.weightMax !== undefined) {
    queryParams.append("weightMax", params.weightMax.toString());
  }
  if (params.skinTone) queryParams.append("skinTone", params.skinTone);
  if (params.languageProficiency) {
    queryParams.append("languageProficiency", params.languageProficiency);
  }
  if (params.smartness) queryParams.append("smartness", params.smartness);
  if (params.licensingExam) {
    queryParams.append("licensingExam", params.licensingExam);
  }
  if (params.dataFlow !== undefined) {
    queryParams.append("dataFlow", String(params.dataFlow));
  }
  if (params.eligibility !== undefined) {
    queryParams.append("eligibility", String(params.eligibility));
  }
  if (params.workExperienceCompany) {
    queryParams.append("workExperienceCompany", params.workExperienceCompany);
  }
  if (params.workExperienceTitle) {
    queryParams.append("workExperienceTitle", params.workExperienceTitle);
  }
}

export const candidatesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProfessionTypes: builder.query<{ professionTypes: ProfessionType[] }, void>({
      query: () => "/profession-types",
      transformResponse: (response: {
        success?: boolean;
        data?: { professionTypes?: ProfessionType[] };
      }) => ({
        professionTypes: response.data?.professionTypes ?? [],
      }),
      providesTags: [{ type: "ProfessionType" as const, id: "LIST" }],
    }),
    getCandidateOverviewStats: builder.query<
      { stats: CandidateOverviewStats },
      CandidateOverviewQueryParams
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        appendCandidateOverviewQueryParams(queryParams, params, {
          includePagination: false,
          includeTileFilters: false,
        });
        return `/candidates/overview/stats?${queryParams.toString()}`;
      },
      transformResponse: (response: {
        success?: boolean;
        stats?: CandidateOverviewStats;
        message?: string;
      }) => ({
        stats: response.stats ?? {
          total: 0,
          positive: 0,
          untouched: 0,
          negative: 0,
          nominated: 0,
          profileShortlisting: 0,
          registered: 0,
          screening: 0,
          interviewAssigned: 0,
          documentReceived: 0,
          medical: 0,
          visa: 0,
          deployed: 0,
          registeredSubStatus: { tiles: [] },
          screeningSubStatus: { tiles: [] },
          interviewSubStatus: { tiles: [] },
          processingSubStatus: { tiles: [] },
        },
      }),
      providesTags: ["Candidate"],
    }),
    getCandidateOverview: builder.query<
      {
        data: Candidate[];
        pagination?: any;
      },
      CandidateOverviewQueryParams
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        appendCandidateOverviewQueryParams(queryParams, params);
        return `/candidates/overview?${queryParams.toString()}`;
      },
      transformResponse: (response: {
        success?: boolean;
        data?: Candidate[];
        pagination?: unknown;
        message?: string;
      }) => {
        const rows = Array.isArray(response?.data) ? response.data : [];
        return {
          ...response,
          data: rows.map((row) => ({
            ...row,
            passportNumber:
              row.passportNumber ??
              (row as { passport_number?: string | null }).passport_number ??
              null,
          })),
        };
      },
      providesTags: ["Candidate"],
    }),
    getCandidates: builder.query<
      {
        data: Candidate[];
        pagination?: any;
        counts?: {
          total?: number;
          totalAssigned?: number;
          untouched?: number;
          rnr?: number;
          onHold?: number;
          interested?: number;
          notInterested?: number;
          notEligible?: number;
          otherEnquiry?: number;
          qualified?: number;
          future?: number;
          working?: number;
        };
      },
      GetCandidatesParams | void
    >({
      query: (params) => {
        if (!params) return "/candidates";

        const queryParams = new URLSearchParams();
        appendCandidateListQueryParams(queryParams, params);

        const queryString = queryParams.toString();
        return queryString ? `/candidates?${queryString}` : "/candidates";
      },
      transformResponse: (response: any) => {
        const candidates = Array.isArray(response?.data?.candidates)
          ? response.data.candidates
          : Array.isArray(response?.data)
            ? response.data
            : [];

        return {
          data: candidates,
          pagination: response?.data?.pagination ?? response?.pagination,
          counts: response?.counts ?? response?.data?.counts,
        };
      },
      providesTags: ["Candidate"],
    }),
    

    getCandidateProjectPipeline: builder.query<
      GetCandidateProjectPipelineResponse,
      { candidateId: string; projectId: string }
    >({
      query: ({ candidateId, projectId }) =>
        `/candidate-project-pipeline/candidate/${candidateId}/project/${projectId}`,
      transformResponse: (response: GetCandidateProjectPipelineResponse) => {
        return response;
      },
      providesTags: (_, __, { candidateId, projectId }) => [
        { type: "Candidate", id: candidateId },
        { type: "Candidate", id: `pipeline-${candidateId}-${projectId}` },
      ],
    }),

    createCandidateProjectStatusChangeRequest: builder.mutation<
      { success: boolean; data: unknown; message: string },
      {
        candidateProjectMapId: string;
        candidateId: string;
        projectId: string;
        requestType: "block" | "reactivate";
        requestedStatus?: "withdrawn" | "on_hold";
        reason: string;
      }
    >({
      query: ({ candidateProjectMapId, candidateId: _candidateId, projectId: _projectId, ...body }) => ({
        url: `/candidate-projects/status-change-requests`,
        method: "POST",
        body: { candidateProjectMapId, ...body },
      }),
      invalidatesTags: (_result, _error, { candidateId, projectId, candidateProjectMapId }) => [
        { type: "Candidate", id: candidateId },
        { type: "Candidate", id: `pipeline-${candidateId}-${projectId}` },
        { type: "Candidate", id: `status-change-history-${candidateProjectMapId}` },
      ],
    }),

    getCandidateProjectStatusChangeRequestHistory: builder.query<
      {
        success: boolean;
        data: StatusChangeRequestHistoryItem[];
        meta: { total: number; page: number; limit: number; totalPages: number };
        message: string;
      },
      { candidateProjectMapId: string; page?: number; limit?: number }
    >({
      query: ({ candidateProjectMapId, page = 1, limit = 10 }) => ({
        url: `/candidate-projects/status-change-requests/history`,
        params: { candidateProjectMapId, page, limit },
      }),
      providesTags: (_, __, { candidateProjectMapId }) => [
        { type: "Candidate", id: `status-change-history-${candidateProjectMapId}` },
      ],
    }),

    approveCandidateProjectStatusChangeRequest: builder.mutation<
      { success: boolean; data: unknown; message: string },
      {
        requestId: string;
        candidateId: string;
        projectId: string;
        candidateProjectMapId?: string;
        processingCandidateId?: string;
        reviewNotes?: string;
      }
    >({
      query: ({ requestId, candidateId: _candidateId, projectId: _projectId, reviewNotes }) => ({
        url: `/candidate-projects/status-change-requests/${requestId}/approve`,
        method: "PATCH",
        body: { reviewNotes },
      }),
      invalidatesTags: (
        _result,
        _error,
        { candidateId, projectId, candidateProjectMapId, processingCandidateId },
      ) =>
        buildProcessingStatusChangeInvalidationTags({
          candidateId,
          projectId,
          candidateProjectMapId,
          processingCandidateId,
        }),
    }),

    rejectCandidateProjectStatusChangeRequest: builder.mutation<
      { success: boolean; data: unknown; message: string },
      {
        requestId: string;
        candidateId: string;
        projectId: string;
        candidateProjectMapId?: string;
        processingCandidateId?: string;
        reviewNotes?: string;
      }
    >({
      query: ({ requestId, candidateId: _candidateId, projectId: _projectId, reviewNotes }) => ({
        url: `/candidate-projects/status-change-requests/${requestId}/reject`,
        method: "PATCH",
        body: { reviewNotes },
      }),
      invalidatesTags: (
        _result,
        _error,
        { candidateId, projectId, candidateProjectMapId, processingCandidateId },
      ) =>
        buildProcessingStatusChangeInvalidationTags({
          candidateId,
          projectId,
          candidateProjectMapId,
          processingCandidateId,
        }),
    }),

    getCandidateCountryRestrictions: builder.query<
      PaginatedCandidateCountryRestrictions,
      {
        candidateId: string;
        includeInactive?: boolean;
        countryCode?: string;
        page?: number;
        limit?: number;
      }
    >({
      query: ({ candidateId, includeInactive, countryCode, page, limit }) => ({
        url: `/candidates/${candidateId}/country-restrictions`,
        params: {
          ...(includeInactive ? { includeInactive: "true" } : undefined),
          ...(countryCode ? { countryCode } : undefined),
          ...(page ? { page } : undefined),
          ...(limit ? { limit } : undefined),
        },
      }),
      transformResponse: (response: {
        success?: boolean;
        data?: PaginatedCandidateCountryRestrictions;
      }) =>
        response.data ?? {
          items: [],
          pagination: { page: 1, limit: 5, total: 0, totalPages: 1 },
        },
      providesTags: (_, __, { candidateId }) => [
        { type: "Candidate", id: `country-restrictions-${candidateId}` },
      ],
    }),

    liftCandidateCountryRestriction: builder.mutation<
      { success: boolean; message: string },
      { candidateId: string; countryCode: string; reason: string }
    >({
      query: ({ candidateId, countryCode, reason }) => ({
        url: `/candidates/${candidateId}/country-restrictions/${countryCode}`,
        method: "DELETE",
        body: { reason },
      }),
      invalidatesTags: (_, __, { candidateId }) => [
        { type: "Candidate", id: `country-restrictions-${candidateId}` },
        { type: "Candidate", id: candidateId },
      ],
    }),

    getCandidateById: builder.query<Candidate, string>({
      query: (id) => `/candidates/${id}`,
      transformResponse: (response: {
        success: boolean;
        data: Candidate;
        message: string;
      }) => {
        const row = response.data;
        const legacy = row as Candidate & {
          address_pincode?: string | null;
          alternate_phone?: string | null;
        };
        return {
          ...row,
          passportNumber:
            row.passportNumber ??
            (row as { passport_number?: string | null }).passport_number ??
            null,
          addressPincode:
            row.addressPincode ?? legacy.address_pincode ?? null,
          alternatePhone:
            row.alternatePhone ?? legacy.alternate_phone ?? null,
        };
      },
      providesTags: (_, __, id) => [{ type: "Candidate", id }],
    }),

    getOriginalRecruiter: builder.query<{ success: boolean; data: { id: string; name: string; email: string; mobileNumber: string; countryCode: string }; message: string }, string>({
      query: (id) => `/candidates/${id}/original-recruiter`,
    }),

    lookupCandidateByPassport: builder.query<
      PassportLookupResult,
      { passportNumber: string }
    >({
      query: ({ passportNumber }) => ({
        url: "/candidates/passport-lookup",
        params: { passportNumber: passportNumber.trim() },
      }),
      transformResponse: (response: {
        success: boolean;
        data: PassportLookupResult;
      }) => response.data,
    }),

    createCandidate: builder.mutation<Candidate, CreateCandidateRequest>({
      query: (candidateData) => ({
        url: "/candidates",
        method: "POST",
        body: candidateData,
      }),
      invalidatesTags: ["Candidate", "RecruiterPerformanceRating", "AdminDashboard"],
    }),


    updateCandidate: builder.mutation<Candidate, UpdateCandidateRequest>({
      query: ({ id, ...candidateData }) => ({
        url: `/candidates/${id}`,
        method: "PATCH",
        body: candidateData,
      }),
      transformResponse: (response: {
        success: boolean;
        data: Candidate;
        message: string;
      }) => {
        const row = response.data;
        const legacy = row as Candidate & {
          address_pincode?: string | null;
          alternate_phone?: string | null;
        };
        return {
          ...row,
          addressPincode:
            row.addressPincode ?? legacy.address_pincode ?? null,
          alternatePhone:
            row.alternatePhone ?? legacy.alternate_phone ?? null,
        };
      },
      invalidatesTags: (_, __, { id }) => [
        { type: "Candidate", id },
        "Candidate",
        "CandidateProject",
        "ProjectCandidates",
      ],
    }),
    deleteCandidate: builder.mutation<void, string>({
      query: (id) => ({
        url: `/candidates/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Candidate", "RecruiterPerformanceRating", "AdminDashboard"],
    }),
    assignToProject: builder.mutation<
      { success: boolean; data: any; message: string },
      { 
        candidateId: string; 
        projectId: string; 
        roleNeededId?: string;
        recruiterId?: string;
        notes?: string 
      }
    >({
      query: ({ candidateId, projectId, roleNeededId, recruiterId, notes }) => ({
        url: `/candidate-projects/assign`,
        method: "POST",
        body: { candidateId, projectId, roleNeededId, recruiterId, notes },
      }),
      invalidatesTags: (_, __, { projectId }) => [
        "Candidate",
        { type: "Project", id: projectId },
        "ProjectCandidates",
        "CandidateProject",
      ],
    }),

    nominateCandidate: builder.mutation<
      { success: boolean; data: CandidateProjectMap; message: string },
      { candidateId: string; projectId: string; notes?: string }
    >({
      query: ({ candidateId, ...nominationData }) => ({
        url: `/candidates/${candidateId}/nominate`,
        method: "POST",
        body: nominationData,
      }),
      invalidatesTags: (_, __, { projectId }) => [
        "Candidate",
        { type: "Project", id: projectId },
        "ProjectCandidates",
        "CandidateProject",
      ],
    }),

    approveOrRejectCandidate: builder.mutation<
      { success: boolean; data: CandidateProjectMap; message: string },
      {
        candidateProjectMapId: string;
        action: "approve" | "reject";
        notes?: string;
        rejectionReason?: string;
      }
    >({
      query: ({ candidateProjectMapId, ...approvalData }) => ({
        url: `/candidates/project-mapping/${candidateProjectMapId}/approve`,
        method: "POST",
        body: approvalData,
      }),
      invalidatesTags: [
        "Candidate",
        "ProjectCandidates",
        "CandidateProject",
      ],
    }),

    getEligibleCandidates: builder.query<
      { success: boolean; data: any[] },
      {
        projectId: string;
        search?: string;
        roleCatalogId?: string;
        sortBy?: string;
        page?: number;
        limit?: number;
      }
    >({
      query: ({
        projectId,
        search,
        roleCatalogId,
        sortBy,
        page = 1,
        limit = 10,
      }) => ({
        url: `/projects/${projectId}/eligible-candidates`,
        params: {
          search,
          roleCatalogId,
          sortBy,
          page,
          limit,
        },
      }),
      providesTags: ["Candidate"],
    }),

    // Work Experience endpoints
    getWorkExperiences: builder.query<WorkExperience[], string | void>({
      query: (candidateId) =>
        candidateId
          ? `/work-experience/candidate/${candidateId}`
          : "/work-experience",
      providesTags: ["WorkExperience"],
    }),
    createWorkExperience: builder.mutation<
      WorkExperience,
      CreateWorkExperienceRequest
    >({
      query: (workExperienceData) => ({
        url: "/work-experience",
        method: "POST",
        body: workExperienceData,
      }),
      invalidatesTags: (_result, _error, arg) => [
        "WorkExperience",
        "Candidate",
        { type: "Candidate", id: arg.candidateId },
      ],
    }),
    updateWorkExperience: builder.mutation<
      WorkExperience,
      UpdateWorkExperienceRequest
    >({
      query: ({ id, ...workExperienceData }) => ({
        url: `/work-experience/${id}`,
        method: "PATCH",
        body: workExperienceData,
      }),
      invalidatesTags: ["WorkExperience", "Candidate"],
    }),
    deleteWorkExperience: builder.mutation<void, string>({
      query: (id) => ({
        url: `/work-experience/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["WorkExperience", "Candidate"],
    }),

    // Candidate Qualifications endpoints
    getCandidateQualifications: builder.query<
      CandidateQualification[],
      string | void
    >({
      query: (candidateId) =>
        candidateId
          ? `/candidate-qualifications/candidate/${candidateId}`
          : "/candidate-qualifications",
      providesTags: ["CandidateQualification"],
    }),
    createCandidateQualification: builder.mutation<
      CandidateQualification,
      CreateCandidateQualificationRequest
    >({
      query: (qualificationData) => ({
        url: "/candidate-qualifications",
        method: "POST",
        body: qualificationData,
      }),
      invalidatesTags: ["CandidateQualification", "Candidate"],
    }),
    updateCandidateQualification: builder.mutation<
      CandidateQualification,
      UpdateCandidateQualificationRequest
    >({
      query: ({ id, ...qualificationData }) => ({
        url: `/candidate-qualifications/${id}`,
        method: "PATCH",
        body: qualificationData,
      }),
      invalidatesTags: ["CandidateQualification", "Candidate"],
    }),
    deleteCandidateQualification: builder.mutation<void, string>({
      query: (id) => ({
        url: `/candidate-qualifications/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["CandidateQualification", "Candidate"],
    }),

    // Document endpoints
    getDocuments: builder.query<
      {
        success: boolean;
        data: {
          documents: Document[];
          pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
          };
        };
      },
      {
        candidateId?: string;
        page?: number;
        limit?: number;
        docType?: string;
        search?: string;
        status?: string;
        uploadedBy?: string;
        roleCatalogId?: string;
      } | void
    >({
      query: (params) => ({
        url: "/documents",
        params,
      }),
      providesTags: ["Document"],
    }),

    getOfferLetterUploadRequests: builder.query<
      {
        success: boolean;
        data: Array<{
          candidateProjectMapId: string;
          projectId: string;
          roleCatalogId: string | null;
          reason: string;
          requestedAt: string;
          requestedBy: string;
        }>;
      },
      string
    >({
      query: (candidateId) => ({
        url: `/documents/candidates/${candidateId}/offer-letter-upload-requests`,
      }),
      providesTags: (_result, _error, candidateId) => [
        { type: "Document", id: `offer-letter-requests-${candidateId}` },
        { type: "Candidate", id: candidateId },
      ],
    }),
    uploadDocument: builder.mutation<
      { success: boolean; data: Document; message?: string },
      UploadDocumentRequest
    >({
      query: ({ candidateId, formData }) => ({
        url: `/upload/document/${candidateId}`,
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Document", "Candidate"],
    }),

    /** Batch upload for work experience certificates (multiple files, one docName). */
    uploadWorkExperienceDocuments: builder.mutation<
      {
        success: boolean;
        data: { documents: Document[]; failedFileNames: string[] };
        message: string;
      },
      {
        candidateId: string;
        workExperienceId: string;
        docType: string;
        docName?: string;
        files: File[];
      }
    >({
      query: ({ candidateId, workExperienceId, docType, docName, files }) => {
        const formData = new FormData();
        formData.append("docType", docType);
        formData.append("workExperienceId", workExperienceId);
        if (docName?.trim()) {
          formData.append("docName", docName.trim());
        }
        for (const file of files) {
          formData.append("files", file);
        }
        return {
          url: `/upload/work-experience-documents/${candidateId}`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["Document", "Candidate"],
    }),

    // Status update endpoints
    updateCandidateStatus: builder.mutation<
      { success: boolean; data: Candidate; message: string },
      { candidateId: string; status: UpdateCandidateStatusRequest }
    >({
      query: ({ candidateId, status }) => ({
        url: `/candidates/${candidateId}/status`,
        method: "PATCH",
        body: status,
      }),
      invalidatesTags: (_, __, { candidateId }) => [
        { type: "Candidate", id: candidateId },
        "Candidate",
      ],
    }),

    // Recruiter assignment endpoints
    assignRecruiter: builder.mutation<
      { success: boolean; data: RecruiterAssignment; message: string },
      { candidateId: string; assignment: AssignRecruiterRequest }
    >({
      query: ({ candidateId, assignment }) => ({
        url: `/candidates/${candidateId}/assign-recruiter`,
        method: "POST",
        body: assignment,
      }),
      invalidatesTags: (_, __, { candidateId }) => [
        { type: "Candidate", id: candidateId },
        "Candidate",
      ],
    }),

    getCurrentRecruiterAssignment: builder.query<
      { success: boolean; data: RecruiterAssignment; message: string },
      string
    >({
      query: (candidateId) => `/candidates/${candidateId}/recruiter-assignment`,
      providesTags: (_, __, candidateId) => [
        { type: "RecruiterAssignment", id: candidateId },
      ],
    }),

    getRecruiterAssignmentHistory: builder.query<
      { success: boolean; data: RecruiterAssignment[]; message: string },
      string
    >({
      query: (candidateId) =>
        `/candidates/${candidateId}/recruiter-assignment-history`,
      providesTags: (_, __, candidateId) => [
        { type: "RecruiterAssignment", id: candidateId },
      ],
    }),

    // Get recruiter's assigned candidates
    getRecruiterMyCandidates: builder.query<
      RecruiterMyCandidatesResponse,
      GetRecruiterMyCandidatesParams | void
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params) {
          appendCandidateListQueryParams(queryParams, params);
        }

        const queryString = queryParams.toString();
        return queryString
          ? `/candidates/recruiter/my-candidates?${queryString}`
          : "/candidates/recruiter/my-candidates";
      },
      transformResponse: (response: RecruiterMyCandidatesResponse) => ({
        ...response,
        data: (response.data ?? []).map((row) => ({
          ...row,
          passportNumber:
            row.passportNumber ??
            (row as { passport_number?: string | null }).passport_number ??
            null,
        })),
      }),
      providesTags: ["Candidate"],
    }),

    // Get consolidated candidates for project detail view
    getConsolidatedCandidates: builder.query<
      ConsolidatedCandidatesResponse,
      {
        projectId: string;
        search?: string;
        roleCatalogId?: string;
        page?: number;
        limit?: number;
      }
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        queryParams.append("projectId", params.projectId);
        if (params.search) queryParams.append("search", params.search);
        if (params.roleCatalogId)
          queryParams.append("roleCatalogId", params.roleCatalogId);
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.limit) queryParams.append("limit", params.limit.toString());

        return `/candidates/project/consolidated?${queryParams.toString()}`;
      },
      providesTags: (_, __, { projectId }) => [
        "Candidate",
        { type: "Project", id: projectId },
      ],
    }),

    // Status configuration
    getStatusConfig: builder.query<
      { success: boolean; data: any; message: string },
      { mainStage?: string } | void
    >({
      query: (params) => {
        if (params && params.mainStage) {
          return `/candidate-project-status/sub-status/${params.mainStage}`;
        }
        return "/candidates/status-config";
      },
      providesTags: ["StatusConfig"],
    }),

    // Transfer candidate to another recruiter
    transferCandidate: builder.mutation<
      { success: boolean; message: string; data?: any },
      { candidateId: string; targetRecruiterId: string; reason: string }
    >({
      query: ({ candidateId, targetRecruiterId, reason }) => ({
        url: `/candidates/${candidateId}/transfer-candidate`,
        method: "POST",
        body: { targetRecruiterId, reason },
      }),
      invalidatesTags: ["Candidate", "RecruiterPerformanceRating", "AdminDashboard"],
    }),

    // Bulk transfer candidates to another recruiter
    bulkTransferCandidates: builder.mutation<
      { success: boolean; message: string; data?: { transferred: number; skipped: string[] } },
      { candidateIds: string[]; targetRecruiterId: string; reason: string }
    >({
      query: (body) => ({
        url: `/candidates/bulk-transfer`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Candidate", "RecruiterPerformanceRating", "AdminDashboard"],
    }),

    // Transfer candidate back
    transferBackCandidate: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/candidates/${id}/transfer-back`,
        method: "POST",
      }),
      invalidatesTags: (_, __, id) => [{ type: "Candidate", id }, "Candidate"],
    }),

    getCandidateProjects: builder.query<
      CandidateProjectsResponse,
      {
        candidateId?: string;
        projectId?: string;
        recruiterId?: string;
        statusId?: string | number;
        search?: string;
        page?: number;
        limit?: number;
      }
    >({
      query: (params) => ({
        url: "/candidate-projects",
        params,
      }),
      providesTags: (_result, _error, params) => {
        if (params.candidateId) {
          return [
            { type: "Candidate" as const },
            { type: "Candidate" as const, id: params.candidateId },
          ];
        }
        return [{ type: "Candidate" as const }];
      },
    }),

    getCandidateProjectsWorkflowDetails: builder.query<any, { candidateId: string; subStatus?: string; search?: string; page?: number; limit?: number }>({
      query: ({ candidateId, ...params }) => ({
        url: `candidates/${candidateId}/projects-workflow-details`,
        params,
      }),
      providesTags: (_, __, { candidateId }) => [{ type: "Candidate", id: `PROJECT-WORKFLOW-${candidateId}` }],
    }),
    getCandidateDocumentationWorkflow: builder.query<any, { candidateId: string; subStatus?: string; search?: string; page?: number; limit?: number }>({
      query: ({ candidateId, ...params }) => ({
        url: `candidates/${candidateId}/documentation-workflow`,
        params,
      }),
      providesTags: (_, __, { candidateId }) => [{ type: "Candidate", id: `DOC-WORKFLOW-${candidateId}` }],
    }),
    getCandidateInterviewWorkflow: builder.query<any, { candidateId: string; subStatus?: string; search?: string; page?: number; limit?: number }>({
      query: ({ candidateId, ...params }) => ({
        url: `candidates/${candidateId}/interview-workflow`,
        params,
      }),
      providesTags: (_, __, { candidateId }) => [{ type: "Candidate", id: `INTERVIEW-WORKFLOW-${candidateId}` }],
    }),
    getCandidateScreeningWorkflow: builder.query<any, { candidateId: string; subStatus?: string; search?: string; page?: number; limit?: number }>({
      query: ({ candidateId, ...params }) => ({
        url: `candidates/${candidateId}/screening-workflow`,
        params,
      }),
      providesTags: (_, __, { candidateId }) => [{ type: "Candidate", id: `SCREENING-WORKFLOW-${candidateId}` }],
    }),
    getCandidateProcessingWorkflow: builder.query<any, { candidateId: string; subStatus?: string; step?: string; search?: string; page?: number; limit?: number }>({
      query: ({ candidateId, ...params }) => ({
        url: `candidates/${candidateId}/processing-workflow`,
        params,
      }),
      providesTags: (_, __, { candidateId }) => [{ type: "Candidate", id: `PROCESSING-WORKFLOW-${candidateId}` }],
    }),
  }),
});

export const {
  useGetCandidateOverviewStatsQuery,
  useGetCandidateOverviewQuery,
  useGetCandidatesQuery,
  useGetCandidateByIdQuery,
  useLookupCandidateByPassportQuery,
  useCreateCandidateMutation,
  useUpdateCandidateMutation,
  useDeleteCandidateMutation,
  useAssignToProjectMutation,
  useNominateCandidateMutation,
  useApproveOrRejectCandidateMutation,
  useGetEligibleCandidatesQuery,
  useGetWorkExperiencesQuery,
  useCreateWorkExperienceMutation,
  useUpdateWorkExperienceMutation,
  useDeleteWorkExperienceMutation,
  useGetCandidateQualificationsQuery,
  useCreateCandidateQualificationMutation,
  useUpdateCandidateQualificationMutation,
  useDeleteCandidateQualificationMutation,
  useGetDocumentsQuery,
  useGetOfferLetterUploadRequestsQuery,
  useUploadDocumentMutation,
  useUploadWorkExperienceDocumentsMutation,
  useUpdateCandidateStatusMutation,
  useAssignRecruiterMutation,
  useGetCurrentRecruiterAssignmentQuery,
  useGetRecruiterAssignmentHistoryQuery,
  useGetRecruiterMyCandidatesQuery,
  useGetConsolidatedCandidatesQuery,
  useGetStatusConfigQuery,
  useGetCandidateProjectPipelineQuery,
  useCreateCandidateProjectStatusChangeRequestMutation,
  useGetCandidateProjectStatusChangeRequestHistoryQuery,
  useApproveCandidateProjectStatusChangeRequestMutation,
  useRejectCandidateProjectStatusChangeRequestMutation,
  useGetCandidateCountryRestrictionsQuery,
  useLiftCandidateCountryRestrictionMutation,
  useTransferCandidateMutation,
  useBulkTransferCandidatesMutation,
  useTransferBackCandidateMutation,
  useGetOriginalRecruiterQuery,
  useGetCandidateProjectsQuery,
  useGetCandidateProjectsWorkflowDetailsQuery,
  useGetCandidateDocumentationWorkflowQuery,
  useGetCandidateInterviewWorkflowQuery,
  useGetCandidateScreeningWorkflowQuery,
  useGetCandidateProcessingWorkflowQuery,
  useGetProfessionTypesQuery,
} = candidatesApi;
