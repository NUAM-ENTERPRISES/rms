import { Prisma, PrismaClient } from '@prisma/client';
import { DOCUMENT_TYPE } from '../../common/constants';

export function normalizeEligibilityNumber(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const trimmed = value.toString().trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Copy eligibility letter document number onto Candidate.eligibilityNumber when present. */
export async function syncCandidateEligibilityNumberFromDocument(
  db: PrismaClient | Prisma.TransactionClient,
  candidateId: string,
  docType: string,
  documentNumber?: string | null,
): Promise<void> {
  if (docType !== DOCUMENT_TYPE.ELIGIBILITY_LETTER) return;
  const normalized = normalizeEligibilityNumber(documentNumber);
  if (!normalized) return;

  await db.candidate.update({
    where: { id: candidateId },
    data: { eligibilityNumber: normalized, eligibility: true },
  });
}

/** Sync candidate eligibility number to the latest eligibility letter document. */
export async function syncEligibilityLetterDocumentNumberFromCandidate(
  db: PrismaClient | Prisma.TransactionClient,
  candidateId: string,
  eligibilityNumber?: string | null,
): Promise<void> {
  const normalized = normalizeEligibilityNumber(eligibilityNumber);
  if (!normalized) return;

  const latestEligibilityLetter = await db.document.findFirst({
    where: {
      candidateId,
      docType: DOCUMENT_TYPE.ELIGIBILITY_LETTER,
      isDeleted: false,
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, documentNumber: true },
  });

  if (!latestEligibilityLetter) return;
  if (latestEligibilityLetter.documentNumber === normalized) return;

  await db.document.update({
    where: { id: latestEligibilityLetter.id },
    data: { documentNumber: normalized },
  });
}
