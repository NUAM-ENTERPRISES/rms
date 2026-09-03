import { Test } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { VertexAiService } from '../../vertex-ai/vertex-ai.service';
import { CatalogMappingService } from './catalog-mapping.service';

const NURSE = { id: 'pt_nurse', name: 'nurse', label: 'Nurse' };
const DOCTOR = { id: 'pt_doctor', name: 'doctor', label: 'Doctor' };

const QUALIFICATIONS = [
  {
    id: 'q_bsc_nursing',
    name: 'BSc Nursing',
    shortName: 'BSc Nursing',
    aliases: [{ alias: 'B.Sc Nursing' }, { alias: 'Bachelor of Science Nursing' }],
  },
  {
    id: 'q_post_basic',
    name: 'Post Basic BSc Nursing',
    shortName: 'PB BSc Nursing',
    aliases: [],
  },
  { id: 'q_bsc_mlt', name: 'BSc MLT', shortName: 'BSc MLT', aliases: [] },
];

function role(
  id: string,
  deptId: string,
  deptName: string,
  deptLabel: string,
  professionTypeId: string,
  label = 'Staff Nurse',
) {
  return {
    id,
    name: `${deptName}_${professionTypeId}`,
    label,
    shortName: null,
    roleDepartmentId: deptId,
    professionTypeId,
    roleDepartment: {
      id: deptId,
      name: deptName,
      label: deptLabel,
      shortName: null,
    },
  };
}

const ROLES = [
  role('rc_icu_nurse', 'dept_icu', 'icu', 'ICU', NURSE.id),
  role('rc_icu_doctor', 'dept_icu', 'icu', 'ICU', DOCTOR.id, 'Physician'),
  role('rc_emergency_nurse', 'dept_emergency', 'emergency', 'Emergency', NURSE.id),
];

describe('CatalogMappingService', () => {
  let service: CatalogMappingService;
  let generateStructured: jest.Mock;
  let isConfigured: jest.Mock;

  const snapshot = {
    qualifications: QUALIFICATIONS,
    roles: ROLES,
    professionTypes: [NURSE, DOCTOR],
  };

  beforeEach(async () => {
    generateStructured = jest.fn();
    isConfigured = jest.fn().mockReturnValue(false);

    const moduleRef = await Test.createTestingModule({
      providers: [
        CatalogMappingService,
        { provide: PrismaService, useValue: {} },
        {
          provide: VertexAiService,
          useValue: { generateStructured, isConfigured },
        },
      ],
    }).compile();

    service = moduleRef.get(CatalogMappingService);
  });

  const map = (
    rows: Array<{
      key: string;
      category: string;
      qualification: string;
      department: string;
    }>,
  ) => service.mapBatch(rows, snapshot);

  describe('deterministic matching', () => {
    it('matches a qualification spelled exactly as the catalog has it', async () => {
      const result = await map([
        { key: 'a', category: 'NURSE', qualification: 'BSc Nursing', department: 'ICU' },
      ]);

      const qualification = result.get('a')!.qualification;
      expect(qualification.decision).toBe('exact');
      expect(qualification.matchedId).toBe('q_bsc_nursing');
    });

    it('matches through an existing alias when the wording differs', async () => {
      const result = await map([
        {
          key: 'a',
          category: 'NURSE',
          qualification: 'Bachelor of Science Nursing',
          department: 'ICU',
        },
      ]);

      const qualification = result.get('a')!.qualification;
      expect(qualification.decision).toBe('alias');
      expect(qualification.matchedId).toBe('q_bsc_nursing');
    });

    it('matches a punctuation variant directly, without needing an alias', async () => {
      const result = await map([
        { key: 'a', category: 'NURSE', qualification: 'B.Sc Nursing', department: 'ICU' },
      ]);

      const qualification = result.get('a')!.qualification;
      expect(qualification.decision).toBe('exact');
      expect(qualification.matchedId).toBe('q_bsc_nursing');
    });

    it('treats punctuation and case as meaningless, so I.C.U resolves like ICU', async () => {
      const result = await map([
        { key: 'a', category: 'NURSE', qualification: 'BSc Nursing', department: 'I.C.U' },
        { key: 'b', category: 'nurse', qualification: 'BSc Nursing', department: 'icu' },
      ]);

      expect(result.get('a')!.role.matchedId).toBe('rc_icu_nurse');
      expect(result.get('b')!.role.matchedId).toBe('rc_icu_nurse');
    });

    it('resolves the same department to different roles per profession', async () => {
      const result = await map([
        { key: 'nurse', category: 'NURSE', qualification: '', department: 'ICU' },
        { key: 'doctor', category: 'DOCTOR', qualification: '', department: 'ICU' },
      ]);

      expect(result.get('nurse')!.role.matchedId).toBe('rc_icu_nurse');
      expect(result.get('doctor')!.role.matchedId).toBe('rc_icu_doctor');
    });

    it('accepts the plural the sheets use for professions', async () => {
      const result = await map([
        { key: 'a', category: 'NURSES', qualification: '', department: 'ICU' },
      ]);

      expect(result.get('a')!.professionType.matchedId).toBe(NURSE.id);
    });

    it('marks an empty cell as empty rather than a problem to review', async () => {
      const result = await map([
        { key: 'a', category: 'NURSE', qualification: '', department: '' },
      ]);

      expect(result.get('a')!.qualification.decision).toBe('empty');
      expect(result.get('a')!.role.decision).toBe('empty');
    });
  });

  describe('guardrails', () => {
    it('does not collapse a specific ICU variant into plain ICU on its own', async () => {
      const result = await map([
        { key: 'a', category: 'NURSE', qualification: '', department: 'Neuro ICU' },
      ]);

      const role = result.get('a')!.role;
      expect(role.decision).toBe('needs_review');
      expect(role.matchedId).toBeNull();
      // Plain ICU is offered as an option, but only a human can pick it.
      expect(role.options.map((option) => option.id)).toContain('rc_icu_nurse');
    });

    it('leaves an unmatched qualification for review with a useful shortlist', async () => {
      const result = await map([
        { key: 'a', category: 'NURSE', qualification: 'BMLT', department: 'ICU' },
      ]);

      const qualification = result.get('a')!.qualification;
      expect(qualification.decision).toBe('needs_review');
      expect(qualification.matchedId).toBeNull();
    });

    it('leaves everything in review when Vertex is not configured', async () => {
      const result = await map([
        { key: 'a', category: 'NURSE', qualification: 'BMLT', department: 'ICU' },
      ]);

      expect(generateStructured).not.toHaveBeenCalled();
      expect(result.get('a')!.qualification.decision).toBe('needs_review');
    });
  });

  describe('AI-assisted matching', () => {
    beforeEach(() => {
      isConfigured.mockReturnValue(true);
    });

    it('accepts a high-confidence match and records why', async () => {
      generateStructured.mockResolvedValue({
        data: {
          results: [
            {
              raw: 'BMLT',
              matchId: 'q_bsc_mlt',
              confidence: 0.93,
              reason: 'BMLT is the common abbreviation for BSc MLT.',
            },
          ],
        },
      });

      const result = await map([
        { key: 'a', category: 'NURSE', qualification: 'BMLT', department: 'ICU' },
      ]);

      const qualification = result.get('a')!.qualification;
      expect(qualification.decision).toBe('ai_match');
      expect(qualification.matchedId).toBe('q_bsc_mlt');
      expect(qualification.reason).toContain('abbreviation');
    });

    it('keeps a low-confidence match in review and surfaces the guess first', async () => {
      generateStructured.mockResolvedValue({
        data: {
          results: [
            {
              raw: 'BMLT',
              matchId: 'q_bsc_mlt',
              confidence: 0.55,
              reason: 'Possibly BSc MLT, but the sheet is ambiguous.',
            },
          ],
        },
      });

      const result = await map([
        { key: 'a', category: 'NURSE', qualification: 'BMLT', department: 'ICU' },
      ]);

      const qualification = result.get('a')!.qualification;
      expect(qualification.decision).toBe('needs_review');
      expect(qualification.matchedId).toBeNull();
      expect(qualification.options[0].id).toBe('q_bsc_mlt');
    });

    it('surfaces a proposed new value as a suggestion, never as a match', async () => {
      generateStructured.mockResolvedValue({
        data: {
          results: [
            {
              raw: 'BMLT',
              matchId: null,
              confidence: 0.4,
              reason: 'Nothing in the catalog covers this.',
              proposedNewValue: 'Bachelor of Medical Laboratory Technology',
            },
          ],
        },
      });

      const result = await map([
        { key: 'a', category: 'NURSE', qualification: 'BMLT', department: 'ICU' },
      ]);

      const qualification = result.get('a')!.qualification;
      expect(qualification.decision).toBe('ai_new_value');
      expect(qualification.matchedId).toBeNull();
      expect(qualification.proposedNewValue).toBe(
        'Bachelor of Medical Laboratory Technology',
      );
    });

    it('asks about each distinct value once, however many rows repeat it', async () => {
      generateStructured.mockResolvedValue({ data: { results: [] } });

      await map(
        Array.from({ length: 50 }, (_, index) => ({
          key: `row-${index}`,
          category: 'NURSE',
          qualification: 'BMLT',
          department: 'ICU',
        })),
      );

      // One call for qualifications, one for roles, regardless of row count.
      const qualificationCall = generateStructured.mock.calls.find(([args]) =>
        args.callerLabel.includes('qualifications'),
      );
      expect(qualificationCall).toBeDefined();
      expect(
        (qualificationCall![0].prompt.match(/BMLT/g) ?? []).length,
      ).toBe(1);
    });

    it('falls back to manual review when Vertex fails, without failing the batch', async () => {
      generateStructured.mockRejectedValue(new Error('Vertex timed out'));

      const result = await map([
        { key: 'a', category: 'NURSE', qualification: 'BMLT', department: 'ICU' },
      ]);

      expect(result.get('a')!.qualification.decision).toBe('needs_review');
    });
  });
});
