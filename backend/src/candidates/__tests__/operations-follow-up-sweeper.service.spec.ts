import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { OperationsFollowUpSweeperService } from '../services/operations-follow-up-sweeper.service';
import { CandidatesService } from '../candidates.service';

describe('OperationsFollowUpSweeperService', () => {
  let sweeper: OperationsFollowUpSweeperService;

  const mockCandidatesService: {
    sweepOperationsFollowUp: jest.Mock<
      () => Promise<{ weekOneAdvanced: number; weekTwoJunked: number }>
    >;
  } = {
    sweepOperationsFollowUp: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperationsFollowUpSweeperService,
        { provide: CandidatesService, useValue: mockCandidatesService },
      ],
    }).compile();

    sweeper = module.get(OperationsFollowUpSweeperService);
  });

  it('delegates to CandidatesService.sweepOperationsFollowUp', async () => {
    mockCandidatesService.sweepOperationsFollowUp.mockResolvedValue({
      weekOneAdvanced: 2,
      weekTwoJunked: 1,
    });

    await sweeper.sweepOperationsFollowUp();

    expect(mockCandidatesService.sweepOperationsFollowUp).toHaveBeenCalledTimes(1);
  });
});
