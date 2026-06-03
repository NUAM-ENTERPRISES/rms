import { Prisma, PrismaClient } from '@prisma/client';
import {
  isPassportDocumentType,
  PASSPORT_DOCUMENT_TYPES,
} from '../../common/constants/document-types';

export function normalizePassportNumber(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const trimmed = value.toString().trim().replace(/\s+/g, ' ');
  return trimmed.length > 0 ? trimmed : null;
}

export function passportNumbersMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizePassportNumber(a);
  const nb = normalizePassportNumber(b);
  if (!na || !nb) return false;
  return na.toLowerCase() === nb.toLowerCase();
}

const candidateSummarySelect = {
  id: true,
  candidateCode: true,
  firstName: true,
  lastName: true,
  email: true,
  countryCode: true,
  mobileNumber: true,
} as const;

export type PassportLookupCandidate = Prisma.CandidateGetPayload<{
  select: typeof candidateSummarySelect;
}>;

export function resolvePassportNumberForCandidate(candidate: {
  passportNumber?: string | null;
  documents?: Array<{ docType?: string; documentNumber?: string | null }>;
}): string | null {
  const fromField = normalizePassportNumber(candidate.passportNumber);
  if (fromField) return fromField;

  for (const doc of candidate.documents ?? []) {
    if (
      !doc.docType ||
      !(PASSPORT_DOCUMENT_TYPES as readonly string[]).includes(doc.docType)
    ) {
      continue;
    }
    const fromDoc = normalizePassportNumber(doc.documentNumber);
    if (fromDoc) return fromDoc;
  }

  return null;
}

/** Copy passport document number onto Candidate.passportNumber when present. */
export async function syncCandidatePassportNumberFromDocument(
  db: PrismaClient | Prisma.TransactionClient,
  candidateId: string,
  docType: string,
  documentNumber?: string | null,
): Promise<void> {
  if (!isPassportDocumentType(docType)) return;
  const normalized = normalizePassportNumber(documentNumber);
  if (!normalized) return;

  await db.candidate.update({
    where: { id: candidateId },
    data: { passportNumber: normalized },
  });
}

export async function findExistingCandidateByPassport(
  db: PrismaClient | Prisma.TransactionClient,
  passportNumber: string,
  excludeCandidateId?: string,
): Promise<PassportLookupCandidate | null> {
  const normalized = normalizePassportNumber(passportNumber);
  if (!normalized || normalized.length < 3) {
    return null;
  }

  const byCandidateField = await db.candidate.findFirst({
    where: {
      passportNumber: { equals: normalized, mode: 'insensitive' },
      ...(excludeCandidateId ? { id: { not: excludeCandidateId } } : {}),
    },
    select: candidateSummarySelect,
  });
  if (byCandidateField) {
    return byCandidateField;
  }

  const doc = await db.document.findFirst({
    where: {
      isDeleted: false,
      docType: { in: [...PASSPORT_DOCUMENT_TYPES] },
      documentNumber: { equals: normalized, mode: 'insensitive' },
      ...(excludeCandidateId
        ? { candidateId: { not: excludeCandidateId } }
        : {}),
    },
    select: {
      candidate: { select: candidateSummarySelect },
    },
  });

  return doc?.candidate ?? null;
}
