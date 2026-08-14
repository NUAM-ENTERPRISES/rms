import { Gender } from '@prisma/client';
import { UserAccountStatus } from '@prisma/client';
import { ConflictException } from '@nestjs/common';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { GCC_NURSE_SHEETS, classifySheet, normalizeSheetName } from '../gcc-import.constants';
import {
  resolveInterestedStatus,
  resolveNurseProfessionType,
  shouldUpdateInterestedStatus,
} from '../gcc-import.lookups';
import {
  normalizeGccDataFlow,
  normalizeGccGender,
  normalizeGccName,
  normalizeGccPhone,
} from '../gcc-import.normalize';
import {
  assertLocalImportSafety,
  GccImportSafetyError,
} from '../gcc-import.safety';
import { parseGccCliArgs, runGccImport } from '../gcc-import.engine';
import { validateMappedRecruiter } from '../gcc-import.mapping';

describe('gcc sheet classification', () => {
  it('trims VARUNDAS trailing space', () => {
    expect(normalizeSheetName('VARUNDAS ')).toBe('VARUNDAS');
    expect(classifySheet('VARUNDAS ')).toBe('nurse');
  });

  it('never imports excluded sheets', () => {
    for (const sheet of ['SANDEEP', 'ATHULYA', 'SNEHA', 'DIVYA', 'ISNA']) {
      expect(classifySheet(sheet)).toBe('excluded');
    }
  });

  it('includes all 21 nurse sheets', () => {
    expect(GCC_NURSE_SHEETS).toHaveLength(21);
    expect(classifySheet('RAHUL')).toBe('nurse');
  });
});

describe('nurse profession lookup', () => {
  it('succeeds for exactly one', () => {
    expect(
      resolveNurseProfessionType([{ id: 'n1', name: 'nurse', isActive: true }]).id,
    ).toBe('n1');
  });
  it('aborts for zero', () => {
    expect(() => resolveNurseProfessionType([])).toThrow(/exactly one/);
  });
  it('aborts for multiple', () => {
    expect(() =>
      resolveNurseProfessionType([
        { id: 'a', name: 'nurse', isActive: true },
        { id: 'b', name: 'nurse', isActive: true },
      ]),
    ).toThrow(/exactly one/);
  });
});

describe('interested status lookup', () => {
  it('succeeds for exactly one', () => {
    expect(resolveInterestedStatus([{ id: 2, statusName: 'Interested' }]).id).toBe(2);
  });
  it('aborts for zero', () => {
    expect(() => resolveInterestedStatus([])).toThrow(/exactly one/);
  });
  it('aborts for multiple', () => {
    expect(() =>
      resolveInterestedStatus([
        { id: 2, statusName: 'Interested' },
        { id: 99, statusName: 'interested' },
      ]),
    ).toThrow(/exactly one/);
  });
});

describe('gender normalization', () => {
  it('maps male variants', () => {
    expect(normalizeGccGender('Male')).toBe(Gender.MALE);
    expect(normalizeGccGender('M')).toBe(Gender.MALE);
  });
  it('maps female spelling variants', () => {
    expect(normalizeGccGender('Female')).toBe(Gender.FEMALE);
    expect(normalizeGccGender('F')).toBe(Gender.FEMALE);
    expect(normalizeGccGender('FEMAL')).toBe(Gender.FEMALE);
  });
  it('omits unknown and blank', () => {
    expect(normalizeGccGender('')).toBeUndefined();
    expect(normalizeGccGender('unknown')).toBeUndefined();
  });
});

describe('phone normalization', () => {
  it('maps UAE and Saudi GCC prefixes', () => {
    expect(normalizeGccPhone('971564779320')).toEqual({
      ok: true,
      countryCode: '+971',
      mobileNumber: '564779320',
    });
    expect(normalizeGccPhone('966564403836')).toEqual({
      ok: true,
      countryCode: '+966',
      mobileNumber: '564403836',
    });
  });
  it('strips 91 prefix from 12 digits', () => {
    expect(normalizeGccPhone('919876543210')).toEqual({
      ok: true,
      countryCode: '+91',
      mobileNumber: '9876543210',
    });
  });
  it('strips a leading 0 from 11 digits', () => {
    expect(normalizeGccPhone('09876543210')).toEqual({
      ok: true,
      countryCode: '+91',
      mobileNumber: '9876543210',
    });
  });
  it('rejects multiple phones in one cell', () => {
    const result = normalizeGccPhone('6394110052,8887005931');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/multiple phone/);
    }
  });
  it('rejects qualification values in the phone column', () => {
    const result = normalizeGccPhone('BSC');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/not a number/);
    }
  });
  it('rejects scientific notation', () => {
    const result = normalizeGccPhone('7.339324073E9');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/scientific notation/);
    }
  });
  it('rejects invalid lengths and empty with diagnostic fields', () => {
    const short = normalizeGccPhone('12345');
    expect(short).toMatchObject({
      ok: false,
      raw: '12345',
      normalizedDigits: '12345',
      digitLength: 5,
      reason: 'unsupported phone digit length 5',
    });
    const long = normalizeGccPhone(7.1566279014e10);
    expect(long.ok).toBe(false);
    const empty = normalizeGccPhone('');
    expect(empty).toMatchObject({
      ok: false,
      raw: '',
      normalizedDigits: '',
      digitLength: 0,
      reason: 'empty or non-numeric phone',
    });
  });
});

describe('name parsing', () => {
  it('splits first token and remainder', () => {
    expect(normalizeGccName('DIVYA B JOY')).toEqual({
      ok: true,
      firstName: 'DIVYA',
      lastName: 'B JOY',
    });
  });
  it('rejects empty NAME only', () => {
    expect(normalizeGccName('').ok).toBe(false);
  });
  it('uses UNKNOWN lastName for a single token', () => {
    expect(normalizeGccName('RAJI')).toEqual({
      ok: true,
      firstName: 'RAJI',
      lastName: 'UNKNOWN',
    });
  });
});

describe('dataflow', () => {
  it('maps yes/no', () => {
    expect(normalizeGccDataFlow('YES')).toEqual({ ok: true, value: true });
    expect(normalizeGccDataFlow('NO')).toEqual({ ok: true, value: false });
    expect(normalizeGccDataFlow('')).toEqual({ ok: true, value: false });
  });
  it('maps known true variants', () => {
    expect(normalizeGccDataFlow('YES(KUWAIT)')).toEqual({ ok: true, value: true });
    expect(normalizeGccDataFlow('YES (QATAR, KUWAIT)')).toEqual({ ok: true, value: true });
    expect(normalizeGccDataFlow('YES (SAUDI)')).toEqual({ ok: true, value: true });
    expect(normalizeGccDataFlow('Yes ( Saudi)')).toEqual({ ok: true, value: true });
    expect(normalizeGccDataFlow('STARTED')).toEqual({ ok: true, value: true });
    expect(normalizeGccDataFlow('In progress')).toEqual({ ok: true, value: true });
    expect(normalizeGccDataFlow('ON GOING')).toEqual({ ok: true, value: true });
    expect(normalizeGccDataFlow('ONGOING')).toEqual({ ok: true, value: true });
    expect(normalizeGccDataFlow('COMPLETED(DEG)')).toEqual({ ok: true, value: true });
    expect(normalizeGccDataFlow('SAUDI-COMPLETED')).toEqual({ ok: true, value: true });
    expect(normalizeGccDataFlow('YEA')).toEqual({ ok: true, value: true });
  });
  it('maps NOT DONE to false', () => {
    expect(normalizeGccDataFlow('NOT DONE')).toEqual({ ok: true, value: false });
  });
  it('leaves genuinely ambiguous values unknown', () => {
    expect(normalizeGccDataFlow('NIO')).toEqual({ ok: false, raw: 'NIO' });
    expect(normalizeGccDataFlow('SHE HAS PROMETRIC')).toEqual({
      ok: false,
      raw: 'SHE HAS PROMETRIC',
    });
    expect(normalizeGccDataFlow('On process is her Dataflow')).toEqual({
      ok: false,
      raw: 'On process is her Dataflow',
    });
    expect(normalizeGccDataFlow('PENDING')).toEqual({ ok: false, raw: 'PENDING' });
  });
});

describe('status idempotency', () => {
  it('skips when already Interested with same remark', () => {
    expect(
      shouldUpdateInterestedStatus({
        currentStatusName: 'Interested',
        latestInterestedReason: 'OMAN INTRESTED',
        excelRemarks: 'OMAN INTRESTED',
      }),
    ).toBe(false);
  });
  it('updates when remark differs', () => {
    expect(
      shouldUpdateInterestedStatus({
        currentStatusName: 'Interested',
        latestInterestedReason: 'old',
        excelRemarks: 'new',
      }),
    ).toBe(true);
  });
  it('updates new candidate (not Interested yet)', () => {
    expect(
      shouldUpdateInterestedStatus({
        currentStatusName: 'Untouched',
        latestInterestedReason: null,
        excelRemarks: 'note',
      }),
    ).toBe(true);
  });
  it('skips already Interested with empty remark', () => {
    expect(
      shouldUpdateInterestedStatus({
        currentStatusName: 'Interested',
        latestInterestedReason: 'Initial candidate creation',
        excelRemarks: '',
      }),
    ).toBe(false);
  });
});

describe('production guards', () => {
  it('aborts NODE_ENV production', () => {
    expect(() =>
      assertLocalImportSafety({
        nodeEnv: 'production',
        databaseUrl: 'postgresql://postgres:password@127.0.0.1:5433/affiniks_rms',
        flags: { apply: false, iAmLocalTestDb: false },
      }),
    ).toThrow(GccImportSafetyError);
  });
  it('aborts local host on port other than 5433', () => {
    expect(() =>
      assertLocalImportSafety({
        nodeEnv: 'development',
        databaseUrl: 'postgresql://postgres:password@127.0.0.1:5432/affiniks_rms',
        flags: { apply: false, iAmLocalTestDb: false },
      }),
    ).toThrow(/5433/);
  });
  it('aborts remote DB host', () => {
    expect(() =>
      assertLocalImportSafety({
        nodeEnv: 'development',
        databaseUrl: 'postgresql://u:p@db.digitalocean.com:5432/affiniks_rms',
        flags: { apply: false, iAmLocalTestDb: false },
      }),
    ).toThrow(/allow-listed/);
  });
  it('aborts apply without local flag', () => {
    expect(() =>
      assertLocalImportSafety({
        nodeEnv: 'development',
        databaseUrl: 'postgresql://postgres:password@127.0.0.1:5433/affiniks_rms',
        flags: { apply: true, iAmLocalTestDb: false, excelPath: '/tmp/a.xlsx' },
      }),
    ).toThrow(/i-am-local-test-db/);
  });
  it('parseArgs without --apply is dry-run', () => {
    const flags = parseGccCliArgs(['--excel', '/tmp/a.xlsx']);
    expect(flags.apply).toBe(false);
  });
});

describe('recruiter mapping validation', () => {
  it('requires Recruiter role and ACTIVE', () => {
    expect(() =>
      validateMappedRecruiter('RAHUL', {
        id: 'u1',
        name: 'Rahul',
        accountStatus: UserAccountStatus.INACTIVE,
        userRoles: [{ role: { name: 'Recruiter' } }],
      }),
    ).toThrow(/ACTIVE/);
    expect(() =>
      validateMappedRecruiter('RAHUL', {
        id: 'u1',
        name: 'Rahul',
        accountStatus: UserAccountStatus.ACTIVE,
        userRoles: [{ role: { name: 'Manager' } }],
      }),
    ).toThrow(/Recruiter/);
  });
});

function nurseMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const sheet of GCC_NURSE_SHEETS) map[sheet] = `user-${sheet}`;
  return map;
}

describe('engine dry-run / apply isolation', () => {
  const reportsDir = join(tmpdir(), `gcc-import-test-${Date.now()}`);

  function prismaStub(opts?: {
    existing?: { id: string; statusName: string } | null;
    assignmentExists?: boolean;
    latestReason?: string | null;
  }) {
    const map = nurseMap();
    return {
      professionType: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'nurse-id', name: 'nurse', isActive: true },
        ]),
      },
      candidateStatus: {
        findMany: jest.fn().mockResolvedValue([
          { id: 2, statusName: 'Interested' },
        ]),
      },
      user: {
        findUnique: jest.fn().mockImplementation(({ where: { id } }) =>
          Promise.resolve({
            id,
            name: id,
            accountStatus: 'ACTIVE',
            userRoles: [{ role: { name: 'Recruiter' } }],
          }),
        ),
      },
      candidate: {
        findUnique: jest.fn().mockResolvedValue(
          opts?.existing
            ? {
                id: opts.existing.id,
                currentStatusId: 2,
                currentStatus: { statusName: opts.existing.statusName },
              }
            : null,
        ),
      },
      candidateRecruiterAssignment: {
        findFirst: jest.fn().mockResolvedValue(
          opts?.assignmentExists ? { id: 'as1' } : null,
        ),
      },
      candidateStatusHistory: {
        findFirst: jest.fn().mockResolvedValue(
          opts?.latestReason !== undefined
            ? { reason: opts.latestReason }
            : null,
        ),
      },
      _map: map,
    };
  }

  it('duplicate detection counts existing and does not create', async () => {
    const prisma = prismaStub({
      existing: { id: 'c1', statusName: 'Interested' },
      assignmentExists: true,
      latestReason: 'same',
    });
    const create = jest.fn();
    require('fs').mkdirSync(reportsDir, { recursive: true });
    const mapPath = join(reportsDir, 'map.json');
    writeFileSync(mapPath, JSON.stringify(nurseMap()));

    const { report } = await runGccImport({
      excelPath: '/tmp/unused.xlsx',
      mapPath,
      flags: { apply: false, iAmLocalTestDb: false, excelPath: '/tmp/unused.xlsx' },
      prisma: prisma as never,
      reportsDir,
      workbookOverride: {
        excludedSheets: ['DIVYA'],
        unknownSheets: [],
        rows: [
          {
            sheet: 'RAHUL',
            rowNumber: 2,
            name: 'DIVYA B JOY',
            mobile: '9876543210',
            remarks: 'same',
            dataFlow: 'NO',
            gender: 'FEMALE',
          },
        ],
      },
      candidatesService: { create, assignRecruiter: jest.fn(), updateStatus: jest.fn() },
    });
    expect(create).not.toHaveBeenCalled();
    expect(report.totals.existing).toBe(1);
    expect(report.totals.new).toBe(0);
    expect(report.excludedSheets).toContain('DIVYA');
  });

  it('assignment reconciliation skips when active recruiter matches', async () => {
    const prisma = prismaStub({
      existing: { id: 'c1', statusName: 'Interested' },
      assignmentExists: true,
      latestReason: 'note',
    });
    const assignRecruiter = jest.fn();
    const mapPath = join(reportsDir, 'map2.json');
    require('fs').mkdirSync(reportsDir, { recursive: true });
    writeFileSync(mapPath, JSON.stringify(nurseMap()));
    const { report } = await runGccImport({
      excelPath: '/tmp/unused.xlsx',
      mapPath,
      flags: { apply: true, iAmLocalTestDb: true, excelPath: '/tmp/unused.xlsx' },
      prisma: prisma as never,
      reportsDir,
      workbookOverride: {
        excludedSheets: [],
        unknownSheets: [],
        rows: [
          {
            sheet: 'RAHUL',
            rowNumber: 2,
            name: 'ANANTH KUMAR',
            mobile: '9042318733',
            remarks: 'note',
          },
        ],
      },
      candidatesService: {
        create: jest.fn(),
        assignRecruiter,
        updateStatus: jest.fn(),
      },
    });
    expect(assignRecruiter).not.toHaveBeenCalled();
    expect(report.recruiters.RAHUL.assignmentsAlreadyCorrect).toBe(1);
  });

  it('assignment calls assignRecruiter when missing', async () => {
    const prisma = prismaStub({
      existing: { id: 'c1', statusName: 'Interested' },
      assignmentExists: false,
      latestReason: 'note',
    });
    const assignRecruiter = jest.fn().mockResolvedValue({});
    const mapPath = join(reportsDir, 'map3.json');
    require('fs').mkdirSync(reportsDir, { recursive: true });
    writeFileSync(mapPath, JSON.stringify(nurseMap()));
    await runGccImport({
      excelPath: '/tmp/unused.xlsx',
      mapPath,
      flags: { apply: true, iAmLocalTestDb: true, excelPath: '/tmp/unused.xlsx' },
      prisma: prisma as never,
      reportsDir,
      workbookOverride: {
        excludedSheets: [],
        unknownSheets: [],
        rows: [
          {
            sheet: 'RAHUL',
            rowNumber: 2,
            name: 'ANANTH KUMAR',
            mobile: '9042318733',
            remarks: 'note',
          },
        ],
      },
      candidatesService: {
        create: jest.fn(),
        assignRecruiter,
        updateStatus: jest.fn(),
      },
    });
    expect(assignRecruiter).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ recruiterId: 'user-RAHUL' }),
      'user-RAHUL',
      true,
    );
  });

  it('isolates per-row errors', async () => {
    const prisma = prismaStub();
    const create = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ id: 'c2' });
    const mapPath = join(reportsDir, 'map4.json');
    require('fs').mkdirSync(reportsDir, { recursive: true });
    writeFileSync(mapPath, JSON.stringify(nurseMap()));
    const { report } = await runGccImport({
      excelPath: '/tmp/unused.xlsx',
      mapPath,
      flags: { apply: true, iAmLocalTestDb: true, excelPath: '/tmp/unused.xlsx' },
      prisma: prisma as never,
      reportsDir,
      workbookOverride: {
        excludedSheets: [],
        unknownSheets: [],
        rows: [
          {
            sheet: 'RAHUL',
            rowNumber: 2,
            name: 'ONE PERSON',
            mobile: '9000000001',
          },
          {
            sheet: 'RAHUL',
            rowNumber: 3,
            name: 'TWO PERSON',
            mobile: '9000000002',
          },
        ],
      },
      candidatesService: {
        create,
        assignRecruiter: jest.fn().mockResolvedValue({}),
        updateStatus: jest.fn().mockResolvedValue({}),
      },
    });
    expect(create).toHaveBeenCalledTimes(2);
    expect(report.totals.rowErrors).toHaveLength(1);
    expect(report.totals.new).toBeGreaterThanOrEqual(1);
  });

  it('treats ConflictException as existing', async () => {
    const prisma = prismaStub();
    prisma.candidate.findUnique = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValue({
        id: 'existing-id',
        currentStatusId: 2,
        currentStatus: { statusName: 'Interested' },
      });
    const create = jest.fn().mockRejectedValue(new ConflictException('dup'));
    const mapPath = join(reportsDir, 'map5.json');
    require('fs').mkdirSync(reportsDir, { recursive: true });
    writeFileSync(mapPath, JSON.stringify(nurseMap()));
    const { report } = await runGccImport({
      excelPath: '/tmp/unused.xlsx',
      mapPath,
      flags: { apply: true, iAmLocalTestDb: true, excelPath: '/tmp/unused.xlsx' },
      prisma: prisma as never,
      reportsDir,
      workbookOverride: {
        excludedSheets: [],
        unknownSheets: [],
        rows: [
          {
            sheet: 'RAHUL',
            rowNumber: 2,
            name: 'ONE PERSON',
            mobile: '9000000001',
            remarks: 'x',
          },
        ],
      },
      candidatesService: {
        create,
        assignRecruiter: jest.fn().mockResolvedValue({}),
        updateStatus: jest.fn().mockResolvedValue({}),
      },
    });
    expect(report.totals.existing).toBe(1);
    expect(report.totals.new).toBe(0);
  });

  it('passes suppressExternalSideEffects on create and updateStatus', async () => {
    const prisma = prismaStub();
    const create = jest.fn().mockResolvedValue({ id: 'new1' });
    const updateStatus = jest.fn().mockResolvedValue({});
    const mapPath = join(reportsDir, 'map6.json');
    require('fs').mkdirSync(reportsDir, { recursive: true });
    writeFileSync(mapPath, JSON.stringify(nurseMap()));
    await runGccImport({
      excelPath: '/tmp/unused.xlsx',
      mapPath,
      flags: { apply: true, iAmLocalTestDb: true, excelPath: '/tmp/unused.xlsx' },
      prisma: prisma as never,
      reportsDir,
      workbookOverride: {
        excludedSheets: [],
        unknownSheets: [],
        rows: [
          {
            sheet: 'RAHUL',
            rowNumber: 2,
            name: 'ONE PERSON',
            mobile: '9000000001',
            remarks: 'hello',
          },
        ],
      },
      candidatesService: {
        create,
        assignRecruiter: jest.fn().mockResolvedValue({}),
        updateStatus,
      },
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        professionTypeId: 'nurse-id',
        source: 'manual',
        currentStatusId: 2,
      }),
      'user-RAHUL',
      { suppressExternalSideEffects: true },
    );
    expect(updateStatus).toHaveBeenCalledWith(
      'new1',
      expect.objectContaining({ currentStatusId: 2, reason: 'hello' }),
      'user-RAHUL',
      { suppressExternalSideEffects: true },
    );
  });

  it('dry-run never writes via CandidatesService', async () => {
    const prisma = prismaStub();
    const create = jest.fn();
    const assignRecruiter = jest.fn();
    const updateStatus = jest.fn();
    const mapPath = join(reportsDir, 'map-dry.json');
    require('fs').mkdirSync(reportsDir, { recursive: true });
    writeFileSync(mapPath, JSON.stringify(nurseMap()));
    const { report } = await runGccImport({
      excelPath: '/tmp/unused.xlsx',
      mapPath,
      flags: { apply: false, iAmLocalTestDb: false, excelPath: '/tmp/unused.xlsx' },
      prisma: prisma as never,
      reportsDir,
      workbookOverride: {
        excludedSheets: [],
        unknownSheets: [],
        rows: [
          {
            sheet: 'RAHUL',
            rowNumber: 2,
            name: 'ONE PERSON',
            mobile: '9000000001',
            remarks: 'hello',
          },
        ],
      },
      candidatesService: { create, assignRecruiter, updateStatus },
    });
    expect(create).not.toHaveBeenCalled();
    expect(assignRecruiter).not.toHaveBeenCalled();
    expect(updateStatus).not.toHaveBeenCalled();
    expect(report.mode).toBe('dry-run');
    expect(report.totals.new).toBe(1);
  });

  it('records invalidPhoneRows with sheet, row, name, raw, digits, length, reason', async () => {
    const prisma = prismaStub();
    const mapPath = join(reportsDir, 'map-phone.json');
    require('fs').mkdirSync(reportsDir, { recursive: true });
    writeFileSync(mapPath, JSON.stringify(nurseMap()));
    const { report } = await runGccImport({
      excelPath: '/tmp/unused.xlsx',
      mapPath,
      flags: { apply: false, iAmLocalTestDb: false, excelPath: '/tmp/unused.xlsx' },
      prisma: prisma as never,
      reportsDir,
      workbookOverride: {
        excludedSheets: [],
        unknownSheets: [],
        rows: [
          {
            sheet: 'RAHUL',
            rowNumber: 7,
            name: 'BAD PHONE',
            mobile: '12345',
          },
        ],
      },
    });
    expect(report.totals.invalidPhones).toBe(1);
    expect(report.totals.invalidPhoneRows[0]).toEqual({
      sheet: 'RAHUL',
      row: 7,
      name: 'BAD PHONE',
      rawPhone: '12345',
      normalizedDigits: '12345',
      digitLength: 5,
      reason: 'unsupported phone digit length 5',
    });
    expect(report.invalidSummary.invalidPhones.byReason).toEqual({
      'unsupported phone digit length': 1,
    });
  });

  it('groups duplicate phones with the first conflicting row', async () => {
    const prisma = prismaStub();
    const mapPath = join(reportsDir, 'map-dup.json');
    require('fs').mkdirSync(reportsDir, { recursive: true });
    writeFileSync(mapPath, JSON.stringify(nurseMap()));
    const { report } = await runGccImport({
      excelPath: '/tmp/unused.xlsx',
      mapPath,
      flags: { apply: false, iAmLocalTestDb: false, excelPath: '/tmp/unused.xlsx' },
      prisma: prisma as never,
      reportsDir,
      workbookOverride: {
        excludedSheets: [],
        unknownSheets: [],
        rows: [
          {
            sheet: 'RAHUL',
            rowNumber: 2,
            name: 'FIRST PERSON',
            mobile: '9876543210',
          },
          {
            sheet: 'FERNANDEZ',
            rowNumber: 9,
            name: 'SECOND PERSON',
            mobile: '9876543210',
          },
        ],
      },
    });
    expect(report.totals.excelDuplicates).toBe(1);
    expect(report.invalidSummary.duplicatePhones.rows[0]).toEqual({
      sheet: 'FERNANDEZ',
      row: 9,
      name: 'SECOND PERSON',
      phone: '+919876543210',
      duplicateOf: {
        sheet: 'RAHUL',
        row: 2,
        name: 'FIRST PERSON',
        phone: '+919876543210',
      },
    });
  });

  it('groups empty NAME into nameValidation', async () => {
    const prisma = prismaStub();
    const mapPath = join(reportsDir, 'map-name.json');
    require('fs').mkdirSync(reportsDir, { recursive: true });
    writeFileSync(mapPath, JSON.stringify(nurseMap()));
    const { report } = await runGccImport({
      excelPath: '/tmp/unused.xlsx',
      mapPath,
      flags: { apply: false, iAmLocalTestDb: false, excelPath: '/tmp/unused.xlsx' },
      prisma: prisma as never,
      reportsDir,
      workbookOverride: {
        excludedSheets: [],
        unknownSheets: [],
        rows: [
          {
            sheet: 'RAHUL',
            rowNumber: 3,
            name: '',
            mobile: '9876543210',
          },
        ],
      },
    });
    expect(report.invalidSummary.nameValidation.rows[0]).toMatchObject({
      sheet: 'RAHUL',
      row: 3,
      reason: 'empty NAME',
    });
  });
});

describe('cli parse', () => {
  it('parses flags', () => {
    const flags = parseGccCliArgs([
      '--excel',
      '/tmp/a.xlsx',
      '--i-am-local-test-db',
      '--apply',
      '--sheet',
      'RAHUL',
    ]);
    expect(flags.apply).toBe(true);
    expect(flags.iAmLocalTestDb).toBe(true);
    expect(flags.excelPath).toBe('/tmp/a.xlsx');
    expect(flags.sheet).toBe('RAHUL');
  });
});
