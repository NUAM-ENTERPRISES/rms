import { Test, TestingModule } from '@nestjs/testing';
import { RecruiterAnalyticsService } from '../recruiter-analytics.service';
import { PrismaService } from '../../../database/prisma.service';
import {
  computePerformanceScore,
  resolvePerformanceRating,
} from '../recruiter-performance-rating.constants';

describe('Recruiter performance rating', () => {
  let service: RecruiterAnalyticsService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    candidate: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    candidateRecruiterAssignment: {
      findMany: jest.fn(),
    },
    candidateProjects: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecruiterAnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(RecruiterAnalyticsService);
    jest.clearAllMocks();
  });

  describe('computePerformanceScore', () => {
    it('matches the business example (score 113)', () => {
      const score = computePerformanceScore({
        positiveCandidate: 10,
        documentVerified: 8,
        interviewShortlisted: 7,
        interviewPassed: 5,
        processing: 3,
        deployed: 2,
      });
      expect(score).toBe(113);
    });
  });

  describe('resolvePerformanceRating', () => {
    it('assigns rating bands at boundaries', () => {
      expect(resolvePerformanceRating(0)).toBe('Poor');
      expect(resolvePerformanceRating(25)).toBe('Poor');
      expect(resolvePerformanceRating(26)).toBe('Average');
      expect(resolvePerformanceRating(50)).toBe('Average');
      expect(resolvePerformanceRating(51)).toBe('Good');
      expect(resolvePerformanceRating(75)).toBe('Good');
      expect(resolvePerformanceRating(76)).toBe('Excellent');
      expect(resolvePerformanceRating(100)).toBe('Excellent');
      expect(resolvePerformanceRating(101)).toBe('Outstanding');
      expect(resolvePerformanceRating(150)).toBe('Outstanding');
      expect(resolvePerformanceRating(151)).toBe('Top Performer');
    });
  });

  describe('getStageCountsForPeriod', () => {
    it('queries documents_verified sub-status for document verified count', async () => {
      mockPrisma.candidate.count.mockResolvedValue(0);
      mockPrisma.candidate.findMany.mockResolvedValue([]);

      await service.getStageCountsForPeriod(
        'rec-1',
        new Date(2026, 5, 1),
        new Date(2026, 5, 30, 23, 59, 59, 999),
      );

      const allCallsJson = JSON.stringify(mockPrisma.candidate.count.mock.calls);
      expect(allCallsJson).toContain('documents_verified');
    });

    it('scopes counts to recruiter-owned candidates', async () => {
      mockPrisma.candidate.count.mockResolvedValue(1);
      mockPrisma.candidate.findMany.mockResolvedValue([]);

      await service.getStageCountsForPeriod(
        'rec-1',
        new Date(2026, 0, 1),
        new Date(2026, 0, 31, 23, 59, 59, 999),
      );

      const allCallsJson = JSON.stringify(mockPrisma.candidate.count.mock.calls);
      expect(allCallsJson).toContain('rec-1');
      expect(allCallsJson).toContain('recruiterAssignments');
    });
  });

  describe('getPerformanceRating', () => {
    it('returns monthly and yearly blocks for a recruiter', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'rec-1',
        name: 'Recruiter A',
        email: 'a@test.com',
      });
      jest.spyOn(service, 'getStageCountsForPeriod').mockResolvedValue({
        positiveCandidate: 10,
        documentVerified: 8,
        interviewShortlisted: 7,
        interviewPassed: 5,
        processing: 3,
        deployed: 2,
      });

      const result = await service.getPerformanceRating('rec-1', {
        year: 2026,
        month: 6,
      });

      expect(result.success).toBe(true);
      expect(result.data?.monthly.score).toBe(113);
      expect(result.data?.monthly.rating).toBe('Outstanding');
      expect(result.data?.yearly.score).toBe(113);
    });

    it('returns not found when recruiter is missing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.getPerformanceRating('missing');
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
    });
  });

  describe('getPerformanceRatingsBatch', () => {
    it('returns monthly ratings for multiple recruiters in one call', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'rec-1' },
        { id: 'rec-2' },
      ]);
      jest
        .spyOn(service, 'getStageCountsForPeriodBatch')
        .mockResolvedValue(
          new Map([
            [
              'rec-1',
              {
                positiveCandidate: 10,
                documentVerified: 8,
                interviewShortlisted: 7,
                interviewPassed: 5,
                processing: 3,
                deployed: 2,
              },
            ],
            [
              'rec-2',
              {
                positiveCandidate: 1,
                documentVerified: 0,
                interviewShortlisted: 0,
                interviewPassed: 0,
                processing: 0,
                deployed: 0,
              },
            ],
          ]),
        );

      const result = await service.getPerformanceRatingsBatch(
        ['rec-1', 'rec-2', 'rec-1'],
        { year: 2026, month: 7 },
      );

      expect(result.success).toBe(true);
      expect(result.data.year).toBe(2026);
      expect(result.data.month).toBe(7);
      expect(result.data.ratings).toHaveLength(2);
      expect(result.data.ratings[0]).toEqual({
        recruiterId: 'rec-1',
        score: 113,
        rating: 'Outstanding',
      });
      expect(result.data.ratings[1].recruiterId).toBe('rec-2');
      expect(result.data.ratings[1].score).toBe(1);
      expect(service.getStageCountsForPeriodBatch).toHaveBeenCalledTimes(1);
      expect(service.getStageCountsForPeriodBatch).toHaveBeenCalledWith(
        ['rec-1', 'rec-2'],
        expect.any(Date),
        expect.any(Date),
      );
    });

    it('skips missing recruiter ids', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'rec-1' }]);
      jest.spyOn(service, 'getStageCountsForPeriodBatch').mockResolvedValue(
        new Map([
          [
            'rec-1',
            {
              positiveCandidate: 0,
              documentVerified: 0,
              interviewShortlisted: 0,
              interviewPassed: 0,
              processing: 0,
              deployed: 0,
            },
          ],
        ]),
      );

      const result = await service.getPerformanceRatingsBatch([
        'rec-1',
        'missing',
      ]);

      expect(result.data.ratings).toHaveLength(1);
      expect(result.data.ratings[0].recruiterId).toBe('rec-1');
      expect(service.getStageCountsForPeriodBatch).toHaveBeenCalledWith(
        ['rec-1'],
        expect.any(Date),
        expect.any(Date),
      );
    });
  });

  describe('getStageCountsForPeriodBatch', () => {
    it('computes per-recruiter counts with a fixed query set', async () => {
      mockPrisma.candidateRecruiterAssignment.findMany.mockResolvedValue([
        { recruiterId: 'rec-1', candidateId: 'c1' },
        { recruiterId: 'rec-2', candidateId: 'c2' },
      ]);
      mockPrisma.candidateProjects.findMany
        .mockResolvedValueOnce([
          { recruiterId: 'rec-1', candidateId: 'c1' },
          { recruiterId: 'rec-2', candidateId: 'c2' },
        ])
        // documentVerified / shortlisted / passed / processing / deployed project groups
        .mockResolvedValueOnce([{ recruiterId: 'rec-1', candidateId: 'c1' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ recruiterId: 'rec-1', candidateId: 'c1' }]);

      // positive CRM + deployed CRM matching candidates
      mockPrisma.candidate.findMany
        .mockResolvedValueOnce([{ id: 'c1' }, { id: 'c2' }])
        .mockResolvedValueOnce([{ id: 'c1' }]);

      const result = await service.getStageCountsForPeriodBatch(
        ['rec-1', 'rec-2'],
        new Date(2026, 6, 1),
        new Date(2026, 6, 31, 23, 59, 59, 999),
      );

      expect(result.get('rec-1')).toEqual({
        positiveCandidate: 1,
        documentVerified: 1,
        interviewShortlisted: 0,
        interviewPassed: 0,
        processing: 0,
        deployed: 1,
      });
      expect(result.get('rec-2')).toEqual({
        positiveCandidate: 1,
        documentVerified: 0,
        interviewShortlisted: 0,
        interviewPassed: 0,
        processing: 0,
        deployed: 0,
      });
      // scope (2) + 5 project-substatus groups + 2 CRM matching queries
      expect(mockPrisma.candidateRecruiterAssignment.findMany).toHaveBeenCalledTimes(
        1,
      );
      expect(mockPrisma.candidateProjects.findMany).toHaveBeenCalledTimes(6);
      expect(mockPrisma.candidate.findMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('getPerformanceLeaderboard', () => {
    it('ranks recruiters by performance score descending', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'rec-low', name: 'Low', email: 'l@test.com', countryCode: null, mobileNumber: null, profileImage: null },
        { id: 'rec-high', name: 'High', email: 'h@test.com', countryCode: null, mobileNumber: null, profileImage: null },
      ]);

      jest.spyOn(service, 'getStageCountsForPeriodBatch').mockResolvedValue(
        new Map([
          [
            'rec-high',
            {
              positiveCandidate: 10,
              documentVerified: 8,
              interviewShortlisted: 7,
              interviewPassed: 5,
              processing: 3,
              deployed: 2,
            },
          ],
          [
            'rec-low',
            {
              positiveCandidate: 1,
              documentVerified: 0,
              interviewShortlisted: 0,
              interviewPassed: 0,
              processing: 0,
              deployed: 0,
            },
          ],
        ]),
      );

      const result = await service.getPerformanceLeaderboard({
        year: 2026,
        month: 6,
        limit: 2,
      });

      expect(result.data.leaderboard[0].name).toBe('High');
      expect(result.data.leaderboard[0].performanceScore).toBe(113);
      expect(result.data.leaderboard[1].performanceScore).toBe(1);
    });
  });
});
