import { EmployeeCodeService, formatEmployeeCode } from '../employee-code.service';

describe('EmployeeCodeService', () => {
  const mockTx = {
    employeeCodeSequence: {
      upsert: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatEmployeeCode', () => {
    it('pads 1-digit sequence to 2 digits', () => {
      expect(formatEmployeeCode(1, 2026)).toBe('AFFEMP012026');
      expect(formatEmployeeCode(9, 2026)).toBe('AFFEMP092026');
    });

    it('does not pad 2+ digit sequences', () => {
      expect(formatEmployeeCode(10, 2026)).toBe('AFFEMP102026');
    });
  });

  describe('reserveNextCode', () => {
    it('upserts sequence for UTC year and formats', async () => {
      const service = new EmployeeCodeService();
      mockTx.employeeCodeSequence.upsert.mockResolvedValue({ lastNumber: 12 });

      const code = await service.reserveNextCode(mockTx);

      expect(mockTx.employeeCodeSequence.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { year: expect.any(Number) },
          create: { year: expect.any(Number), lastNumber: 1 },
          update: { lastNumber: { increment: 1 } },
          select: { lastNumber: true },
        }),
      );

      const year = new Date().getUTCFullYear();
      expect(code).toBe(`AFFEMP12${year}`);
    });
  });
});

