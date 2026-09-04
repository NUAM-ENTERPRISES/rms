/**
 * Row-level validation shared by the import API and the CLI script.
 *
 * Issues are deliberately data, not exceptions: a bad row must never abort a
 * batch, and every finding has to survive into the review UI.
 */
import { NormalizedRow } from './excel-parser.util';

export type ImportIssueSeverity = 'error' | 'warning';

export type ImportIssueType =
  | 'MISSING_FIRST_NAME'
  | 'MISSING_COUNTRY_CODE'
  | 'INVALID_COUNTRY_CODE'
  | 'MISSING_MOBILE'
  | 'INVALID_MOBILE'
  | 'MISSING_CATEGORY'
  | 'UNKNOWN_CATEGORY'
  | 'MISSING_GENDER'
  | 'INVALID_GENDER'
  | 'OPTIONAL_LAST_NAME'
  | 'MISSING_QUALIFICATION'
  | 'MISSING_DEPARTMENT'
  | 'UNMAPPED_QUALIFICATION'
  | 'UNMAPPED_DEPARTMENT'
  | 'INVALID_EMAIL'
  | 'UNRESOLVED_RECRUITER'
  | 'DUPLICATE_IN_FILE'
  | 'DUPLICATE_IN_DATABASE';

export interface ImportIssue {
  type: ImportIssueType;
  severity: ImportIssueSeverity;
  message: string;
  /** Normalized field key this issue is attached to, when it is field-scoped. */
  field?: string;
  /** For duplicates: the other row or the existing candidate involved. */
  reference?: string;
}

const COUNTRY_CODE_PATTERN = /^\+[1-9]\d{0,3}$/;
const MOBILE_PATTERN = /^\d{6,15}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates a normalized row's intrinsic shape.
 *
 * Catalog mapping and duplicate detection add their own issues later; this
 * only covers what can be judged from the row alone.
 */
export function validateNormalizedRow(row: NormalizedRow): ImportIssue[] {
  const issues: ImportIssue[] = [];

  if (!row.firstName) {
    issues.push({
      type: 'MISSING_FIRST_NAME',
      severity: 'error',
      field: 'firstName',
      message: 'First name is required.',
    });
  }

  if (!row.countryCode) {
    issues.push({
      type: 'MISSING_COUNTRY_CODE',
      severity: 'error',
      field: 'countryCode',
      message: 'Country calling code is required.',
    });
  } else if (!COUNTRY_CODE_PATTERN.test(row.countryCode)) {
    issues.push({
      type: 'INVALID_COUNTRY_CODE',
      severity: 'error',
      field: 'countryCode',
      message: `Invalid country calling code: ${row.countryCode}.`,
    });
  }

  if (!row.mobileNumber) {
    issues.push({
      type: 'MISSING_MOBILE',
      severity: 'error',
      field: 'mobileNumber',
      message: 'Mobile number is required.',
    });
  } else if (!MOBILE_PATTERN.test(row.mobileNumber)) {
    issues.push({
      type: 'INVALID_MOBILE',
      severity: 'error',
      field: 'mobileNumber',
      message: `Mobile must contain 6-15 digits after normalization: ${row.mobileNumber}.`,
    });
  }

  if (!row.category) {
    issues.push({
      type: 'MISSING_CATEGORY',
      severity: 'error',
      field: 'category',
      message: 'Category/profession is required.',
    });
  }

  if (!row.gender) {
    issues.push({
      type: row.category ? 'MISSING_GENDER' : 'MISSING_GENDER',
      severity: 'warning',
      field: 'gender',
      message: 'Gender is missing or unrecognized; set it during review.',
    });
  }

  if (!row.lastName) {
    issues.push({
      type: 'OPTIONAL_LAST_NAME',
      severity: 'warning',
      field: 'lastName',
      message: 'Last name is blank; the candidate will be created without one.',
    });
  }

  if (row.email && !EMAIL_PATTERN.test(row.email)) {
    issues.push({
      type: 'INVALID_EMAIL',
      severity: 'warning',
      field: 'email',
      message: `Email does not look valid and will be dropped: ${row.email}.`,
    });
  }

  return issues;
}

export function hasBlockingIssue(issues: ImportIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'error');
}
