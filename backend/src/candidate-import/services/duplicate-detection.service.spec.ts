import { Test } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { NormalizedRow } from '../utils/excel-parser.util';
import { DuplicateDetectionService } from './duplicate-detection.service';

function row(overrides: Partial<NormalizedRow> = {}): NormalizedRow {
  return {
    firstName: 'THANVEER',
    lastName: 'UMER',
    countryCode: '+91',
    mobileNumber: '7893578949',
    email: null,
    passportNumber: null,
    gender: 'MALE',
    category: 'NURSE',
    qualification: 'BSc Nursing',
    department: 'ICU',
    licensingExam: undefined,
    dataFlow: undefined,
    preferredCountries: [],
    remarks: undefined,
    source: 'meta',
    rawLeadSource: 'METAA',
    ...overrides,
  };
}

describe('DuplicateDetectionService', () => {
  let service: DuplicateDetectionService;
  let findMany: jest.Mock;

  beforeEach(async () => {
    findMany = jest.fn().mockResolvedValue([]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        DuplicateDetectionService,
        { provide: PrismaService, useValue: { candidate: { findMany } } },
      ],
    }).compile();

    service = moduleRef.get(DuplicateDetectionService);
  });

  it('flags the second occurrence of a repeated mobile in the same upload', async () => {
    const results = await service.detect([
      { key: 'a', sheetName: 'VARUNDAS', rowNumber: 4, normalized: row() },
      { key: 'b', sheetName: 'VARUNDAS', rowNumber: 19, normalized: row() },
    ]);

    // The first row stays clean so it can still be imported.
    expect(results.get('a')!.issues).toHaveLength(0);

    const second = results.get('b')!.issues;
    expect(second).toHaveLength(1);
    expect(second[0].type).toBe('DUPLICATE_IN_FILE');
    expect(second[0].field).toBe('mobileNumber');
    expect(second[0].reference).toBe('VARUNDAS!4');
  });

  it('flags a repeated passport even when the phone numbers differ', async () => {
    const results = await service.detect([
      {
        key: 'a',
        sheetName: 'FERNANDEZ',
        rowNumber: 2,
        normalized: row({ passportNumber: 'P1234567' }),
      },
      {
        key: 'b',
        sheetName: 'FERNANDEZ',
        rowNumber: 9,
        normalized: row({
          mobileNumber: '9000000000',
          passportNumber: 'P1234567',
        }),
      },
    ]);

    const issues = results.get('b')!.issues;
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe('passportNumber');
  });

  it('does not treat two different people as duplicates', async () => {
    const results = await service.detect([
      { key: 'a', sheetName: 'S', rowNumber: 2, normalized: row() },
      {
        key: 'b',
        sheetName: 'S',
        rowNumber: 3,
        normalized: row({ mobileNumber: '9000000000' }),
      },
    ]);

    expect(results.get('a')!.issues).toHaveLength(0);
    expect(results.get('b')!.issues).toHaveLength(0);
  });

  it('never matches on name alone', async () => {
    // Same name, no shared identifier at all.
    const results = await service.detect([
      {
        key: 'a',
        sheetName: 'S',
        rowNumber: 2,
        normalized: row({ countryCode: '', mobileNumber: '' }),
      },
      {
        key: 'b',
        sheetName: 'S',
        rowNumber: 3,
        normalized: row({ countryCode: '', mobileNumber: '' }),
      },
    ]);

    expect(results.get('b')!.issues).toHaveLength(0);
  });

  it('reports a row that already exists in the CRM and links the candidate', async () => {
    const existing = {
      id: 'cand_1',
      candidateCode: 'AFF-0007',
      firstName: 'Thanveer',
      lastName: 'Umer',
      countryCode: '+91',
      mobileNumber: '7893578949',
      passportNumber: null,
    };
    findMany.mockImplementation(({ where }) =>
      Promise.resolve(where.OR ? [existing] : []),
    );

    const results = await service.detect([
      { key: 'a', sheetName: 'S', rowNumber: 2, normalized: row() },
    ]);

    const result = results.get('a')!;
    expect(result.existingCandidate).toEqual(existing);
    expect(result.issues[0].type).toBe('DUPLICATE_IN_DATABASE');
    expect(result.issues[0].message).toContain('AFF-0007');
  });

  it('prefers a passport match over a phone match when both exist', async () => {
    const byPassport = {
      id: 'cand_passport',
      candidateCode: 'AFF-0001',
      firstName: 'A',
      lastName: null,
      countryCode: null,
      mobileNumber: null,
      passportNumber: 'P1234567',
    };
    const byPhone = {
      id: 'cand_phone',
      candidateCode: 'AFF-0002',
      firstName: 'B',
      lastName: null,
      countryCode: '+91',
      mobileNumber: '7893578949',
      passportNumber: null,
    };
    findMany.mockImplementation(({ where }) =>
      Promise.resolve(
        where.passportNumber ? [byPassport] : where.OR ? [byPhone] : [],
      ),
    );

    const results = await service.detect([
      {
        key: 'a',
        sheetName: 'S',
        rowNumber: 2,
        normalized: row({ passportNumber: 'P1234567' }),
      },
    ]);

    expect(results.get('a')!.existingCandidate!.id).toBe('cand_passport');
  });

  it('skips the database entirely when no row carries an identifier', async () => {
    await service.detect([
      {
        key: 'a',
        sheetName: 'S',
        rowNumber: 2,
        normalized: row({ countryCode: '', mobileNumber: '' }),
      },
    ]);

    expect(findMany).not.toHaveBeenCalled();
  });
});
