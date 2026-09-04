import { QualificationLevel } from '@prisma/client';

/**
 * Reviewable qualifications, work experiences, resume role and identity
 * lifted from a merged PDF. Stored as JSON on
 * CandidateDocumentBundle.profileSuggestions until apply.
 */
export interface ProposedQualificationCatalog {
  name: string;
  level: QualificationLevel | string;
  field: string;
  shortName?: string;
}

export interface BundleQualificationSuggestion {
  /** Stable temp id for the review UI (not a DB id). */
  id: string;
  rawLabel: string;
  qualificationId: string | null;
  qualificationLabel?: string | null;
  proposedNew?: ProposedQualificationCatalog | null;
  university?: string | null;
  graduationYear?: number | null;
  notes?: string | null;
  included: boolean;
}

export interface ProposedDepartmentCatalog {
  name: string;
}

export interface ProposedRoleCatalog {
  label: string;
  roleDepartmentId?: string;
}

export interface BundleWorkExperienceSuggestion {
  id: string;
  departmentRaw: string;
  jobTitleRaw: string;
  roleDepartmentId: string | null;
  roleDepartmentLabel?: string | null;
  roleCatalogId: string | null;
  roleCatalogLabel?: string | null;
  proposedDepartment?: ProposedDepartmentCatalog | null;
  proposedRole?: ProposedRoleCatalog | null;
  companyName?: string | null;
  /** ISO date YYYY-MM-DD */
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  /** Experience-certificate segment ids to attach after WorkExperience create. */
  linkedSegmentIds: string[];
  notes?: string | null;
  included: boolean;
}

/** Department + role the resume document should be filed under. */
export interface BundleResumeRoleSuggestion {
  departmentId: string | null;
  roleCatalogId: string | null;
  departmentLabel?: string | null;
  roleLabel?: string | null;
  proposedDepartment?: ProposedDepartmentCatalog | null;
  proposedRole?: ProposedRoleCatalog | null;
  docName?: string | null;
}

/** Identity fields extracted from resume / passport / Aadhaar. */
export interface BundleIdentitySuggestion {
  dateOfBirth?: string | null;
  email?: string | null;
  passportNumber?: string | null;
  /** ISO YYYY-MM-DD from the passport bio page. */
  passportExpiry?: string | null;
  /**
   * When true, apply overwrites existing profile values with the reviewed
   * ones. When false, only empty profile fields are filled.
   */
  identityEdited?: boolean;
}

export interface BundleProfileSuggestions {
  qualifications: BundleQualificationSuggestion[];
  workExperiences: BundleWorkExperienceSuggestion[];
  resumeRole?: BundleResumeRoleSuggestion | null;
  identity?: BundleIdentitySuggestion | null;
}

export function emptyProfileSuggestions(): BundleProfileSuggestions {
  return {
    qualifications: [],
    workExperiences: [],
    resumeRole: null,
    identity: null,
  };
}
