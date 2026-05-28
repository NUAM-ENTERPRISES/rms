import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../database/prisma.service';

/**
 * Validates optional `countries.code` (catalog country, not phone dial code).
 * Empty string and null are treated as unset.
 */
export async function assertOptionalCountryCode(
  prisma: Pick<PrismaService, 'country'>,
  countryCode: string | null | undefined,
): Promise<void> {
  const normalized =
    countryCode === null || countryCode === undefined
      ? null
      : String(countryCode).trim() || null;

  if (!normalized) {
    return;
  }

  const country = await prisma.country.findUnique({
    where: { code: normalized },
    select: { code: true },
  });

  if (!country) {
    throw new BadRequestException(`Country not found for code: ${normalized}`);
  }
}

/** Normalize API input to DB value: null when cleared, undefined when omitted. */
export function normalizeOptionalCountryCode(
  countryCode: string | null | undefined,
): string | null | undefined {
  if (countryCode === undefined) {
    return undefined;
  }
  if (countryCode === null) {
    return null;
  }
  const trimmed = String(countryCode).trim();
  return trimmed.length > 0 ? trimmed : null;
}
