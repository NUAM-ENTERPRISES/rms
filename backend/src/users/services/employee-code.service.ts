import { Injectable } from '@nestjs/common';

export interface EmployeeCodeSequenceTx {
  employeeCodeSequence: {
    upsert(args: {
      where: { year: number };
      create: { year: number; lastNumber: number };
      update: { lastNumber: { increment: number } };
      select: { lastNumber: true };
    }): Promise<{ lastNumber: number }>;
  };
}

const EMPLOYEE_CODE_PREFIX = 'AFFEMP';

function padAtLeast2(n: number): string {
  if (n < 10) return `0${n}`;
  return String(n);
}

export function formatEmployeeCode(sequence: number, year: number): string {
  return `${EMPLOYEE_CODE_PREFIX}${padAtLeast2(sequence)}${year}`;
}

@Injectable()
export class EmployeeCodeService {
  async reserveNextCode(tx: EmployeeCodeSequenceTx): Promise<string> {
    const year = new Date().getUTCFullYear();

    const row = await tx.employeeCodeSequence.upsert({
      where: { year },
      create: { year, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
      select: { lastNumber: true },
    });

    return formatEmployeeCode(row.lastNumber, year);
  }
}

