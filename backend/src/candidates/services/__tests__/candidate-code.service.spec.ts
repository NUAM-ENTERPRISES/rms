import { CandidateCodeService, formatCandidateCode } from '../candidate-code.service';

describe('CandidateCodeService', () => {
  const mockTx = {
    candidateCodeSequence: {
      upsert: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatCandidateCode', () => {
    it('pads 1-digit sequence to 2 digits', () => {
      expect(formatCandidateCode(1, 2026)).toBe('AFFCD012026');
      expect(formatCandidateCode(9, 2026)).toBe('AFFCD092026');
    });

    it('does not pad 2+ digit sequences', () => {
      expect(formatCandidateCode(10, 2026)).toBe('AFFCD102026');
      expect(formatCandidateCode(100, 2026)).toBe('AFFCD1002026');
    });
  });

  describe('reserveNextCode', () => {
    it('upserts sequence for UTC year and formats', async () => {
      const service = new CandidateCodeService();

      mockTx.candidateCodeSequence.upsert.mockResolvedValue({ lastNumber: 12 });

      const code = await service.reserveNextCode(mockTx);

      expect(mockTx.candidateCodeSequence.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { year: expect.any(Number) },
          create: { year: expect.any(Number), lastNumber: 1 },
          update: { lastNumber: { increment: 1 } },
          select: { lastNumber: true },
        }),
      );

      const year = new Date().getUTCFullYear();
      expect(code).toBe(`AFFCD12${year}`);
    });
  });
});

import { CandidateCodeService } from '../candidate-code.service';

describe('CandidateCodeService', () => {
  it('formats AFFCD01YYYY using the counter seq', async () => {
    const svc = new CandidateCodeService();

    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ last_seq: 1 }]),
    } as any;

    await expect(svc.getNextCandidateCode(tx, new Date('2026-05-27'))).resolves.toBe(
      'AFFCD012026',
    );
  });

  it('pads seq to two digits', async () => {
    const svc = new CandidateCodeService();

    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ last_seq: 12 }]),
    } as any;

    await expect(svc.getNextCandidateCode(tx, new Date('2026-01-01'))).resolves.toBe(
      'AFFCD122026',
    );
  });
});

