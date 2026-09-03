import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NormalizedRow } from '../utils/excel-parser.util';
import { ImportIssue } from '../utils/row-validation.util';

export interface DuplicateCandidateRef {
  id: string;
  candidateCode: string | null;
  firstName: string;
  lastName: string | null;
  countryCode: string | null;
  mobileNumber: string | null;
  passportNumber: string | null;
}

export interface RowDuplicateResult {
  issues: ImportIssue[];
  /** The existing candidate this row collides with, when one was found. */
  existingCandidate: DuplicateCandidateRef | null;
}

interface RowToCheck {
  key: string;
  sheetName: string;
  rowNumber: number;
  normalized: NormalizedRow;
}

/**
 * Finds rows that already exist in the CRM, or that repeat inside the upload.
 *
 * Matching is intentionally conservative and only ever keys on identifiers:
 * passport, then country code + mobile, then email. Names are never used to
 * auto-match, because recruiter sheets are full of common names and a false
 * merge is far more expensive than a duplicate a reviewer can spot.
 */
@Injectable()
export class DuplicateDetectionService {
  private readonly logger = new Logger(DuplicateDetectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Checks a whole batch at once. Existing candidates are loaded in three bulk
   * queries rather than per row, so a 30-tab workbook stays a handful of trips.
   */
  async detect(rows: RowToCheck[]): Promise<Map<string, RowDuplicateResult>> {
    const results = new Map<string, RowDuplicateResult>();
    for (const row of rows) {
      results.set(row.key, { issues: [], existingCandidate: null });
    }

    const phoneKeys = new Set<string>();
    const passports = new Set<string>();
    const emails = new Set<string>();

    for (const { normalized } of rows) {
      if (normalized.countryCode && normalized.mobileNumber) {
        phoneKeys.add(`${normalized.countryCode}|${normalized.mobileNumber}`);
      }
      if (normalized.passportNumber) passports.add(normalized.passportNumber);
      if (normalized.email) emails.add(normalized.email);
    }

    const [byPhone, byPassport, byEmail] = await Promise.all([
      this.loadByPhone(phoneKeys),
      this.loadByPassport(passports),
      this.loadByEmail(emails),
    ]);

    // First occurrence wins; later ones are flagged against it.
    const seenPhone = new Map<string, string>();
    const seenPassport = new Map<string, string>();

    for (const row of rows) {
      const result = results.get(row.key)!;
      const { normalized } = row;
      const location = `${row.sheetName}!${row.rowNumber}`;

      const phoneKey =
        normalized.countryCode && normalized.mobileNumber
          ? `${normalized.countryCode}|${normalized.mobileNumber}`
          : null;

      if (phoneKey) {
        const previous = seenPhone.get(phoneKey);
        if (previous) {
          result.issues.push({
            type: 'DUPLICATE_IN_FILE',
            severity: 'error',
            field: 'mobileNumber',
            reference: previous,
            message: `Same mobile number already appears at ${previous} in this upload.`,
          });
        } else {
          seenPhone.set(phoneKey, location);
        }
      }

      if (normalized.passportNumber) {
        const previous = seenPassport.get(normalized.passportNumber);
        if (previous) {
          result.issues.push({
            type: 'DUPLICATE_IN_FILE',
            severity: 'error',
            field: 'passportNumber',
            reference: previous,
            message: `Same passport number already appears at ${previous} in this upload.`,
          });
        } else {
          seenPassport.set(normalized.passportNumber, location);
        }
      }

      const existing =
        (normalized.passportNumber
          ? byPassport.get(normalized.passportNumber)
          : undefined) ??
        (phoneKey ? byPhone.get(phoneKey) : undefined) ??
        (normalized.email ? byEmail.get(normalized.email) : undefined);

      if (existing) {
        result.existingCandidate = existing;
        const label = existing.candidateCode ?? existing.id;
        result.issues.push({
          type: 'DUPLICATE_IN_DATABASE',
          severity: 'error',
          reference: existing.id,
          message: `Already in the CRM as ${existing.firstName} ${existing.lastName ?? ''} (${label}).`.replace(
            /\s+/g,
            ' ',
          ),
        });
      }
    }

    return results;
  }

  private async loadByPhone(
    keys: Set<string>,
  ): Promise<Map<string, DuplicateCandidateRef>> {
    const map = new Map<string, DuplicateCandidateRef>();
    if (keys.size === 0) return map;

    const pairs = [...keys].map((key) => {
      const [countryCode, mobileNumber] = key.split('|');
      return { countryCode, mobileNumber };
    });

    const candidates = await this.prisma.candidate.findMany({
      where: { OR: pairs },
      select: this.selection(),
    });

    for (const candidate of candidates) {
      if (!candidate.countryCode || !candidate.mobileNumber) continue;
      map.set(`${candidate.countryCode}|${candidate.mobileNumber}`, candidate);
    }
    return map;
  }

  private async loadByPassport(
    passports: Set<string>,
  ): Promise<Map<string, DuplicateCandidateRef>> {
    const map = new Map<string, DuplicateCandidateRef>();
    if (passports.size === 0) return map;

    const candidates = await this.prisma.candidate.findMany({
      where: { passportNumber: { in: [...passports] } },
      select: this.selection(),
    });

    for (const candidate of candidates) {
      if (!candidate.passportNumber) continue;
      map.set(candidate.passportNumber, candidate);
    }
    return map;
  }

  private async loadByEmail(
    emails: Set<string>,
  ): Promise<Map<string, DuplicateCandidateRef>> {
    const map = new Map<string, DuplicateCandidateRef>();
    if (emails.size === 0) return map;

    const candidates = await this.prisma.candidate.findMany({
      where: { email: { in: [...emails], mode: 'insensitive' } },
      select: { ...this.selection(), email: true },
    });

    for (const candidate of candidates) {
      const email = (candidate as { email?: string | null }).email;
      if (!email) continue;
      map.set(email.toLowerCase(), candidate);
    }
    return map;
  }

  private selection() {
    return {
      id: true,
      candidateCode: true,
      firstName: true,
      lastName: true,
      countryCode: true,
      mobileNumber: true,
      passportNumber: true,
    } as const;
  }
}
