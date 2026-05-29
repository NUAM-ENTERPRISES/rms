import { Injectable } from '@nestjs/common';

export interface CandidateCodeSequenceTx {
  candidateCodeSequence: {
    upsert(args: {
      where: { year: number };
      create: { year: number; lastNumber: number };
      update: { lastNumber: { increment: number } };
      select: { lastNumber: true };
    }): Promise<{ lastNumber: number }>;
  };
}

const CANDIDATE_CODE_PREFIX = 'AFFCD';

function padAtLeast2(n: number): string {
  if (n < 10) return `0${n}`;
  return String(n);
}

export function formatCandidateCode(sequence: number, year: number): string {
  return `${CANDIDATE_CODE_PREFIX}${padAtLeast2(sequence)}${year}`;
}

@Injectable()
export class CandidateCodeService {
  async reserveNextCode(tx: CandidateCodeSequenceTx): Promise<string> {
    const year = new Date().getUTCFullYear();

    const row = await tx.candidateCodeSequence.upsert({
      where: { year },
      create: { year, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
      select: { lastNumber: true },
    });

    return formatCandidateCode(row.lastNumber, year);
  }
}
