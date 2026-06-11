import {
  calculateExperienceYearsByCountries,
  calculateTotalExperienceYears,
  GCC_COUNTRY_CODES,
  INDIA_COUNTRY_CODE,
  WorkExperienceInput,
} from '../../candidates/utils/employment-timeline.util';
import {
  DOCUMENT_TYPE,
  PASSPORT_DOCUMENT_TYPES,
} from '../../common/constants';

export interface BulkSendCsvProfile {
  candidateProjectMapId: string;
  fullName: string;
  passportNumber: string;
  qualifications: string;
  department: string;
  totalYearsExperience: string;
  dataFlow: string;
  prometric: string;
  recruiterName: string;
  nationality: string;
  gender: string;
  yearOfGraduation: string;
  gccExperience: string;
  indianExperience: string;
  dob: string;
  age: string;
  height: string;
  weight: string;
  religion: string;
  saudiLicense: string;
  scfhsIssueDate: string;
  scfhsExpiryDate: string;
  eligibilityNumber: string;
  eligibilityExpiryDate: string;
  currentLocation: string;
  contactNumber: string;
  emailId: string;
  mumarisId: string;
  mumarisPassword: string;
}

const SCFHS_DOC_TYPES = new Set([
  DOCUMENT_TYPE.SCFHS,
  DOCUMENT_TYPE.SAUDI_PROMETRIC,
  DOCUMENT_TYPE.MEDICAL_LICENSE,
]);

const PROMETRIC_DOC_TYPES = new Set([
  DOCUMENT_TYPE.PROMETRIC,
  DOCUMENT_TYPE.SAUDI_PROMETRIC,
  DOCUMENT_TYPE.MOH_PROMETRIC,
  DOCUMENT_TYPE.QCHP_PROMETRIC,
  DOCUMENT_TYPE.PROMETRIC_RESULT,
]);

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function computeAge(dateOfBirth: Date | string | null | undefined): string {
  if (!dateOfBirth) return '';
  const birth = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age > 0 ? String(age) : '';
}

function findDocumentByTypes(
  documents: Array<{
    docType: string;
    documentNumber?: string | null;
    expiryDate?: Date | string | null;
    verifiedAt?: Date | string | null;
    createdAt?: Date | string | null;
    status?: string | null;
  }> | undefined,
  types: Set<string>,
) {
  if (!documents?.length) return undefined;
  return documents.find((doc) => types.has(doc.docType));
}

function findProcessingStep(
  processingTasks: Array<{
    processingSteps?: Array<{
      template?: { key?: string | null } | null;
      eligibilityNumber?: string | null;
      eligibilityValidAt?: Date | string | null;
      prometricPassedAt?: Date | string | null;
      prometricValidAt?: Date | string | null;
      councilIssuedAt?: Date | string | null;
      councilValidAt?: Date | string | null;
      status?: string | null;
    }>;
  }> | undefined,
  templateKey: string,
) {
  for (const task of processingTasks ?? []) {
    const step = task.processingSteps?.find(
      (item) => item.template?.key === templateKey,
    );
    if (step) return step;
  }
  return undefined;
}

function formatQualifications(
  qualifications: Array<{
    qualification?: { name?: string | null; shortName?: string | null } | null;
    university?: string | null;
  }> | undefined,
): string {
  if (!qualifications?.length) return '';
  const labels = qualifications
    .map((item) => {
      const name =
        item.qualification?.shortName ||
        item.qualification?.name ||
        item.university ||
        '';
      return String(name).trim();
    })
    .filter(Boolean);
  return [...new Set(labels)].join(', ');
}

function formatExperienceYears(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '';
  return String(value);
}

function formatBooleanFlag(value: boolean | null | undefined): string {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return '';
}

function formatContactNumber(
  countryCode: string | null | undefined,
  mobileNumber: string | null | undefined,
): string {
  const phone = String(mobileNumber ?? '').trim();
  if (!phone) return '';
  const code = String(countryCode ?? '').trim();
  return code ? `${code} ${phone}` : phone;
}

function formatCurrentLocation(candidate: {
  address?: string | null;
  addressState?: { name?: string | null } | null;
  addressCountry?: { name?: string | null } | null;
}): string {
  const parts = [
    candidate.address?.trim(),
    candidate.addressState?.name?.trim(),
    candidate.addressCountry?.name?.trim(),
  ].filter(Boolean);
  return parts.join(', ');
}

function resolvePassportNumber(
  passportNumber: string | null | undefined,
  documents: Array<{ docType: string; documentNumber?: string | null }> | undefined,
): string {
  if (passportNumber?.trim()) return passportNumber.trim();
  const passportDoc = documents?.find((doc) =>
    (PASSPORT_DOCUMENT_TYPES as readonly string[]).includes(doc.docType),
  );
  return passportDoc?.documentNumber?.trim() ?? '';
}

function resolvePrometric(
  licensingExam: string | null | undefined,
  documents: Array<{ docType: string; status?: string | null }> | undefined,
  prometricStep:
    | {
        prometricPassedAt?: Date | string | null;
        prometricValidAt?: Date | string | null;
        status?: string | null;
      }
    | undefined,
): string {
  if (licensingExam?.trim()) return licensingExam.trim();
  if (prometricStep?.prometricPassedAt) {
    return `Passed ${formatDate(prometricStep.prometricPassedAt)}`;
  }
  if (prometricStep?.status === 'completed') return 'Completed';
  const prometricDoc = findDocumentByTypes(documents, PROMETRIC_DOC_TYPES);
  if (prometricDoc?.status === 'verified') return 'Verified';
  return '';
}

function resolveTotalYearsExperience(
  totalExperience: number | null | undefined,
  experience: number | null | undefined,
  workExperiences: WorkExperienceInput[],
): string {
  if (totalExperience != null) return String(totalExperience);
  if (experience != null) return String(experience);
  const computed = calculateTotalExperienceYears(workExperiences);
  return computed > 0 ? String(computed) : '';
}

export function mapCandidateProjectToBulkSendCsvProfile(
  cp: {
    id: string;
    projectId?: string;
    candidate: {
      firstName: string;
      lastName: string;
      passportNumber?: string | null;
      gender?: string | null;
      dateOfBirth?: Date | string | null;
      height?: number | null;
      weight?: number | null;
      dataFlow?: boolean | null;
      licensingExam?: string | null;
      totalExperience?: number | null;
      experience?: number | null;
      graduationYear?: number | null;
      email?: string | null;
      mobileNumber?: string | null;
      countryCode?: string | null;
      address?: string | null;
      addressState?: { name?: string | null } | null;
      addressCountry?: { name?: string | null } | null;
      qualifications?: Array<{
        qualification?: { name?: string | null; shortName?: string | null } | null;
        university?: string | null;
      }>;
      workExperiences?: WorkExperienceInput[];
      documents?: Array<{
        docType: string;
        documentNumber?: string | null;
        expiryDate?: Date | string | null;
        verifiedAt?: Date | string | null;
        createdAt?: Date | string | null;
        status?: string | null;
        isDeleted?: boolean;
      }>;
      processingTasks?: Array<{
        projectId?: string;
        processingSteps?: Array<{
          template?: { key?: string | null } | null;
          eligibilityNumber?: string | null;
          eligibilityValidAt?: Date | string | null;
          prometricPassedAt?: Date | string | null;
          prometricValidAt?: Date | string | null;
          councilIssuedAt?: Date | string | null;
          councilValidAt?: Date | string | null;
          status?: string | null;
        }>;
      }>;
    };
    recruiter?: { name?: string | null } | null;
    roleNeeded?: {
      roleCatalog?: {
        roleDepartment?: { label?: string | null; name?: string | null } | null;
      } | null;
    } | null;
  },
): BulkSendCsvProfile {
  const candidate = cp.candidate;
  const documents = (candidate.documents ?? []).filter((doc) => !doc.isDeleted);
  const workExperiences = candidate.workExperiences ?? [];
  const scfhsDoc = findDocumentByTypes(documents, SCFHS_DOC_TYPES);
  const projectProcessingTasks = (candidate.processingTasks ?? []).filter(
    (task) => !cp.projectId || task.projectId === cp.projectId,
  );
  const eligibilityStep = findProcessingStep(
    projectProcessingTasks,
    'eligibility',
  );
  const prometricStep = findProcessingStep(projectProcessingTasks, 'prometric');
  const councilStep = findProcessingStep(
    projectProcessingTasks,
    'council_registration',
  );

  return {
    candidateProjectMapId: cp.id,
    fullName: `${candidate.firstName} ${candidate.lastName}`.trim(),
    passportNumber: resolvePassportNumber(candidate.passportNumber, documents),
    qualifications: formatQualifications(candidate.qualifications),
    department:
      cp.roleNeeded?.roleCatalog?.roleDepartment?.label ||
      cp.roleNeeded?.roleCatalog?.roleDepartment?.name ||
      '',
    totalYearsExperience: resolveTotalYearsExperience(
      candidate.totalExperience,
      candidate.experience,
      workExperiences,
    ),
    dataFlow: formatBooleanFlag(candidate.dataFlow),
    prometric: resolvePrometric(
      candidate.licensingExam,
      documents,
      prometricStep,
    ),
    recruiterName: cp.recruiter?.name?.trim() ?? '',
    nationality: '',
    gender: candidate.gender ? String(candidate.gender) : '',
    yearOfGraduation:
      candidate.graduationYear != null ? String(candidate.graduationYear) : '',
    gccExperience: formatExperienceYears(
      calculateExperienceYearsByCountries(workExperiences, GCC_COUNTRY_CODES),
    ),
    indianExperience: formatExperienceYears(
      calculateExperienceYearsByCountries(workExperiences, [INDIA_COUNTRY_CODE]),
    ),
    dob: formatDate(candidate.dateOfBirth),
    age: computeAge(candidate.dateOfBirth),
    height: candidate.height != null ? String(candidate.height) : '',
    weight: candidate.weight != null ? String(candidate.weight) : '',
    religion: '',
    saudiLicense: scfhsDoc?.documentNumber?.trim() ?? '',
    scfhsIssueDate:
      formatDate(scfhsDoc?.verifiedAt) ||
      formatDate(scfhsDoc?.createdAt) ||
      formatDate(councilStep?.councilIssuedAt),
    scfhsExpiryDate:
      formatDate(scfhsDoc?.expiryDate) ||
      formatDate(councilStep?.councilValidAt),
    eligibilityNumber: eligibilityStep?.eligibilityNumber?.trim() ?? '',
    eligibilityExpiryDate: formatDate(eligibilityStep?.eligibilityValidAt),
    currentLocation: formatCurrentLocation(candidate),
    contactNumber: formatContactNumber(
      candidate.countryCode,
      candidate.mobileNumber,
    ),
    emailId: candidate.email?.trim() ?? '',
    mumarisId: '',
    mumarisPassword: '',
  };
}
