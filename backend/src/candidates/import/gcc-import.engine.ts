import { ConflictException } from '@nestjs/common';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { CreateCandidateDto, Gender } from '../dto/create-candidate.dto';
import { CandidatesService } from '../candidates.service';
import { classifySheet, GccNurseSheet, normalizeSheetName } from './gcc-import.constants';
import { loadGccWorkbook, LoadWorkbookResult } from './gcc-import.excel';
import {
  resolveInterestedStatus,
  resolveNurseProfessionType,
  shouldUpdateInterestedStatus,
} from './gcc-import.lookups';
import {
  assertCompleteNurseMap,
  loadRecruiterMapFile,
  validateMappedRecruiter,
} from './gcc-import.mapping';
import {
  normalizeGccDataFlow,
  normalizeGccGender,
  normalizeGccName,
  normalizeGccPhone,
} from './gcc-import.normalize';
import { isApplyMode, GccImportCliFlags } from './gcc-import.safety';

export type GccImportPrisma = {
  professionType: {
    findMany: (args: unknown) => Promise<{ id: string; name: string; isActive: boolean }[]>;
  };
  candidateStatus: {
    findMany: (args: unknown) => Promise<{ id: number; statusName: string }[]>;
  };
  user: {
    findUnique: (args: unknown) => Promise<{
      id: string;
      name: string;
      accountStatus: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
      userRoles: { role: { name: string } }[];
    } | null>;
  };
  candidate: {
    findUnique: (args: unknown) => Promise<{
      id: string;
      currentStatusId: number | null;
      currentStatus: { statusName: string } | null;
    } | null>;
  };
  candidateRecruiterAssignment: {
    findFirst: (args: unknown) => Promise<{ id: string } | null>;
  };
  candidateStatusHistory: {
    findFirst: (args: unknown) => Promise<{ reason: string | null } | null>;
  };
};

export type InvalidPhoneRow = {
  sheet: string;
  row: number;
  name: string;
  rawPhone: string;
  normalizedDigits: string;
  digitLength: number;
  reason: string;
};

export type DuplicatePhoneRow = {
  sheet: string;
  row: number;
  name: string;
  phone: string;
  duplicateOf: { sheet: string; row: number; name: string; phone: string };
};

export type NameValidationRow = {
  sheet: string;
  row: number;
  name: string;
  reason: string;
};

export type OtherValidationRow = {
  sheet: string;
  row: number;
  name: string;
  reason: string;
};

export function groupInvalidPhoneReason(reason: string): string {
  if (reason.startsWith('unsupported phone digit length')) {
    return 'unsupported phone digit length';
  }
  return reason;
}

export type GccImportReport = {
  generatedAt: string;
  mode: 'dry-run' | 'apply';
  excludedSheets: string[];
  unknownSheets: string[];
  recruiters: Record<
    string,
    {
      sheet: string;
      recruiterId: string;
      recruiterName?: string;
      rowsInspected: number;
      validRows: number;
      invalidRows: number;
      candidatesToCreate: number;
      existingCandidates: number;
      assignmentsNeeded: number;
      assignmentsAlreadyCorrect: number;
      statusUpdatesNeeded: number;
      statusAlreadyCorrect: number;
      skippedRows: number;
      validationErrors: { row: number; reason: string }[];
    }
  >;
  totals: {
    rows: number;
    valid: number;
    invalid: number;
    new: number;
    existing: number;
    assignments: number;
    statusUpdates: number;
    excelDuplicates: number;
    invalidPhones: number;
    invalidPhoneRows: InvalidPhoneRow[];
    unknownDataflowValues: string[];
    rowErrors: { sheet: string; row: number; error: string }[];
  };
  invalidSummary: {
    invalidPhones: {
      count: number;
      byReason: Record<string, number>;
      rows: InvalidPhoneRow[];
    };
    duplicatePhones: {
      count: number;
      rows: DuplicatePhoneRow[];
    };
    nameValidation: {
      count: number;
      rows: NameValidationRow[];
    };
    otherValidation: {
      count: number;
      rows: OtherValidationRow[];
    };
  };
};

function emptyRecruiterStats(sheet: string, recruiterId: string) {
  return {
    sheet,
    recruiterId,
    rowsInspected: 0,
    validRows: 0,
    invalidRows: 0,
    candidatesToCreate: 0,
    existingCandidates: 0,
    assignmentsNeeded: 0,
    assignmentsAlreadyCorrect: 0,
    statusUpdatesNeeded: 0,
    statusAlreadyCorrect: 0,
    skippedRows: 0,
    validationErrors: [] as { row: number; reason: string }[],
  };
}

export async function runGccImport(params: {
  excelPath: string;
  mapPath: string;
  flags: GccImportCliFlags;
  prisma: GccImportPrisma;
  candidatesService?: Pick<
    CandidatesService,
    'create' | 'assignRecruiter' | 'updateStatus'
  >;
  reportsDir: string;
  sheetFilter?: string;
  workbookOverride?: LoadWorkbookResult;
}): Promise<{ report: GccImportReport; reportPath: string }> {
  const apply = isApplyMode(params.flags);
  if (apply && !params.candidatesService) {
    throw new Error('CandidatesService is required for --apply');
  }

  const nurseRows = await params.prisma.professionType.findMany({
    where: { name: 'nurse', isActive: true },
  });
  const nurse = resolveNurseProfessionType(nurseRows);

  const interestedRows = await params.prisma.candidateStatus.findMany({
    where: { statusName: { equals: 'Interested', mode: 'insensitive' } },
  });
  const interested = resolveInterestedStatus(interestedRows);

  const map = loadRecruiterMapFile(params.mapPath);
  assertCompleteNurseMap(map);

  for (const sheet of Object.keys(map)) {
    if (classifySheet(sheet) !== 'nurse') continue;
    const user = await params.prisma.user.findUnique({
      where: { id: map[sheet] },
      include: { userRoles: { include: { role: true } } },
    });
    validateMappedRecruiter(sheet as GccNurseSheet, user);
  }

  const workbook = params.workbookOverride ?? (await loadGccWorkbook(params.excelPath));
  const sheetFilter = params.sheetFilter
    ? normalizeSheetName(params.sheetFilter)
    : undefined;
  if (sheetFilter && classifySheet(sheetFilter) !== 'nurse') {
    throw new Error(`--sheet ${sheetFilter} is not an allowed Nurse sheet`);
  }

  const report: GccImportReport = {
    generatedAt: new Date().toISOString(),
    mode: apply ? 'apply' : 'dry-run',
    excludedSheets: workbook.excludedSheets,
    unknownSheets: workbook.unknownSheets,
    recruiters: {},
    totals: {
      rows: 0,
      valid: 0,
      invalid: 0,
      new: 0,
      existing: 0,
      assignments: 0,
      statusUpdates: 0,
      excelDuplicates: 0,
      invalidPhones: 0,
      invalidPhoneRows: [],
      unknownDataflowValues: [],
      rowErrors: [],
    },
    invalidSummary: {
      invalidPhones: { count: 0, byReason: {}, rows: [] },
      duplicatePhones: { count: 0, rows: [] },
      nameValidation: { count: 0, rows: [] },
      otherValidation: { count: 0, rows: [] },
    },
  };

  const seenPhones = new Map<
    string,
    { sheet: string; row: number; name: string; phone: string }
  >();
  const nameValidationRows: NameValidationRow[] = [];
  const duplicatePhoneRows: DuplicatePhoneRow[] = [];
  const otherValidationRows: OtherValidationRow[] = [];
  const suppress = { suppressExternalSideEffects: true as const };

  for (const row of workbook.rows) {
    if (sheetFilter && row.sheet !== sheetFilter) continue;
    const recruiterId = map[row.sheet];
    if (!report.recruiters[row.sheet]) {
      report.recruiters[row.sheet] = emptyRecruiterStats(row.sheet, recruiterId);
    }
    const stats = report.recruiters[row.sheet];
    stats.rowsInspected += 1;
    report.totals.rows += 1;

    try {
      const name = normalizeGccName(row.name);
      if (!name.ok) {
        stats.invalidRows += 1;
        stats.skippedRows += 1;
        stats.validationErrors.push({ row: row.rowNumber, reason: name.reason });
        report.totals.invalid += 1;
        nameValidationRows.push({
          sheet: row.sheet,
          row: row.rowNumber,
          name: row.name ?? '',
          reason: name.reason,
        });
        continue;
      }

      const phone = normalizeGccPhone(row.mobile);
      if (!phone.ok) {
        stats.invalidRows += 1;
        stats.skippedRows += 1;
        stats.validationErrors.push({ row: row.rowNumber, reason: phone.reason });
        report.totals.invalid += 1;
        report.totals.invalidPhones += 1;
        report.totals.invalidPhoneRows.push({
          sheet: row.sheet,
          row: row.rowNumber,
          name: row.name ?? '',
          rawPhone: phone.raw,
          normalizedDigits: phone.normalizedDigits,
          digitLength: phone.digitLength,
          reason: phone.reason,
        });
        continue;
      }

      const phoneKey = `${phone.countryCode}:${phone.mobileNumber}`;
      const displayPhone = `${phone.countryCode}${phone.mobileNumber}`;
      const firstSeen = seenPhones.get(phoneKey);
      if (firstSeen) {
        stats.invalidRows += 1;
        stats.skippedRows += 1;
        stats.validationErrors.push({
          row: row.rowNumber,
          reason: 'duplicate phone within Excel',
        });
        report.totals.invalid += 1;
        report.totals.excelDuplicates += 1;
        duplicatePhoneRows.push({
          sheet: row.sheet,
          row: row.rowNumber,
          name: row.name ?? '',
          phone: displayPhone,
          duplicateOf: firstSeen,
        });
        continue;
      }
      seenPhones.set(phoneKey, {
        sheet: row.sheet,
        row: row.rowNumber,
        name: row.name ?? '',
        phone: displayPhone,
      });

      const gender = normalizeGccGender(row.gender);
      const dataFlow = normalizeGccDataFlow(row.dataFlow);
      if (!dataFlow.ok) {
        report.totals.unknownDataflowValues.push(
          `${row.sheet}#${row.rowNumber}:${dataFlow.raw}`,
        );
      }

      const remarks = (row.remarks ?? '').trim();
      const dto: CreateCandidateDto = {
        firstName: name.firstName,
        lastName: name.lastName,
        professionTypeId: nurse.id,
        countryCode: phone.countryCode,
        mobileNumber: phone.mobileNumber,
        source: 'manual',
        currentStatusId: interested.id,
        dataFlow: dataFlow.ok ? dataFlow.value : undefined,
      };
      if (gender) dto.gender = gender as Gender;

      stats.validRows += 1;
      report.totals.valid += 1;

      const existing = await params.prisma.candidate.findUnique({
        where: {
          countryCode_mobileNumber: {
            countryCode: phone.countryCode,
            mobileNumber: phone.mobileNumber,
          },
        },
        include: { currentStatus: { select: { statusName: true } } },
      });

      let candidateId = existing?.id;
      if (existing) {
        stats.existingCandidates += 1;
        report.totals.existing += 1;
      } else {
        stats.candidatesToCreate += 1;
        report.totals.new += 1;
        if (apply && params.candidatesService) {
          try {
            const created = await params.candidatesService.create(
              dto,
              recruiterId,
              suppress,
            );
            candidateId = created.id;
          } catch (error) {
            if (error instanceof ConflictException) {
              const again = await params.prisma.candidate.findUnique({
                where: {
                  countryCode_mobileNumber: {
                    countryCode: phone.countryCode,
                    mobileNumber: phone.mobileNumber,
                  },
                },
                include: { currentStatus: { select: { statusName: true } } },
              });
              candidateId = again?.id;
              stats.candidatesToCreate -= 1;
              stats.existingCandidates += 1;
              report.totals.new -= 1;
              report.totals.existing += 1;
            } else {
              throw error;
            }
          }
        }
      }

      const lookupId = candidateId;
      if (lookupId) {
        const activeSame = await params.prisma.candidateRecruiterAssignment.findFirst({
          where: {
            candidateId: lookupId,
            recruiterId,
            isActive: true,
          },
        });
        if (activeSame) {
          stats.assignmentsAlreadyCorrect += 1;
        } else {
          stats.assignmentsNeeded += 1;
          report.totals.assignments += 1;
          if (apply && params.candidatesService) {
            await params.candidatesService.assignRecruiter(
              lookupId,
              {
                recruiterId,
                reason: 'GCC live-data import assignment',
                assignmentType: 'manual',
              },
              recruiterId,
              true,
            );
          }
        }

        const candidateForStatus =
          existing ??
          (await params.prisma.candidate.findUnique({
            where: { id: lookupId },
            include: { currentStatus: { select: { statusName: true } } },
          }));
        const latestHistory = await params.prisma.candidateStatusHistory.findFirst({
          where: {
            candidateId: lookupId,
            statusId: interested.id,
          },
          orderBy: { statusUpdatedAt: 'desc' },
        });
        const needsStatus = shouldUpdateInterestedStatus({
          currentStatusName: candidateForStatus?.currentStatus?.statusName,
          latestInterestedReason: latestHistory?.reason,
          excelRemarks: remarks,
        });
        if (needsStatus) {
          stats.statusUpdatesNeeded += 1;
          report.totals.statusUpdates += 1;
          if (apply && params.candidatesService) {
            await params.candidatesService.updateStatus(
              lookupId,
              {
                currentStatusId: interested.id,
                reason: remarks || undefined,
              },
              recruiterId,
              suppress,
            );
          }
        } else {
          stats.statusAlreadyCorrect += 1;
        }
      } else if (!apply) {
        stats.assignmentsNeeded += 1;
        report.totals.assignments += 1;
        stats.statusUpdatesNeeded += 1;
        report.totals.statusUpdates += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stats.invalidRows += 1;
      stats.skippedRows += 1;
      report.totals.invalid += 1;
      report.totals.rowErrors.push({
        sheet: row.sheet,
        row: row.rowNumber,
        error: message,
      });
      otherValidationRows.push({
        sheet: row.sheet,
        row: row.rowNumber,
        name: row.name ?? '',
        reason: message,
      });
    }
  }

  const byReason: Record<string, number> = {};
  for (const row of report.totals.invalidPhoneRows) {
    const bucket = groupInvalidPhoneReason(row.reason);
    byReason[bucket] = (byReason[bucket] ?? 0) + 1;
  }
  report.invalidSummary = {
    invalidPhones: {
      count: report.totals.invalidPhones,
      byReason,
      rows: report.totals.invalidPhoneRows,
    },
    duplicatePhones: {
      count: duplicatePhoneRows.length,
      rows: duplicatePhoneRows,
    },
    nameValidation: {
      count: nameValidationRows.length,
      rows: nameValidationRows,
    },
    otherValidation: {
      count: otherValidationRows.length,
      rows: otherValidationRows,
    },
  };

  mkdirSync(params.reportsDir, { recursive: true });
  const reportPath = join(
    params.reportsDir,
    `gcc-import-${apply ? 'apply' : 'dry-run'}-${Date.now()}.json`,
  );
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  return { report, reportPath };
}

export function parseGccCliArgs(argv: string[]): GccImportCliFlags & {
  sheet?: string;
  mapPath?: string;
  printRecruiterMap: boolean;
  help: boolean;
} {
  const flags = {
    apply: false,
    iAmLocalTestDb: false,
    excelPath: undefined as string | undefined,
    sheet: undefined as string | undefined,
    mapPath: undefined as string | undefined,
    printRecruiterMap: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') flags.apply = true;
    else if (arg === '--i-am-local-test-db') flags.iAmLocalTestDb = true;
    else if (arg === '--excel') flags.excelPath = argv[++i];
    else if (arg === '--sheet') flags.sheet = argv[++i];
    else if (arg === '--map') flags.mapPath = argv[++i];
    else if (arg === '--print-recruiter-map') flags.printRecruiterMap = true;
    else if (arg === '--help' || arg === '-h') flags.help = true;
  }
  return flags;
}
