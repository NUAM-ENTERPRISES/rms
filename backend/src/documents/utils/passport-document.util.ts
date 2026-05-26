import { BadRequestException } from '@nestjs/common';
import { isPassportDocumentType } from '../../common/constants';

export interface PassportDocumentFields {
  documentNumber?: string | null;
  expiryDate?: string | Date | null;
}

export function validatePassportDocumentFields(
  docType: string,
  fields: PassportDocumentFields,
): void {
  if (!isPassportDocumentType(docType)) {
    return;
  }

  const documentNumber = fields.documentNumber?.toString().trim();
  if (!documentNumber) {
    throw new BadRequestException(
      'Passport number is required for passport documents',
    );
  }

  if (!fields.expiryDate) {
    throw new BadRequestException(
      'Passport expiry date is required for passport documents',
    );
  }

  const expiry =
    fields.expiryDate instanceof Date
      ? fields.expiryDate
      : new Date(fields.expiryDate);

  if (Number.isNaN(expiry.getTime())) {
    throw new BadRequestException('Invalid passport expiry date');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryDay = new Date(expiry);
  expiryDay.setHours(0, 0, 0, 0);

  if (expiryDay < today) {
    throw new BadRequestException(
      'Passport expiry date must be in the future',
    );
  }
}
