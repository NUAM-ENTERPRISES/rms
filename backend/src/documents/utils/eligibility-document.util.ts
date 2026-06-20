import { BadRequestException } from '@nestjs/common';
import { DOCUMENT_TYPE } from '../../common/constants';

export interface EligibilityDocumentFields {
  documentNumber?: string | null;
  issuedAt?: string | Date | null;
  expiryDate?: string | Date | null;
}

export function isEligibilityLetterType(docType: string): boolean {
  return docType === DOCUMENT_TYPE.ELIGIBILITY_LETTER;
}

export function validateEligibilityDocumentFields(
  docType: string,
  fields: EligibilityDocumentFields,
): void {
  if (!isEligibilityLetterType(docType)) {
    return;
  }

  const documentNumber = fields.documentNumber?.toString().trim();
  if (!documentNumber) {
    throw new BadRequestException(
      'Eligibility number is required for eligibility letter documents',
    );
  }

  if (!fields.issuedAt) {
    throw new BadRequestException(
      'Issued date is required for eligibility letter documents',
    );
  }

  if (!fields.expiryDate) {
    throw new BadRequestException(
      'Expiry date is required for eligibility letter documents',
    );
  }

  const issued =
    fields.issuedAt instanceof Date
      ? fields.issuedAt
      : new Date(fields.issuedAt);
  const expiry =
    fields.expiryDate instanceof Date
      ? fields.expiryDate
      : new Date(fields.expiryDate);

  if (Number.isNaN(issued.getTime())) {
    throw new BadRequestException('Invalid eligibility issued date');
  }

  if (Number.isNaN(expiry.getTime())) {
    throw new BadRequestException('Invalid eligibility expiry date');
  }

  const issuedDay = new Date(issued);
  issuedDay.setHours(0, 0, 0, 0);
  const expiryDay = new Date(expiry);
  expiryDay.setHours(0, 0, 0, 0);

  if (expiryDay <= issuedDay) {
    throw new BadRequestException(
      'Eligibility expiry date must be after the issued date',
    );
  }
}
