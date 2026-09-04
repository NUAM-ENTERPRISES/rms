import { Test } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import {
  RecruiterRef,
  RecruiterResolutionService,
} from './recruiter-resolution.service';

const RECRUITERS: RecruiterRef[] = [
  { id: 'u_fernandez', name: 'Fernandez', email: 'fernandez@affiniks.com' },
  { id: 'u_varundas', name: 'Varun Das', email: 'varundas@affiniks.com' },
  { id: 'u_tabassum', name: 'Tabassum', email: 'tabassum2026@affiniks.com' },
  { id: 'u_suvarna', name: 'Suvarna', email: 'suvarana@affiniks.com' },
  { id: 'u_siva', name: 'Siva', email: 'siva@affiniks.com' },
];

describe('RecruiterResolutionService', () => {
  let service: RecruiterResolutionService;
  let findMany: jest.Mock;

  beforeEach(async () => {
    findMany = jest.fn().mockResolvedValue(RECRUITERS);

    const moduleRef = await Test.createTestingModule({
      providers: [
        RecruiterResolutionService,
        { provide: PrismaService, useValue: { user: { findMany } } },
      ],
    }).compile();

    service = moduleRef.get(RecruiterResolutionService);
  });

  describe('resolveSheet', () => {
    it('matches a tab that is simply the recruiter name', () => {
      const result = service.resolveSheet('FERNANDEZ', RECRUITERS);

      expect(result.match).toBe('exact');
      expect(result.recruiterId).toBe('u_fernandez');
    });

    it('matches a tab whose spacing differs from the account name', () => {
      const result = service.resolveSheet('VARUNDAS', RECRUITERS);

      expect(result.match).toBe('exact');
      expect(result.recruiterId).toBe('u_varundas');
    });

    it('uses the email alias for TABASUM, which is spelled differently in the sheet', () => {
      const result = service.resolveSheet('TABASUM', RECRUITERS);

      expect(result.match).toBe('exact');
      expect(result.recruiterId).toBe('u_tabassum');
    });

    it('uses the email alias for SUVARNA, whose account email is misspelled', () => {
      const result = service.resolveSheet('SUVARNA', RECRUITERS);

      expect(result.match).toBe('exact');
      expect(result.recruiterId).toBe('u_suvarna');
    });

    it('refuses to guess when two recruiters match a tab equally well', () => {
      const ambiguous: RecruiterRef[] = [
        { id: 'u_asif_1', name: 'Asif', email: 'asif1@affiniks.com' },
        { id: 'u_asif_2', name: 'Asif', email: 'asif2@affiniks.com' },
      ];

      const result = service.resolveSheet('ASIF', ambiguous);

      expect(result.match).toBe('ambiguous');
      expect(result.recruiterId).toBeNull();
      // The reviewer gets both so the choice is one click.
      expect(result.candidates).toHaveLength(2);
    });

    it('reports no match for a tab that is not a person', () => {
      const result = service.resolveSheet('Sheet1', RECRUITERS);

      expect(result.match).toBe('none');
      expect(result.recruiterId).toBeNull();
    });

    it('reports no match for a blank tab name rather than throwing', () => {
      const result = service.resolveSheet('   ', RECRUITERS);

      expect(result.match).toBe('none');
      expect(result.recruiterId).toBeNull();
    });

    it('never takes ownership from the tab when nobody matches', () => {
      const result = service.resolveSheet('FERNANDEZ', []);

      expect(result.recruiterId).toBeNull();
    });
  });

  describe('suggestSheetOwners', () => {
    it('attributes every sheet to the uploader when a recruiter uploads their own file', async () => {
      const suggestions = await service.suggestSheetOwners(
        ['FERNANDEZ', 'VARUNDAS'],
        'u_siva',
      );

      expect(suggestions.every((s) => s.recruiterId === 'u_siva')).toBe(true);
      // No point querying recruiters when ownership is already decided.
      expect(findMany).not.toHaveBeenCalled();
    });

    it('resolves each tab independently for a manager uploading the whole workbook', async () => {
      const suggestions = await service.suggestSheetOwners([
        'FERNANDEZ',
        'TABASUM',
        'Sheet1',
      ]);

      expect(suggestions.map((s) => s.recruiterId)).toEqual([
        'u_fernandez',
        'u_tabassum',
        null,
      ]);
    });
  });
});
