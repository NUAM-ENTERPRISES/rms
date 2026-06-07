import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CandidatesService } from '../candidates.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { PipelineService } from '../pipeline.service';
import { UnifiedEligibilityService } from '../../candidate-eligibility/unified-eligibility.service';
import { RecruiterAssignmentService } from '../services/recruiter-assignment.service';
import { RnrRemindersService } from '../../rnr-reminders/rnr-reminders.service';
import { CallbackRemindersService } from '../../callback-reminders/callback-reminders.service';
import { WhatsAppService } from '../../notifications/whatsapp.service';
import { WhatsAppNotificationService } from '../../notifications/whatsapp-notification.service';
import { CandidateCodeService } from '../services/candidate-code.service';
import { CandidateListFilterService } from '../services/candidate-list-filter.service';
import {
  CANDIDATE_ASSIGNMENT_TYPE,
  OPERATIONS_FOLLOW_UP_STAGE,
  OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE,
  OPERATIONS_WEEK_ONE_WAIT_MS,
  OPERATIONS_WEEK_TWO_WAIT_MS,
} from '../../common/constants/candidate-constants';
import { ROLE_NAMES } from '../../common/constants/role-ids';

describe('CandidatesService — Operations follow-up', () => {
  let service: CandidatesService;

  const operationsUserId = 'ops-user-1';
  const candidateId = 'candidate-1';

  const mockPrismaService: any = {
    $transaction: jest.fn((callback: (tx: any) => Promise<unknown>) => callback(mockPrismaService)),
    operationsCallLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    candidateRecruiterAssignment: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    candidate: {
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const logCallDto = { note: 'Called twice, no answer.' };

  const baseAssignment = {
    id: 'assignment-1',
    candidateId,
    recruiterId: operationsUserId,
    isActive: true,
    assignmentType: CANDIDATE_ASSIGNMENT_TYPE.CRE_AUTO,
    operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.INITIAL,
    operationsCallAttempts: 0,
    operationsLastCallAt: null,
    operationsStageEnteredAt: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidatesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OutboxService, useValue: { publishEvent: jest.fn() } },
        { provide: PipelineService, useValue: {} },
        { provide: UnifiedEligibilityService, useValue: {} },
        { provide: RecruiterAssignmentService, useValue: {} },
        { provide: RnrRemindersService, useValue: {} },
        { provide: CallbackRemindersService, useValue: {} },
        { provide: WhatsAppService, useValue: {} },
        { provide: WhatsAppNotificationService, useValue: {} },
        { provide: CandidateCodeService, useValue: {} },
        { provide: CandidateListFilterService, useValue: {} },
      ],
    }).compile();

    service = module.get(CandidatesService);
  });

  describe('logOperationsCall', () => {
    it('rejects logging beyond 3 attempts', async () => {
      mockPrismaService.candidateRecruiterAssignment.findFirst.mockResolvedValue({
        ...baseAssignment,
        operationsCallAttempts: OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE,
      });

      await expect(
        service.logOperationsCall(candidateId, operationsUserId, logCallDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('increments call attempts in initial stage and stores note', async () => {
      mockPrismaService.candidateRecruiterAssignment.findFirst.mockResolvedValue(
        baseAssignment,
      );
      mockPrismaService.operationsCallLog.create.mockResolvedValue({
        id: 'log-1',
        attemptNumber: 1,
        note: logCallDto.note,
      });
      mockPrismaService.candidateRecruiterAssignment.update.mockResolvedValue({
        ...baseAssignment,
        operationsCallAttempts: 1,
      });
      mockPrismaService.candidate.update.mockResolvedValue({});

      const result = await service.logOperationsCall(
        candidateId,
        operationsUserId,
        logCallDto,
      );

      expect(mockPrismaService.operationsCallLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            note: logCallDto.note,
            attemptNumber: 1,
          }),
        }),
      );
      expect(result.assignment.operationsCallAttempts).toBe(1);
      expect(result.callLog.note).toBe(logCallDto.note);
    });

    it('rejects when not in initial stage', async () => {
      mockPrismaService.candidateRecruiterAssignment.findFirst.mockResolvedValue({
        ...baseAssignment,
        operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE,
      });

      await expect(
        service.logOperationsCall(candidateId, operationsUserId, logCallDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when no active operations assignment', async () => {
      mockPrismaService.candidateRecruiterAssignment.findFirst.mockResolvedValue(null);

      await expect(
        service.logOperationsCall(candidateId, operationsUserId, logCallDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getOperationsCallHistory', () => {
    it('returns call logs for the operations assignment', async () => {
      mockPrismaService.candidateRecruiterAssignment.findFirst.mockResolvedValue(
        baseAssignment,
      );
      mockPrismaService.operationsCallLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          attemptNumber: 1,
          note: 'No answer',
          loggedAt: new Date(),
          loggedBy: { id: operationsUserId, name: 'Ops User' },
        },
      ]);

      const history = await service.getOperationsCallHistory(
        candidateId,
        operationsUserId,
        [],
        [ROLE_NAMES.OPERATIONS],
      );

      expect(history).toHaveLength(1);
      expect(history[0].note).toBe('No answer');
    });

    it('allows elevated users to view call history for any operations assignment', async () => {
      mockPrismaService.candidateRecruiterAssignment.findFirst.mockResolvedValue(
        baseAssignment,
      );
      mockPrismaService.operationsCallLog.findMany.mockResolvedValue([]);

      await service.getOperationsCallHistory(
        candidateId,
        'manager-id',
        ['read:operations_call_history'],
        [],
      );

      expect(mockPrismaService.candidateRecruiterAssignment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            candidateId,
            isActive: true,
          }),
        }),
      );
    });

    it('allows assigned recruiter to view call history for operations-handled candidates', async () => {
      mockPrismaService.candidateRecruiterAssignment.findFirst
        .mockResolvedValueOnce({
          ...baseAssignment,
          recruiterId: operationsUserId,
        })
        .mockResolvedValueOnce({
          id: 'recruiter-assignment',
          recruiterId: 'recruiter-id',
          isActive: true,
          assignmentType: CANDIDATE_ASSIGNMENT_TYPE.MANUAL,
        });
      mockPrismaService.operationsCallLog.findMany.mockResolvedValue([]);

      await service.getOperationsCallHistory(
        candidateId,
        'recruiter-id',
        [],
        ['Recruiter'],
      );

      expect(mockPrismaService.operationsCallLog.findMany).toHaveBeenCalled();
    });
  });

  describe('moveOperationsToWeekOne', () => {
    it('requires at least 3 logged calls', async () => {
      mockPrismaService.candidateRecruiterAssignment.findFirst.mockResolvedValue({
        ...baseAssignment,
        operationsCallAttempts: 2,
      });

      await expect(
        service.moveOperationsToWeekOne(candidateId, operationsUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('moves candidate to week_one after 3 calls', async () => {
      mockPrismaService.candidateRecruiterAssignment.findFirst.mockResolvedValue({
        ...baseAssignment,
        operationsCallAttempts: OPERATIONS_INITIAL_CALL_ATTEMPTS_BEFORE_WEEK_ONE,
      });
      mockPrismaService.candidateRecruiterAssignment.update.mockResolvedValue({
        ...baseAssignment,
        operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE,
        operationsCallAttempts: 0,
      });
      mockPrismaService.candidate.update.mockResolvedValue({});

      const result = await service.moveOperationsToWeekOne(
        candidateId,
        operationsUserId,
      );

      expect(result.assignment.operationsFollowUpStage).toBe(
        OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE,
      );
    });
  });

  describe('moveOperationsToWeekTwo', () => {
    it('rejects when 2-minute wait has not elapsed', async () => {
      mockPrismaService.candidateRecruiterAssignment.findFirst.mockResolvedValue({
        ...baseAssignment,
        operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE,
        operationsStageEnteredAt: new Date(),
      });

      await expect(
        service.moveOperationsToWeekTwo(candidateId, operationsUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('moves candidate from week_one to week_two after wait', async () => {
      mockPrismaService.candidateRecruiterAssignment.findFirst.mockResolvedValue({
        ...baseAssignment,
        operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE,
        operationsStageEnteredAt: new Date(Date.now() - OPERATIONS_WEEK_ONE_WAIT_MS),
      });
      mockPrismaService.candidateRecruiterAssignment.update.mockResolvedValue({
        ...baseAssignment,
        operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO,
      });
      mockPrismaService.candidate.update.mockResolvedValue({});

      const result = await service.moveOperationsToWeekTwo(
        candidateId,
        operationsUserId,
      );

      expect(result.assignment.operationsFollowUpStage).toBe(
        OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO,
      );
    });
  });

  describe('markOperationsJunk', () => {
    it('marks candidate junk from week_two only', async () => {
      mockPrismaService.candidateRecruiterAssignment.findFirst.mockResolvedValue({
        ...baseAssignment,
        operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE,
      });

      await expect(
        service.markOperationsJunk(candidateId, operationsUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects junk when 2-minute wait has not elapsed', async () => {
      mockPrismaService.candidateRecruiterAssignment.findFirst.mockResolvedValue({
        ...baseAssignment,
        operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO,
        operationsStageEnteredAt: new Date(),
      });

      await expect(
        service.markOperationsJunk(candidateId, operationsUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('marks candidate junk when in week_two after wait', async () => {
      mockPrismaService.candidateRecruiterAssignment.findFirst.mockResolvedValue({
        ...baseAssignment,
        operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO,
        operationsStageEnteredAt: new Date(Date.now() - OPERATIONS_WEEK_TWO_WAIT_MS),
      });
      mockPrismaService.candidateRecruiterAssignment.update.mockResolvedValue({
        ...baseAssignment,
        operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.JUNK,
      });
      mockPrismaService.candidate.update.mockResolvedValue({});

      const result = await service.markOperationsJunk(candidateId, operationsUserId);

      expect(result.assignment.operationsFollowUpStage).toBe(
        OPERATIONS_FOLLOW_UP_STAGE.JUNK,
      );
    });
  });

  describe('getCREAssignedSummary', () => {
    it('counts follow-up stages in summary buckets', async () => {
      mockPrismaService.candidate.findMany.mockResolvedValue([
        {
          currentStatus: { statusName: 'untouched' },
          recruiterAssignments: [
            {
              assignmentType: CANDIDATE_ASSIGNMENT_TYPE.CRE_AUTO,
              operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.INITIAL,
            },
          ],
        },
        {
          currentStatus: { statusName: 'rnr' },
          recruiterAssignments: [
            {
              assignmentType: CANDIDATE_ASSIGNMENT_TYPE.CRE_AUTO,
              operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE,
            },
          ],
        },
        {
          currentStatus: { statusName: 'rnr' },
          recruiterAssignments: [
            {
              assignmentType: CANDIDATE_ASSIGNMENT_TYPE.CRE_AUTO,
              operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO,
            },
          ],
        },
        {
          currentStatus: { statusName: 'rnr' },
          recruiterAssignments: [
            {
              assignmentType: CANDIDATE_ASSIGNMENT_TYPE.CRE_AUTO,
              operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.JUNK,
            },
          ],
        },
      ]);
      mockPrismaService.candidate.count.mockResolvedValue(0);

      const summary = await service.getCREAssignedSummary(operationsUserId);

      expect(summary.total).toBe(1);
      expect(summary.roleCounters.weekOne).toBe(1);
      expect(summary.roleCounters.weekTwo).toBe(1);
      expect(summary.roleCounters.junk).toBe(1);
    });
  });
});
