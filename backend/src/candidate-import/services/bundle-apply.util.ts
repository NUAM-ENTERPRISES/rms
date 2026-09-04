import { DOCUMENT_TYPE } from '../../common/constants/document-types';
import { isSaveableBundleDocType } from './merged-pdf-classifier.service';
import { BundleIdentitySuggestion } from '../types/bundle-profile-suggestions';

export const PASSPORT_PHOTO_MAX_BYTES = 1024 * 1024;

export function isPassportPhotoType(docType: string): boolean {
  return docType === DOCUMENT_TYPE.PASSPORT_PHOTO;
}

export function filterConfirmedSaveableSegments<
  T extends { status: string; docType: string },
>(segments: T[], confirmedStatus: string): T[] {
  return segments.filter(
    (segment) =>
      segment.status === confirmedStatus &&
      isSaveableBundleDocType(segment.docType),
  );
}

const SKIPPED_APPLY_STATUSES = new Set(['rejected', 'applied']);

/** Keep a passport expiry only when DocumentsService will accept it. */
export function usablePassportExpiry(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const expiry = new Date(trimmed);
  if (Number.isNaN(expiry.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryDay = new Date(expiry);
  expiryDay.setHours(0, 0, 0, 0);
  if (expiryDay < today) return null;

  return trimmed;
}

/**
 * Documents the reviewer did not Skip. Suggested rows are included so Save
 * still writes degree / photo / passport when the recruiter jumped steps
 * without pressing Next on each one.
 */
export function filterApplyableSaveableSegments<
  T extends { status: string; docType: string },
>(segments: T[]): T[] {
  return segments.filter(
    (segment) =>
      !SKIPPED_APPLY_STATUSES.has(segment.status) &&
      isSaveableBundleDocType(segment.docType),
  );
}

export function identityProfileUpdate(
  current: {
    dateOfBirth: Date | null;
    email: string | null;
    passportNumber: string | null;
  },
  identity: BundleIdentitySuggestion | null | undefined,
): {
  dateOfBirth?: Date;
  email?: string;
  passportNumber?: string;
} {
  if (!identity) return {};

  const edited = Boolean(identity.identityEdited);
  const data: {
    dateOfBirth?: Date;
    email?: string;
    passportNumber?: string;
  } = {};

  if (
    identity.dateOfBirth &&
    (edited || !current.dateOfBirth) &&
    /^\d{4}-\d{2}-\d{2}$/.test(identity.dateOfBirth)
  ) {
    data.dateOfBirth = new Date(`${identity.dateOfBirth}T00:00:00.000Z`);
  }

  if (identity.email && (edited || !current.email)) {
    data.email = identity.email.trim();
  }

  if (identity.passportNumber && (edited || !current.passportNumber)) {
    data.passportNumber = identity.passportNumber.trim();
  }

  return data;
}

export function hasResumeRole(role: {
  departmentId?: string | null;
  roleCatalogId?: string | null;
  proposedDepartment?: { name?: string | null } | null;
  proposedRole?: { label?: string | null } | null;
} | null | undefined): boolean {
  if (!role) return false;
  const hasDepartment =
    Boolean(role.departmentId) ||
    Boolean(role.proposedDepartment?.name?.trim());
  const hasRole =
    Boolean(role.roleCatalogId) || Boolean(role.proposedRole?.label?.trim());
  return hasDepartment && hasRole;
}
