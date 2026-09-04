import { Injectable, Logger } from '@nestjs/common';
import { QualificationLevel } from '@prisma/client';
import { randomUUID } from 'crypto';
import { DOCUMENT_TYPE } from '../../common/constants/document-types';
import { PrismaService } from '../../database/prisma.service';
import { VertexAiService } from '../../vertex-ai/vertex-ai.service';
import { VertexSchema } from '../../vertex-ai/vertex-ai.types';
import {
  BundleIdentitySuggestion,
  BundleProfileSuggestions,
  BundleQualificationSuggestion,
  BundleResumeRoleSuggestion,
  BundleWorkExperienceSuggestion,
  emptyProfileSuggestions,
} from '../types/bundle-profile-suggestions';
import { PdfPageContent } from '../utils/pdf-pages.util';
import { extractPassportFieldsFromText } from '../utils/passport-fields.util';

const QUALIFICATION_LEVELS: string[] = [
  'CERTIFICATE',
  'DIPLOMA',
  'BACHELOR',
  'MASTER',
  'DOCTORATE',
];

const RESUME_TYPES = new Set<string>(
  [DOCUMENT_TYPE.RESUME, DOCUMENT_TYPE.CV].filter(Boolean) as string[],
);

const EXPERIENCE_CERT_TYPES = new Set<string>(
  [
    DOCUMENT_TYPE.EXPERIENCE_CERTIFICATE,
    DOCUMENT_TYPE.EXPERIENCE_CERTIFICATES,
  ].filter(Boolean) as string[],
);

const DEGREE_TYPES = new Set<string>(
  [DOCUMENT_TYPE.DEGREE_CERTIFICATE].filter(Boolean) as string[],
);

const PASSPORT_TYPES = new Set<string>(
  [DOCUMENT_TYPE.PASSPORT_COPY].filter(Boolean) as string[],
);

const IDENTITY_TYPES = new Set<string>(
  [
    DOCUMENT_TYPE.PASSPORT_COPY,
    DOCUMENT_TYPE.AADHAAR,
    DOCUMENT_TYPE.PASSPORT_PHOTO,
  ].filter(Boolean) as string[],
);

export interface BundleSegmentRef {
  id: string;
  startPage: number;
  endPage: number;
  docType: string;
}

interface ProfileExtractResponse {
  qualifications?: Array<{
    rawLabel?: string | null;
    matchedQualificationId?: string | null;
    proposedName?: string | null;
    proposedLevel?: string | null;
    proposedField?: string | null;
    proposedShortName?: string | null;
    university?: string | null;
    graduationYear?: number | null;
    notes?: string | null;
  }>;
  workExperiences?: Array<{
    departmentRaw?: string | null;
    jobTitleRaw?: string | null;
    matchedDepartmentId?: string | null;
    matchedRoleCatalogId?: string | null;
    proposedDepartmentName?: string | null;
    proposedRoleLabel?: string | null;
    companyName?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    isCurrent?: boolean | null;
    linkedSegmentIds?: string[] | null;
    notes?: string | null;
  }>;
  resumeRole?: {
    departmentRaw?: string | null;
    jobTitleRaw?: string | null;
    matchedDepartmentId?: string | null;
    matchedRoleCatalogId?: string | null;
    proposedDepartmentName?: string | null;
    proposedRoleLabel?: string | null;
  } | null;
  identity?: {
    dateOfBirth?: string | null;
    email?: string | null;
    passportNumber?: string | null;
    passportExpiry?: string | null;
  } | null;
}

const PROFILE_SCHEMA: VertexSchema = {
  type: 'OBJECT',
  properties: {
    qualifications: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          rawLabel: { type: 'STRING', nullable: true },
          matchedQualificationId: { type: 'STRING', nullable: true },
          proposedName: { type: 'STRING', nullable: true },
          proposedLevel: {
            type: 'STRING',
            enum: QUALIFICATION_LEVELS,
            nullable: true,
          },
          proposedField: { type: 'STRING', nullable: true },
          proposedShortName: { type: 'STRING', nullable: true },
          university: { type: 'STRING', nullable: true },
          graduationYear: { type: 'INTEGER', nullable: true },
          notes: { type: 'STRING', nullable: true },
        },
      },
    },
    workExperiences: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          departmentRaw: { type: 'STRING', nullable: true },
          jobTitleRaw: { type: 'STRING', nullable: true },
          matchedDepartmentId: { type: 'STRING', nullable: true },
          matchedRoleCatalogId: { type: 'STRING', nullable: true },
          proposedDepartmentName: { type: 'STRING', nullable: true },
          proposedRoleLabel: { type: 'STRING', nullable: true },
          companyName: { type: 'STRING', nullable: true },
          startDate: {
            type: 'STRING',
            description: 'ISO YYYY-MM-DD',
            nullable: true,
          },
          endDate: {
            type: 'STRING',
            description: 'ISO YYYY-MM-DD; null when current',
            nullable: true,
          },
          isCurrent: { type: 'BOOLEAN', nullable: true },
          linkedSegmentIds: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            nullable: true,
          },
          notes: { type: 'STRING', nullable: true },
        },
      },
    },
    resumeRole: {
      type: 'OBJECT',
      nullable: true,
      properties: {
        departmentRaw: { type: 'STRING', nullable: true },
        jobTitleRaw: { type: 'STRING', nullable: true },
        matchedDepartmentId: { type: 'STRING', nullable: true },
        matchedRoleCatalogId: { type: 'STRING', nullable: true },
        proposedDepartmentName: { type: 'STRING', nullable: true },
        proposedRoleLabel: { type: 'STRING', nullable: true },
      },
    },
    identity: {
      type: 'OBJECT',
      nullable: true,
      properties: {
        dateOfBirth: {
          type: 'STRING',
          description: 'ISO YYYY-MM-DD',
          nullable: true,
        },
        email: { type: 'STRING', nullable: true },
        passportNumber: { type: 'STRING', nullable: true },
        passportExpiry: {
          type: 'STRING',
          description: 'Passport expiry ISO YYYY-MM-DD',
          nullable: true,
        },
      },
    },
  },
  required: ['qualifications', 'workExperiences'],
};

const SYSTEM_INSTRUCTION = `You extract a candidate's profile from a merged PDF: resume, degree certificates, passport, Aadhaar and experience letters.

Rules:
- Return every distinct qualification printed under Education (or on certificates). Always include school credentials such as Higher Secondary Certificate / HSC / Plus Two and Secondary School Leaving Certificate / SSLC, not only the university degree.
- Return raw labels exactly as printed (for example "Bachelor of Science in Nursing", "Higher Secondary Certificate", "Secondary School Leaving Certificate"). Do not invent catalog ids.
- Qualification level must be one of CERTIFICATE, DIPLOMA, BACHELOR, MASTER, DOCTORATE. School certificates are CERTIFICATE. BSc / Bachelor of Science in Nursing is BACHELOR.
- Dates must be ISO YYYY-MM-DD. If only a month/year is printed, use the first day of that month. If only a year, use YYYY-01-01.
- When the person is still in a role, set isCurrent true and leave endDate null.
- For work experiences, department and job title are required. Organization/company is optional.
- linkedSegmentIds must be ids from the experience-certificate segment list when a letter clearly belongs to that job; otherwise use an empty array.
- resumeRole is the department and job title the resume should be filed under (usually the current or most recent role). Match catalog ids when possible.
- identity.dateOfBirth, identity.email, identity.passportNumber and identity.passportExpiry only when printed. Never invent them. Passport number and expiry are often on the bio page and also repeated on a DataFlow report.
- Keep notes short (one sentence) or omit them.
- Ignore DataFlow / Primary Source Verification reports when listing jobs; take employment from the resume and from employer-issued experience letters only.`;

/**
 * Second Vertex pass after page segmentation: pulls profile rows the reviewer
 * can confirm before they are written onto the candidate.
 */
@Injectable()
export class MergedPdfProfileExtractorService {
  private readonly logger = new Logger(MergedPdfProfileExtractorService.name);

  constructor(
    private readonly vertexAi: VertexAiService,
    private readonly prisma: PrismaService,
  ) {}

  async extract(
    pages: PdfPageContent[],
    segments: BundleSegmentRef[],
    candidateHint: { fullName: string },
  ): Promise<BundleProfileSuggestions> {
    const resumeSegments = segments.filter((segment) =>
      RESUME_TYPES.has(segment.docType),
    );
    const experienceSegments = segments.filter((segment) =>
      EXPERIENCE_CERT_TYPES.has(segment.docType),
    );
    const degreeSegments = segments.filter((segment) =>
      DEGREE_TYPES.has(segment.docType),
    );
    const passportSegments = segments.filter((segment) =>
      PASSPORT_TYPES.has(segment.docType),
    );
    const identitySegments = segments.filter((segment) =>
      IDENTITY_TYPES.has(segment.docType),
    );

    const sourceSegments = [
      ...resumeSegments,
      ...experienceSegments,
      ...degreeSegments,
      ...identitySegments,
    ];

    const [qualifications, departments, roles] = await Promise.all([
      this.prisma.qualification.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          shortName: true,
          level: true,
          field: true,
          aliases: { select: { alias: true } },
        },
        take: 2000,
        orderBy: { name: 'asc' },
      }),
      this.prisma.roleDepartment.findMany({
        where: { isActive: true },
        select: { id: true, name: true, label: true },
        take: 200,
        orderBy: { label: 'asc' },
      }),
      this.prisma.roleCatalog.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          label: true,
          roleDepartmentId: true,
        },
        take: 400,
        orderBy: { label: 'asc' },
      }),
    ]);

    const textPages = pages.filter((page) => !page.isBlank);
    const detectedFromText = this.suggestQualificationsFromText(
      textPages.map((page) => page.text).join('\n'),
    );
    const detectedPassport = extractPassportFieldsFromText(
      textPages.map((page) => page.text).join('\n'),
    );

    if (textPages.length === 0 && sourceSegments.length === 0) {
      return emptyProfileSuggestions();
    }

    const pageSummaries = textPages.map((page) => ({
      page: page.pageNumber,
      text: page.text.slice(0, 2500),
      scanned: page.isScanned,
      hasImage: Boolean(page.imageBase64),
    }));

    const imagePages = [
      ...textPages.filter((page) =>
        sourceSegments.some(
          (segment) =>
            page.pageNumber >= segment.startPage &&
            page.pageNumber <= segment.endPage &&
            Boolean(page.imageBase64),
        ),
      ),
      ...textPages.filter((page) => Boolean(page.imageBase64)),
    ];
    const seenImages = new Set<number>();
    const inlineData = imagePages
      .filter((page) => {
        if (!page.imageBase64 || seenImages.has(page.pageNumber)) return false;
        seenImages.add(page.pageNumber);
        return true;
      })
      .slice(0, 12)
      .map((page) => ({
        mimeType: page.imageMimeType ?? 'image/jpeg',
        data: page.imageBase64 as string,
      }));

    let extracted: ProfileExtractResponse = {
      qualifications: detectedFromText,
      workExperiences: [],
      identity: {
        passportNumber: detectedPassport.documentNumber,
        passportExpiry: detectedPassport.expiryDate,
      },
    };

    try {
      const { data } = await this.vertexAi.generateStructured<ProfileExtractResponse>({
        systemInstruction: SYSTEM_INSTRUCTION,
        prompt: [
          `Candidate on file: ${candidateHint.fullName}.`,
          '',
          'Resume page ranges:',
          JSON.stringify(
            resumeSegments.map((segment) => ({
              id: segment.id,
              startPage: segment.startPage,
              endPage: segment.endPage,
            })),
          ),
          '',
          'Degree-certificate page ranges (extra qualifications):',
          JSON.stringify(
            degreeSegments.map((segment) => ({
              id: segment.id,
              startPage: segment.startPage,
              endPage: segment.endPage,
            })),
          ),
          '',
          'Passport page ranges (passport number, expiry, date of birth):',
          JSON.stringify(
            passportSegments.map((segment) => ({
              id: segment.id,
              startPage: segment.startPage,
              endPage: segment.endPage,
            })),
          ),
          '',
          'Experience-certificate segments (use these ids in linkedSegmentIds when they match a job):',
          JSON.stringify(
            experienceSegments.map((segment) => ({
              id: segment.id,
              startPage: segment.startPage,
              endPage: segment.endPage,
            })),
          ),
          '',
          'Page text (read Education on the resume even if those pages were not labelled as certificates):',
          JSON.stringify(pageSummaries),
          '',
          'Existing departments (prefer matchedDepartmentId):',
          JSON.stringify(
            departments.map((row) => ({
              id: row.id,
              name: row.name,
              label: row.label,
            })),
          ),
          '',
          'Existing job titles / roles (prefer matchedRoleCatalogId):',
          JSON.stringify(
            roles.map((row) => ({
              id: row.id,
              label: row.label,
              roleDepartmentId: row.roleDepartmentId,
            })),
          ),
        ].join('\n'),
        responseSchema: PROFILE_SCHEMA,
        inlineData,
        callerLabel: 'merged-pdf-profile-extractor',
        maxOutputTokens: 8192,
        temperature: 0,
      });
      extracted = {
        ...data,
        qualifications: this.mergeQualificationSuggestions(
          data.qualifications ?? [],
          detectedFromText,
        ),
        identity: this.mergeIdentityFromText(data.identity, detectedPassport),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown profile extract error.';
      this.logger.warn(`Profile extraction skipped: ${message}`);
    }

    return this.normalize(
      extracted,
      qualifications,
      departments,
      roles,
      new Set(experienceSegments.map((segment) => segment.id)),
    );
  }

  normalize(
    data: ProfileExtractResponse,
    qualifications: Array<{
      id: string;
      name: string;
      shortName: string | null;
      level: QualificationLevel;
      field: string;
      aliases?: Array<{ alias: string }>;
    }>,
    departments: Array<{ id: string; name: string; label: string }>,
    roles: Array<{
      id: string;
      name: string;
      label: string;
      roleDepartmentId: string | null;
    }>,
    validSegmentIds: Set<string>,
  ): BundleProfileSuggestions {
    const qualById = new Map(qualifications.map((row) => [row.id, row]));
    const deptById = new Map(departments.map((row) => [row.id, row]));
    const roleById = new Map(roles.map((row) => [row.id, row]));

    const matchQualByName = (label: string) => {
      return this.matchQualification(label, qualifications);
    };

    const matchDeptByName = (label: string) => {
      const needle = label.trim().toLowerCase();
      if (!needle) return null;
      return (
        departments.find(
          (row) =>
            row.label.toLowerCase() === needle ||
            row.name.toLowerCase() === needle,
        ) ?? null
      );
    };

    const matchRoleByName = (label: string, departmentId?: string | null) => {
      const needle = label.trim().toLowerCase();
      if (!needle) return null;
      const pool = departmentId
        ? roles.filter((row) => row.roleDepartmentId === departmentId)
        : roles;
      return (
        pool.find(
          (row) =>
            row.label.toLowerCase() === needle ||
            row.name.toLowerCase() === needle,
        ) ??
        roles.find(
          (row) =>
            row.label.toLowerCase() === needle ||
            row.name.toLowerCase() === needle,
        ) ??
        null
      );
    };

    const qualificationRows: BundleQualificationSuggestion[] = [];
    const seenQualKeys = new Set<string>();
    for (const entry of data.qualifications ?? []) {
      const rawLabel =
        this.clean(entry.rawLabel) ||
        this.clean(entry.proposedName) ||
        '';
      if (!rawLabel) continue;

      let qualificationId =
        entry.matchedQualificationId &&
        qualById.has(entry.matchedQualificationId)
          ? entry.matchedQualificationId
          : null;
      if (!qualificationId) {
        qualificationId =
          matchQualByName(rawLabel)?.id ??
          matchQualByName(this.clean(entry.proposedName) || '')?.id ??
          matchQualByName(this.clean(entry.proposedShortName) || '')?.id ??
          null;
      }

      const matched = qualificationId ? qualById.get(qualificationId) : null;
      const dedupeKey = matched
        ? `id:${matched.id}`
        : `key:${this.catalogKey(rawLabel)}`;
      if (seenQualKeys.has(dedupeKey)) continue;
      seenQualKeys.add(dedupeKey);

      const level = this.normalizeLevel(entry.proposedLevel);
      const proposedField = this.clean(entry.proposedField);

      let proposedNew: BundleQualificationSuggestion['proposedNew'] = null;
      if (!matched) {
        proposedNew = {
          name: this.clean(entry.proposedName) || rawLabel,
          level:
            level ??
            (this.looksLikeSchoolCertificate(rawLabel)
              ? 'CERTIFICATE'
              : 'BACHELOR'),
          field: proposedField || 'General',
          shortName: this.clean(entry.proposedShortName) || undefined,
        };
      }

      qualificationRows.push({
        id: randomUUID(),
        rawLabel,
        qualificationId: matched?.id ?? null,
        qualificationLabel: matched
          ? matched.shortName ?? matched.name
          : null,
        proposedNew,
        university: this.clean(entry.university),
        graduationYear: this.year(entry.graduationYear),
        notes: this.clean(entry.notes),
        included: true,
      });
    }

    const workRows: BundleWorkExperienceSuggestion[] = [];
    for (const entry of data.workExperiences ?? []) {
      const departmentRaw = this.clean(entry.departmentRaw) || '';
      const jobTitleRaw = this.clean(entry.jobTitleRaw) || '';
      if (!departmentRaw || !jobTitleRaw) continue;

      let roleDepartmentId =
        entry.matchedDepartmentId &&
        deptById.has(entry.matchedDepartmentId)
          ? entry.matchedDepartmentId
          : null;
      if (!roleDepartmentId) {
        roleDepartmentId = matchDeptByName(departmentRaw)?.id ?? null;
      }

      let roleCatalogId =
        entry.matchedRoleCatalogId &&
        roleById.has(entry.matchedRoleCatalogId)
          ? entry.matchedRoleCatalogId
          : null;
      if (!roleCatalogId) {
        roleCatalogId =
          matchRoleByName(jobTitleRaw, roleDepartmentId)?.id ?? null;
      }

      const dept = roleDepartmentId ? deptById.get(roleDepartmentId) : null;
      const role = roleCatalogId ? roleById.get(roleCatalogId) : null;

      if (role && !roleDepartmentId && role.roleDepartmentId) {
        roleDepartmentId = role.roleDepartmentId;
      }

      const isCurrent = Boolean(entry.isCurrent);
      const startDate = this.isoDate(entry.startDate);
      if (!startDate) continue;

      const endDate = isCurrent ? null : this.isoDate(entry.endDate);
      if (!isCurrent && !endDate) continue;

      const linkedSegmentIds = (entry.linkedSegmentIds ?? []).filter((id) =>
        validSegmentIds.has(id),
      );

      workRows.push({
        id: randomUUID(),
        departmentRaw,
        jobTitleRaw,
        roleDepartmentId: dept?.id ?? roleDepartmentId,
        roleDepartmentLabel: dept?.label ?? null,
        roleCatalogId: role?.id ?? roleCatalogId,
        roleCatalogLabel: role?.label ?? null,
        proposedDepartment: dept
          ? null
          : {
              name:
                this.clean(entry.proposedDepartmentName) || departmentRaw,
            },
        proposedRole: role
          ? null
          : {
              label: this.clean(entry.proposedRoleLabel) || jobTitleRaw,
              roleDepartmentId: roleDepartmentId ?? undefined,
            },
        companyName: this.clean(entry.companyName),
        startDate,
        endDate,
        isCurrent,
        linkedSegmentIds,
        notes: this.clean(entry.notes),
        included: true,
      });
    }

    const resumeRole = this.normalizeResumeRole(
      data.resumeRole,
      workRows,
      deptById,
      roleById,
      matchDeptByName,
      matchRoleByName,
    );

    const identity = this.normalizeIdentity(data.identity);

    return {
      qualifications: qualificationRows,
      workExperiences: workRows,
      resumeRole,
      identity,
    };
  }

  private normalizeResumeRole(
    entry: ProfileExtractResponse['resumeRole'] | null | undefined,
    workRows: BundleWorkExperienceSuggestion[],
    deptById: Map<string, { id: string; name: string; label: string }>,
    roleById: Map<
      string,
      {
        id: string;
        name: string;
        label: string;
        roleDepartmentId: string | null;
      }
    >,
    matchDeptByName: (
      label: string,
    ) => { id: string; name: string; label: string } | null,
    matchRoleByName: (
      label: string,
      departmentId?: string | null,
    ) => {
      id: string;
      name: string;
      label: string;
      roleDepartmentId: string | null;
    } | null,
  ): BundleResumeRoleSuggestion | null {
    const fallback = workRows[0];
    const departmentRaw =
      this.clean(entry?.departmentRaw) || fallback?.departmentRaw || '';
    const jobTitleRaw =
      this.clean(entry?.jobTitleRaw) || fallback?.jobTitleRaw || '';
    if (!departmentRaw && !jobTitleRaw && !fallback) {
      return null;
    }

    let departmentId =
      entry?.matchedDepartmentId && deptById.has(entry.matchedDepartmentId)
        ? entry.matchedDepartmentId
        : null;
    if (!departmentId && departmentRaw) {
      departmentId = matchDeptByName(departmentRaw)?.id ?? null;
    }
    if (!departmentId) {
      departmentId = fallback?.roleDepartmentId ?? null;
    }

    let roleCatalogId =
      entry?.matchedRoleCatalogId && roleById.has(entry.matchedRoleCatalogId)
        ? entry.matchedRoleCatalogId
        : null;
    if (!roleCatalogId && jobTitleRaw) {
      roleCatalogId = matchRoleByName(jobTitleRaw, departmentId)?.id ?? null;
    }
    if (!roleCatalogId) {
      roleCatalogId = fallback?.roleCatalogId ?? null;
    }

    const role = roleCatalogId ? roleById.get(roleCatalogId) : null;
    if (role && !departmentId && role.roleDepartmentId) {
      departmentId = role.roleDepartmentId;
    }

    const resolvedDept = departmentId ? deptById.get(departmentId) : null;

    return {
      departmentId: resolvedDept?.id ?? departmentId,
      roleCatalogId: role?.id ?? roleCatalogId,
      departmentLabel:
        resolvedDept?.label ?? fallback?.roleDepartmentLabel ?? null,
      roleLabel: role?.label ?? fallback?.roleCatalogLabel ?? null,
      proposedDepartment: resolvedDept
        ? null
        : {
            name:
              this.clean(entry?.proposedDepartmentName) ||
              departmentRaw ||
              fallback?.proposedDepartment?.name ||
              '',
          },
      proposedRole: role
        ? null
        : {
            label:
              this.clean(entry?.proposedRoleLabel) ||
              jobTitleRaw ||
              fallback?.proposedRole?.label ||
              '',
            roleDepartmentId: departmentId ?? undefined,
          },
      docName: null,
    };
  }

  private normalizeIdentity(
    entry: ProfileExtractResponse['identity'] | null | undefined,
  ): BundleIdentitySuggestion | null {
    const dateOfBirth = this.isoDate(entry?.dateOfBirth);
    const email = this.email(entry?.email);
    const passportNumber =
      this.clean(entry?.passportNumber)?.toUpperCase() ?? null;
    const passportExpiry = this.isoDate(entry?.passportExpiry);
    if (!dateOfBirth && !email && !passportNumber && !passportExpiry) {
      return null;
    }
    return {
      dateOfBirth,
      email,
      passportNumber,
      passportExpiry,
      identityEdited: false,
    };
  }

  mergeIdentityFromText(
    identity: ProfileExtractResponse['identity'] | null | undefined,
    parsed: { documentNumber: string | null; expiryDate: string | null },
  ): ProfileExtractResponse['identity'] {
    return {
      ...(identity ?? {}),
      passportNumber:
        this.clean(identity?.passportNumber) || parsed.documentNumber,
      passportExpiry:
        this.isoDate(identity?.passportExpiry) || parsed.expiryDate,
    };
  }

  /**
   * Resume education lines that should always become qualification rows,
   * even when Vertex skips them. Matching to the catalog happens in normalize.
   */
  suggestQualificationsFromText(
    text: string,
  ): NonNullable<ProfileExtractResponse['qualifications']> {
    if (!text.trim()) return [];

    const patterns: Array<{
      re: RegExp;
      rawLabel: string;
      proposedName: string;
      proposedLevel: string;
      proposedField: string;
      proposedShortName: string;
    }> = [
      {
        re: /bachelor of science in nursing|\bb\.?\s*sc\.?\s*nursing\b|\bbsc nursing\b|\bbsn\b/i,
        rawLabel: 'Bachelor of Science in Nursing',
        proposedName: 'BSc Nursing',
        proposedLevel: 'BACHELOR',
        proposedField: 'Nursing',
        proposedShortName: 'BSc Nursing',
      },
      {
        re: /higher secondary certificate|\bhigher secondary\b|\bplus two\b|\bhsc\b/i,
        rawLabel: 'Higher Secondary Certificate',
        proposedName: 'Higher Secondary Certificate',
        proposedLevel: 'CERTIFICATE',
        proposedField: 'General',
        proposedShortName: 'HSC',
      },
      {
        re: /secondary school leaving certificate|\bsslc\b/i,
        rawLabel: 'Secondary School Leaving Certificate',
        proposedName: 'Secondary School Leaving Certificate',
        proposedLevel: 'CERTIFICATE',
        proposedField: 'General',
        proposedShortName: 'SSLC',
      },
    ];

    const found: NonNullable<ProfileExtractResponse['qualifications']> = [];
    for (const pattern of patterns) {
      if (!pattern.re.test(text)) continue;
      found.push({
        rawLabel: pattern.rawLabel,
        proposedName: pattern.proposedName,
        proposedLevel: pattern.proposedLevel,
        proposedField: pattern.proposedField,
        proposedShortName: pattern.proposedShortName,
      });
    }
    return found;
  }

  mergeQualificationSuggestions(
    primary: NonNullable<ProfileExtractResponse['qualifications']>,
    fallback: NonNullable<ProfileExtractResponse['qualifications']>,
  ): NonNullable<ProfileExtractResponse['qualifications']> {
    const merged = [...primary];
    const keys = primary
      .map((entry) =>
        this.catalogKey(entry.rawLabel || entry.proposedName || ''),
      )
      .filter(Boolean);

    for (const extra of fallback) {
      const extraKey = this.catalogKey(
        extra.rawLabel || extra.proposedName || '',
      );
      if (!extraKey) continue;
      const alreadyPresent = keys.some(
        (key) => key === extraKey || key.includes(extraKey) || extraKey.includes(key),
      );
      if (alreadyPresent) continue;
      keys.push(extraKey);
      merged.push(extra);
    }
    return merged;
  }

  private matchQualification(
    label: string,
    qualifications: Array<{
      id: string;
      name: string;
      shortName: string | null;
      aliases?: Array<{ alias: string }>;
    }>,
  ): { id: string } | null {
    const needle = this.catalogKey(label);
    const strippedNeedle = this.catalogKey(this.stripParenthetical(label));
    if (!needle) return null;

    const exact = qualifications.find((row) => {
      const keys = this.qualificationKeys(row);
      return keys.includes(needle) || keys.includes(strippedNeedle);
    });
    if (exact) return exact;

    const initials = this.significantInitials(label);
    if (initials.length >= 3) {
      const byInitials = qualifications.filter((row) => {
        const keys = this.qualificationKeys(row);
        return keys.includes(initials);
      });
      if (byInitials.length === 1) return byInitials[0];
    }

    const needleIsPostBasic = needle.includes('postbasic');
    const contained = qualifications.filter((row) => {
      if (
        !needleIsPostBasic &&
        this.catalogKey(row.name).includes('postbasic')
      ) {
        return false;
      }
      const keys = this.qualificationKeys(row).filter((key) => key.length >= 6);
      return keys.some(
        (key) =>
          needle.includes(key) ||
          key.includes(needle) ||
          strippedNeedle.includes(key) ||
          key.includes(strippedNeedle),
      );
    });
    if (contained.length === 1) return contained[0];
    if (contained.length > 1) {
      contained.sort(
        (left, right) =>
          this.catalogKey(left.name).length - this.catalogKey(right.name).length,
      );
      return contained[0];
    }

    return null;
  }

  /** Catalog names often embed the short form: "Bachelor of Science in Nursing (BSc Nursing)". */
  private stripParenthetical(value: string): string {
    return value.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private qualificationKeys(row: {
    name: string;
    shortName: string | null;
    aliases?: Array<{ alias: string }>;
  }): string[] {
    const values = [
      row.name,
      row.shortName ?? '',
      this.stripParenthetical(row.name),
      this.stripParenthetical(row.shortName ?? ''),
      ...(row.aliases ?? []).map((alias) => alias.alias),
    ];
    return [
      ...new Set(values.map((value) => this.catalogKey(value)).filter(Boolean)),
    ];
  }

  /** "I.C.U" / "B.Sc Nursing" / "HSC" become comparable catalog keys. */
  private catalogKey(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  }

  /** Higher Secondary Certificate → hsc; Secondary School Leaving Certificate → sslc. */
  private significantInitials(value: string): string {
    const stop = new Set(['of', 'in', 'the', 'and', 'for', 'a', 'an', 'to']);
    return value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word && !stop.has(word))
      .map((word) => word[0])
      .join('');
  }

  private looksLikeSchoolCertificate(label: string): boolean {
    const key = this.catalogKey(label);
    return (
      key.includes('highersecondary') ||
      key.includes('secondaryschool') ||
      key.includes('plustwo') ||
      key.includes('sslc') ||
      key === 'hsc'
    );
  }

  private normalizeLevel(
    value: string | null | undefined,
  ): QualificationLevel | null {
    const upper = value?.trim().toUpperCase();
    if (!upper) return null;
    if (QUALIFICATION_LEVELS.includes(upper)) {
      return upper as QualificationLevel;
    }
    return null;
  }

  private year(value: number | null | undefined): number | null {
    if (value == null || !Number.isFinite(value)) return null;
    const year = Math.floor(value);
    if (year < 1950 || year > 2035) return null;
    return year;
  }

  private clean(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private email(value: string | null | undefined): string | null {
    const trimmed = this.clean(value);
    if (!trimmed) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
    return trimmed.toLowerCase();
  }

  private isoDate(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
    const parsed = new Date(`${trimmed}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? null : trimmed;
  }
}
