import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { VertexAiService } from '../../vertex-ai/vertex-ai.service';
import { VertexSchema } from '../../vertex-ai/vertex-ai.types';

/** How a raw sheet value was resolved against the catalogs. */
export type MappingDecision =
  | 'exact'
  | 'alias'
  | 'ai_match'
  | 'ai_new_value'
  | 'needs_review'
  | 'empty';

export interface CatalogOption {
  id: string;
  name: string;
  label: string;
  shortName?: string | null;
}

export interface CatalogMappingResult {
  /** The value exactly as it appeared in the sheet. */
  raw: string;
  decision: MappingDecision;
  /** Resolved catalog row, when one was chosen. */
  matchedId: string | null;
  matchedLabel: string | null;
  /** 0-1. Deterministic matches are 1; AI matches carry the model's own score. */
  confidence: number;
  reason: string;
  /** Alternatives shown in the review UI so a human can override quickly. */
  options: CatalogOption[];
  /** Set when the AI believes nothing in the catalog fits. */
  proposedNewValue?: string;
}

export interface RowCatalogMapping {
  professionType: CatalogMappingResult;
  qualification: CatalogMappingResult;
  /** Department resolved to a RoleCatalog id, since that is what candidates store. */
  role: CatalogMappingResult;
}

interface QualificationRow {
  id: string;
  name: string;
  shortName: string | null;
  aliases: { alias: string }[];
}

interface RoleCatalogRow {
  id: string;
  name: string;
  label: string;
  shortName: string | null;
  roleDepartmentId: string | null;
  professionTypeId: string | null;
  roleDepartment: {
    id: string;
    name: string;
    label: string;
    shortName: string | null;
  } | null;
}

interface ProfessionTypeRow {
  id: string;
  name: string;
  label: string;
}

/** Loaded once per batch so 2000 rows do not become 2000 catalog queries. */
interface CatalogSnapshot {
  qualifications: QualificationRow[];
  roles: RoleCatalogRow[];
  professionTypes: ProfessionTypeRow[];
}

const AI_ACCEPT_THRESHOLD = 0.85;
const SHORTLIST_SIZE = 12;

const MAPPING_SCHEMA: VertexSchema = {
  type: 'OBJECT',
  properties: {
    results: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          raw: { type: 'STRING', description: 'The input value, echoed back.' },
          matchId: {
            type: 'STRING',
            description:
              'id of the best catalog option, or empty string when none fits.',
            nullable: true,
          },
          confidence: {
            type: 'NUMBER',
            description: '0 to 1 confidence that matchId is correct.',
          },
          reason: {
            type: 'STRING',
            description: 'One short sentence explaining the decision.',
          },
          proposedNewValue: {
            type: 'STRING',
            description:
              'Suggested canonical name if and only if nothing in the list fits.',
            nullable: true,
          },
        },
        required: ['raw', 'confidence', 'reason'],
      },
    },
  },
  required: ['results'],
};

const SYSTEM_INSTRUCTION = `You map messy recruitment spreadsheet values onto an existing catalog.

Rules you must follow:
- Prefer an existing option. Only propose a new value when nothing in the list is the same thing.
- Abbreviations and punctuation variants are the SAME thing: "I.C.U" = "ICU", "BSC" = "BSc", "OT" = "Operating Theatre".
- A more specific clinical variant is NOT the same as the general one. "Neuro ICU", "Medical ICU" and "Paediatric ICU" are distinct from plain "ICU". If the catalog has only the general one, return low confidence and explain, rather than silently collapsing them.
- Never invent an id. Use only ids from the provided list.
- Confidence must be below 0.85 whenever a human should look at it.`;

/**
 * Resolves free-text sheet values onto the profession, qualification and role
 * catalogs.
 *
 * Deterministic matching runs first and handles the overwhelming majority of
 * rows. Vertex is only consulted for values that survive that pass, and even
 * then it chooses from a shortlist of real catalog rows rather than inventing
 * names. Results are memoized per distinct value, so a 2000-row workbook with
 * 40 distinct qualifications costs 40 lookups, not 2000.
 */
@Injectable()
export class CatalogMappingService {
  private readonly logger = new Logger(CatalogMappingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vertexAi: VertexAiService,
  ) {}

  async loadSnapshot(): Promise<CatalogSnapshot> {
    const [qualifications, roles, professionTypes] = await Promise.all([
      this.prisma.qualification.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          shortName: true,
          aliases: { select: { alias: true } },
        },
      }),
      this.prisma.roleCatalog.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          label: true,
          shortName: true,
          roleDepartmentId: true,
          professionTypeId: true,
          roleDepartment: {
            select: { id: true, name: true, label: true, shortName: true },
          },
        },
      }),
      this.prisma.professionType.findMany({
        where: { isActive: true },
        select: { id: true, name: true, label: true },
      }),
    ]);

    return { qualifications, roles, professionTypes };
  }

  /**
   * Maps every distinct value in a batch.
   *
   * @param rows One entry per sheet row, carrying only the three raw values.
   * @returns Mapping keyed by the caller's row key.
   */
  async mapBatch(
    rows: Array<{
      key: string;
      category: string;
      qualification: string;
      department: string;
    }>,
    snapshot?: CatalogSnapshot,
  ): Promise<Map<string, RowCatalogMapping>> {
    const catalog = snapshot ?? (await this.loadSnapshot());

    const professionCache = new Map<string, CatalogMappingResult>();
    const qualificationCache = new Map<string, CatalogMappingResult>();
    const roleCache = new Map<string, CatalogMappingResult>();

    // Pass 1: deterministic. Collect whatever needs the model.
    const pendingQualifications = new Set<string>();
    const pendingRoles = new Set<string>();

    for (const row of rows) {
      const professionKey = this.cacheKey(row.category);
      if (!professionCache.has(professionKey)) {
        professionCache.set(
          professionKey,
          this.matchProfession(row.category, catalog),
        );
      }

      const qualificationKey = this.cacheKey(row.qualification);
      if (!qualificationCache.has(qualificationKey)) {
        const result = this.matchQualification(row.qualification, catalog);
        qualificationCache.set(qualificationKey, result);
        if (result.decision === 'needs_review' && row.qualification.trim()) {
          pendingQualifications.add(row.qualification.trim());
        }
      }

      // Role depends on both the profession and the department, so it is keyed
      // on the pair: "NURSE|ICU" and "DOCTOR|ICU" resolve to different roles.
      const roleKey = this.cacheKey(`${row.category}|${row.department}`);
      if (!roleCache.has(roleKey)) {
        const result = this.matchRole(row.category, row.department, catalog);
        roleCache.set(roleKey, result);
        if (result.decision === 'needs_review' && row.department.trim()) {
          pendingRoles.add(`${row.category.trim()}|${row.department.trim()}`);
        }
      }
    }

    // Pass 2: ask Vertex about the leftovers, in two batched calls.
    if (this.vertexAi.isConfigured()) {
      await Promise.all([
        this.resolveQualificationsWithAi(
          [...pendingQualifications],
          catalog,
          qualificationCache,
        ),
        this.resolveRolesWithAi([...pendingRoles], catalog, roleCache),
      ]);
    } else if (pendingQualifications.size || pendingRoles.size) {
      this.logger.warn(
        `Vertex AI unavailable; ${pendingQualifications.size} qualification and ${pendingRoles.size} department values left for manual review.`,
      );
    }

    const mapping = new Map<string, RowCatalogMapping>();
    for (const row of rows) {
      mapping.set(row.key, {
        professionType: professionCache.get(this.cacheKey(row.category))!,
        qualification: qualificationCache.get(
          this.cacheKey(row.qualification),
        )!,
        role: roleCache.get(
          this.cacheKey(`${row.category}|${row.department}`),
        )!,
      });
    }
    return mapping;
  }

  // --- deterministic matching -------------------------------------------------

  private matchProfession(
    raw: string,
    catalog: CatalogSnapshot,
  ): CatalogMappingResult {
    const value = raw.trim();
    if (!value) {
      return this.empty(raw, 'No category given.');
    }

    const normalized = this.normalize(value);
    // Sheets use plurals freely ("NURSES"), so compare a singular form too.
    const singular = normalized.replace(/s$/, '');

    for (const profession of catalog.professionTypes) {
      const name = this.normalize(profession.name);
      const label = this.normalize(profession.label);
      if (
        name === normalized ||
        label === normalized ||
        name === singular ||
        label === singular
      ) {
        return {
          raw,
          decision: 'exact',
          matchedId: profession.id,
          matchedLabel: profession.label,
          confidence: 1,
          reason: `Matched profession "${profession.label}".`,
          options: [],
        };
      }
    }

    return {
      raw,
      decision: 'needs_review',
      matchedId: null,
      matchedLabel: null,
      confidence: 0,
      reason: `No profession type matches "${value}".`,
      options: catalog.professionTypes.slice(0, SHORTLIST_SIZE).map((p) => ({
        id: p.id,
        name: p.name,
        label: p.label,
      })),
    };
  }

  private matchQualification(
    raw: string,
    catalog: CatalogSnapshot,
  ): CatalogMappingResult {
    const value = raw.trim();
    if (!value) return this.empty(raw, 'No qualification given.');

    const normalized = this.normalize(value);

    for (const qualification of catalog.qualifications) {
      if (
        this.normalize(qualification.name) === normalized ||
        (qualification.shortName &&
          this.normalize(qualification.shortName) === normalized)
      ) {
        return {
          raw,
          decision: 'exact',
          matchedId: qualification.id,
          matchedLabel: qualification.shortName ?? qualification.name,
          confidence: 1,
          reason: `Matched qualification "${qualification.name}".`,
          options: [],
        };
      }
    }

    for (const qualification of catalog.qualifications) {
      if (
        qualification.aliases.some(
          (alias) => this.normalize(alias.alias) === normalized,
        )
      ) {
        return {
          raw,
          decision: 'alias',
          matchedId: qualification.id,
          matchedLabel: qualification.shortName ?? qualification.name,
          confidence: 1,
          reason: `Matched existing alias for "${qualification.name}".`,
          options: [],
        };
      }
    }

    return {
      raw,
      decision: 'needs_review',
      matchedId: null,
      matchedLabel: null,
      confidence: 0,
      reason: `No qualification matches "${value}".`,
      options: this.shortlistQualifications(value, catalog),
    };
  }

  private matchRole(
    category: string,
    department: string,
    catalog: CatalogSnapshot,
  ): CatalogMappingResult {
    const raw = department.trim();
    if (!raw) return this.empty(department, 'No department given.');

    const profession = this.matchProfession(category, catalog);
    const normalized = this.normalize(raw);

    // Only consider roles inside this profession; "ICU" means the ICU nurse
    // role for a nurse and the ICU doctor role for a doctor.
    const inProfession = profession.matchedId
      ? catalog.roles.filter((r) => r.professionTypeId === profession.matchedId)
      : catalog.roles;

    const departmentMatches = inProfession.filter((role) => {
      const dept = role.roleDepartment;
      if (!dept) return false;
      return (
        this.normalize(dept.name) === normalized ||
        this.normalize(dept.label) === normalized ||
        (dept.shortName && this.normalize(dept.shortName) === normalized)
      );
    });

    if (departmentMatches.length === 1) {
      const role = departmentMatches[0];
      return {
        raw: department,
        decision: 'exact',
        matchedId: role.id,
        matchedLabel: `${role.roleDepartment?.label ?? ''} - ${role.label}`.trim(),
        confidence: 1,
        reason: `Matched department "${role.roleDepartment?.label}" for ${profession.matchedLabel ?? 'this profession'}.`,
        options: [],
      };
    }

    if (departmentMatches.length > 1) {
      return {
        raw: department,
        decision: 'needs_review',
        matchedId: null,
        matchedLabel: null,
        confidence: 0,
        reason: `Department "${raw}" has ${departmentMatches.length} possible roles; pick one.`,
        options: departmentMatches.map((role) => this.roleOption(role)),
      };
    }

    return {
      raw: department,
      decision: 'needs_review',
      matchedId: null,
      matchedLabel: null,
      confidence: 0,
      reason: `No department matches "${raw}".`,
      options: this.shortlistRoles(raw, inProfession),
    };
  }

  // --- AI-assisted matching ---------------------------------------------------

  private async resolveQualificationsWithAi(
    values: string[],
    catalog: CatalogSnapshot,
    cache: Map<string, CatalogMappingResult>,
  ): Promise<void> {
    if (values.length === 0) return;

    const options = catalog.qualifications.map((qualification) => ({
      id: qualification.id,
      name: qualification.name,
      shortName: qualification.shortName,
      aliases: qualification.aliases.map((alias) => alias.alias),
    }));

    const prompt = [
      'Map each spreadsheet qualification value to one catalog qualification.',
      '',
      'CATALOG:',
      JSON.stringify(options),
      '',
      'VALUES TO MAP:',
      JSON.stringify(values),
    ].join('\n');

    try {
      const { data } = await this.vertexAi.generateStructured<{
        results: Array<{
          raw: string;
          matchId?: string | null;
          confidence: number;
          reason: string;
          proposedNewValue?: string | null;
        }>;
      }>({
        systemInstruction: SYSTEM_INSTRUCTION,
        prompt,
        responseSchema: MAPPING_SCHEMA,
        callerLabel: 'catalog-mapping:qualifications',
      });

      for (const result of data.results ?? []) {
        const key = this.cacheKey(result.raw);
        const existing = cache.get(key);
        if (!existing) continue;
        const matched = result.matchId
          ? catalog.qualifications.find((q) => q.id === result.matchId)
          : undefined;

        cache.set(
          key,
          this.fromAi(
            existing,
            result,
            matched
              ? { id: matched.id, label: matched.shortName ?? matched.name }
              : null,
          ),
        );
      }
    } catch (error) {
      // A Vertex outage must not fail the batch; these rows stay in review.
      this.logger.warn(
        `Qualification mapping via Vertex failed; ${values.length} values left for manual review. ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async resolveRolesWithAi(
    pairs: string[],
    catalog: CatalogSnapshot,
    cache: Map<string, CatalogMappingResult>,
  ): Promise<void> {
    if (pairs.length === 0) return;

    const options = catalog.roles
      .filter((role) => role.roleDepartment)
      .map((role) => ({
        id: role.id,
        department: role.roleDepartment!.label,
        departmentShort: role.roleDepartment!.shortName,
        role: role.label,
        professionTypeId: role.professionTypeId,
      }));

    const prompt = [
      'Each value is "PROFESSION|DEPARTMENT" from a recruitment sheet.',
      'Map it to one catalog role whose department matches, for that profession.',
      '',
      'CATALOG:',
      JSON.stringify(options),
      '',
      'PROFESSION TYPES:',
      JSON.stringify(catalog.professionTypes),
      '',
      'VALUES TO MAP:',
      JSON.stringify(pairs),
    ].join('\n');

    try {
      const { data } = await this.vertexAi.generateStructured<{
        results: Array<{
          raw: string;
          matchId?: string | null;
          confidence: number;
          reason: string;
          proposedNewValue?: string | null;
        }>;
      }>({
        systemInstruction: SYSTEM_INSTRUCTION,
        prompt,
        responseSchema: MAPPING_SCHEMA,
        callerLabel: 'catalog-mapping:roles',
      });

      for (const result of data.results ?? []) {
        const key = this.cacheKey(result.raw);
        const existing = cache.get(key);
        if (!existing) continue;
        const matched = result.matchId
          ? catalog.roles.find((role) => role.id === result.matchId)
          : undefined;

        cache.set(
          key,
          this.fromAi(
            existing,
            result,
            matched
              ? {
                  id: matched.id,
                  label:
                    `${matched.roleDepartment?.label ?? ''} - ${matched.label}`.trim(),
                }
              : null,
          ),
        );
      }
    } catch (error) {
      this.logger.warn(
        `Role mapping via Vertex failed; ${pairs.length} values left for manual review. ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Folds one AI result into the deterministic result it replaces.
   *
   * Anything below the accept threshold stays `needs_review` even when the
   * model picked an id, so a human still confirms it.
   */
  private fromAi(
    existing: CatalogMappingResult,
    result: {
      matchId?: string | null;
      confidence: number;
      reason: string;
      proposedNewValue?: string | null;
    },
    matched: { id: string; label: string } | null,
  ): CatalogMappingResult {
    const confidence = Number.isFinite(result.confidence)
      ? Math.max(0, Math.min(1, result.confidence))
      : 0;

    if (matched && confidence >= AI_ACCEPT_THRESHOLD) {
      return {
        ...existing,
        decision: 'ai_match',
        matchedId: matched.id,
        matchedLabel: matched.label,
        confidence,
        reason: result.reason,
      };
    }

    if (!matched && result.proposedNewValue) {
      return {
        ...existing,
        decision: 'ai_new_value',
        matchedId: null,
        matchedLabel: null,
        confidence,
        reason: result.reason,
        proposedNewValue: result.proposedNewValue,
      };
    }

    return {
      ...existing,
      decision: 'needs_review',
      matchedId: null,
      matchedLabel: null,
      confidence,
      reason: result.reason,
      // Surface the low-confidence guess first so review is one click.
      options: matched
        ? [
            {
              id: matched.id,
              name: matched.label,
              label: matched.label,
            },
            ...existing.options.filter((option) => option.id !== matched.id),
          ]
        : existing.options,
    };
  }

  // --- helpers ---------------------------------------------------------------

  /**
   * Case, punctuation and spacing are never meaningful in these sheets, so
   * "I.C.U", "icu" and "I C U" all normalize to "icu".
   */
  private normalize(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  private cacheKey(value: string): string {
    return this.normalize(value);
  }

  private empty(raw: string, reason: string): CatalogMappingResult {
    return {
      raw,
      decision: 'empty',
      matchedId: null,
      matchedLabel: null,
      confidence: 1,
      reason,
      options: [],
    };
  }

  private roleOption(role: RoleCatalogRow): CatalogOption {
    return {
      id: role.id,
      name: role.name,
      label: `${role.roleDepartment?.label ?? 'General'} - ${role.label}`,
      shortName: role.roleDepartment?.shortName ?? null,
    };
  }

  /** Cheap token-overlap ranking, only used to seed the review dropdown. */
  private shortlistQualifications(
    value: string,
    catalog: CatalogSnapshot,
  ): CatalogOption[] {
    const needle = this.normalize(value);
    return catalog.qualifications
      .map((qualification) => {
        const haystacks = [
          qualification.name,
          qualification.shortName ?? '',
          ...qualification.aliases.map((alias) => alias.alias),
        ].map((entry) => this.normalize(entry));
        const score = haystacks.reduce((best, entry) => {
          if (!entry) return best;
          if (entry.includes(needle) || needle.includes(entry)) {
            return Math.max(best, Math.min(entry.length, needle.length));
          }
          return best;
        }, 0);
        return { qualification, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, SHORTLIST_SIZE)
      .map(({ qualification }) => ({
        id: qualification.id,
        name: qualification.name,
        label: qualification.name,
        shortName: qualification.shortName,
      }));
  }

  private shortlistRoles(
    value: string,
    roles: RoleCatalogRow[],
  ): CatalogOption[] {
    const needle = this.normalize(value);
    const scored = roles
      .filter((role) => role.roleDepartment)
      .map((role) => {
        const dept = role.roleDepartment!;
        const haystacks = [dept.name, dept.label, dept.shortName ?? ''].map(
          (entry) => this.normalize(entry),
        );
        const score = haystacks.reduce((best, entry) => {
          if (!entry) return best;
          if (entry.includes(needle) || needle.includes(entry)) {
            return Math.max(best, Math.min(entry.length, needle.length));
          }
          return best;
        }, 0);
        return { role, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score);

    const shortlist = scored.length > 0 ? scored : [];
    return shortlist
      .slice(0, SHORTLIST_SIZE)
      .map(({ role }) => this.roleOption(role));
  }
}
