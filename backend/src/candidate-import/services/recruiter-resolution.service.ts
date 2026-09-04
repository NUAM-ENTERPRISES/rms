import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { normalizePersonName } from '../utils/excel-parser.util';

export interface RecruiterRef {
  id: string;
  name: string;
  email: string;
}

export interface SheetOwnerSuggestion {
  sheetName: string;
  recruiterId: string | null;
  /** "exact" when the tab was matched confidently, "ambiguous" when several
   * recruiters matched equally well, "none" when nothing matched. */
  match: 'exact' | 'ambiguous' | 'none';
  candidates: RecruiterRef[];
}

/**
 * Tab names in recruiter workbooks are free text, so they are only ever a hint.
 * This resolves them against real RMS recruiters and refuses to guess when the
 * match is ambiguous, leaving the decision to a human in the review step.
 */
@Injectable()
export class RecruiterResolutionService {
  private readonly logger = new Logger(RecruiterResolutionService.name);

  /** Tabs whose label does not resemble the recruiter's RMS account name. */
  private static readonly EMAIL_ALIASES: Record<string, string> = {
    TABASUM: 'tabassum2026@affiniks.com',
    SUVARNA: 'suvarana@affiniks.com',
  };

  constructor(private readonly prisma: PrismaService) {}

  async listRecruiters(): Promise<RecruiterRef[]> {
    return this.prisma.user.findMany({
      where: {
        userRoles: { some: { role: { name: 'Recruiter' } } },
        accountStatus: 'ACTIVE',
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Suggests an owner for every sheet in an upload.
   *
   * When `defaultRecruiterId` is set (a recruiter uploading their own file)
   * every sheet is attributed to them and no name matching happens at all.
   */
  async suggestSheetOwners(
    sheetNames: string[],
    defaultRecruiterId?: string,
  ): Promise<SheetOwnerSuggestion[]> {
    if (defaultRecruiterId) {
      return sheetNames.map((sheetName) => ({
        sheetName,
        recruiterId: defaultRecruiterId,
        match: 'exact' as const,
        candidates: [],
      }));
    }

    const recruiters = await this.listRecruiters();
    return sheetNames.map((sheetName) =>
      this.resolveSheet(sheetName, recruiters),
    );
  }

  resolveSheet(
    sheetName: string,
    recruiters: RecruiterRef[],
  ): SheetOwnerSuggestion {
    const aliasEmail =
      RecruiterResolutionService.EMAIL_ALIASES[sheetName.trim().toUpperCase()];
    if (aliasEmail) {
      const aliased = recruiters.find(
        (recruiter) => recruiter.email.toLowerCase() === aliasEmail,
      );
      if (aliased) {
        return {
          sheetName,
          recruiterId: aliased.id,
          match: 'exact',
          candidates: [aliased],
        };
      }
    }

    const normalizedTab = normalizePersonName(sheetName);
    if (!normalizedTab) {
      return { sheetName, recruiterId: null, match: 'none', candidates: [] };
    }

    const matches = recruiters.filter((recruiter) => {
      const name = normalizePersonName(recruiter.name);
      const emailLocal = normalizePersonName(recruiter.email.split('@')[0]);
      return (
        name.includes(normalizedTab) ||
        normalizedTab.includes(name) ||
        emailLocal.includes(normalizedTab) ||
        normalizedTab.includes(emailLocal)
      );
    });

    if (matches.length === 0) {
      return { sheetName, recruiterId: null, match: 'none', candidates: [] };
    }

    // Prefer the longest identity, then require it to be a strict winner so a
    // tab like "ASIF" cannot silently pick between two similarly named users.
    const ranked = [...matches].sort(
      (left, right) => this.identityLength(right) - this.identityLength(left),
    );
    const bestLength = this.identityLength(ranked[0]);
    const secondLength = ranked[1] ? this.identityLength(ranked[1]) : -1;

    if (ranked.length > 1 && bestLength === secondLength) {
      return {
        sheetName,
        recruiterId: null,
        match: 'ambiguous',
        candidates: ranked.slice(0, 5),
      };
    }

    return {
      sheetName,
      recruiterId: ranked[0].id,
      match: 'exact',
      candidates: [ranked[0]],
    };
  }

  private identityLength(recruiter: RecruiterRef): number {
    return Math.max(
      normalizePersonName(recruiter.name).length,
      normalizePersonName(recruiter.email.split('@')[0]).length,
    );
  }
}
