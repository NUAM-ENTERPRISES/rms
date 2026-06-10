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
  OPERATIONS_CALL_OUTCOME,
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
      findMany: jest.fn(),
      update: jest.fn(),
    },
    candidate: {
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const logCallDto = {
    note: 'Called twice, no answer.',
    usedPhone: true,
    usedWhatsapp: false,
  };

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
            callOutcome: OPERATIONS_CALL_OUTCOME.NO_RESPONDED,
            attemptNumber: 1,
            usedPhone: true,
            usedWhatsapp: false,
          }),
        }),
      );
      expect(result.assignment.operationsCallAttempts).toBe(1);
      expect(result.callLog.note).toBe(logCallDto.note);
    });

    it('rejects when no contact method is selected', async () => {
      mockPrismaService.candidateRecruiterAssignment.findFirst.mockResolvedValue(
        baseAssignment,
      );

      await expect(
        service.logOperationsCall(candidateId, operationsUserId, {
          ...logCallDto,
          usedPhone: false,
          usedWhatsapp: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('starts the 1-week wait on the 3rd initial call without advancing stage', async () => {
      mockPrismaService.candidateRecruiterAssignment.findFirst.mockResolvedValue({
        ...baseAssignment,
        operationsCallAttempts: 2,
      });
      mockPrismaService.operationsCallLog.create.mockResolvedValue({
        id: 'log-3',
        attemptNumber: 3,
        note: logCallDto.note,
      });
      mockPrismaService.candidateRecruiterAssignment.update
        .mockResolvedValueOnce({
          ...baseAssignment,
          operationsCallAttempts: 3,
        })
        .mockResolvedValueOnce({
          ...baseAssignment,
          operationsCallAttempts: 3,
          operationsStageEnteredAt: new Date('2026-06-01T00:00:00.000Z'),
        });
      mockPrismaService.candidate.update.mockResolvedValue({});

      const result = await service.logOperationsCall(
        candidateId,
        operationsUserId,
        logCallDto,
      );

      expect((result as { startedWeekOneWait?: boolean }).startedWeekOneWait).toBe(
        true,
      );
      expect(result.assignment.operationsFollowUpStage).toBe(
        OPERATIONS_FOLLOW_UP_STAGE.INITIAL,
      );
      expect(result.assignment.operationsCallAttempts).toBe(3);
    });

    it('allows unlimited logging in week_one stage', async () => {
      mockPrismaService.candidateRecruiterAssignment.findFirst.mockResolvedValue({
        ...baseAssignment,
        operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE,
        operationsCallAttempts: 4,
      });
      mockPrismaService.operationsCallLog.create.mockResolvedValue({
        id: 'log-week-one',
        attemptNumber: 5,
      });
      mockPrismaService.candidateRecruiterAssignment.update.mockResolvedValue({
        ...baseAssignment,
        operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE,
        operationsCallAttempts: 5,
      });
      mockPrismaService.candidate.update.mockResolvedValue({});

      const result = await service.logOperationsCall(
        candidateId,
        operationsUserId,
        logCallDto,
      );

      expect(result.assignment.operationsCallAttempts).toBe(5);
      expect(mockPrismaService.operationsCallLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            followUpStage: OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE,
          }),
        }),
      );
    });

    it('marks junk when logging in week_two stage', async () => {
      mockPrismaService.candidateRecruiterAssignment.findFirst.mockResolvedValue({
        ...baseAssignment,
        operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO,
        operationsCallAttempts: 1,
      });
      mockPrismaService.operationsCallLog.create.mockResolvedValue({
        id: 'log-week-two',
        attemptNumber: 2,
      });
      mockPrismaService.candidateRecruiterAssignment.update
        .mockResolvedValueOnce({
          ...baseAssignment,
          operationsCallAttempts: 2,
        })
        .mockResolvedValueOnce({
          ...baseAssignment,
          operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.JUNK,
        });
      mockPrismaService.candidate.update.mockResolvedValue({ isJunk: true });

      const result = await service.logOperationsCall(
        candidateId,
        operationsUserId,
        logCallDto,
      );

      expect((result as { markedJunk?: boolean }).markedJunk).toBe(true);
      expect(result.assignment.operationsFollowUpStage).toBe(
        OPERATIONS_FOLLOW_UP_STAGE.JUNK,
      );
      expect(mockPrismaService.candidate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isJunk: true }),
        }),
      );
    });

    it('rejects logging in junk stage', async () => {
      mockPrismaService.candidateRecruiterAssignment.findFirst.mockResolvedValue({
        ...baseAssignment,
        operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.JUNK,
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

  describe('markOperationsNotInterested', () => {
    it('logs call and marks junk from initial stage', async () => {
      mockPrismaService.candidateRecruiterAssignment.findFirst.mockResolvedValue({
        ...baseAssignment,
        operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.INITIAL,
        operationsCallAttempts: 1,
      });
      mockPrismaService.operationsCallLog.create.mockResolvedValue({
        id: 'log-1',
        attemptNumber: 2,
      });
      mockPrismaService.candidateRecruiterAssignment.update.mockResolvedValue({
        ...baseAssignment,
        operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.JUNK,
      });
      mockPrismaService.candidate.update.mockResolvedValue({});

      const result = await service.markOperationsNotInterested(
        candidateId,
        operationsUserId,
        logCallDto,
      );

      expect((result as { markedJunk?: boolean }).markedJunk).toBe(true);
      expect(result.assignment.operationsFollowUpStage).toBe(
        OPERATIONS_FOLLOW_UP_STAGE.JUNK,
      );
      expect(mockPrismaService.operationsCallLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            callOutcome: OPERATIONS_CALL_OUTCOME.NOT_INTERESTED,
          }),
        }),
      );
    });

    it('logs callback for junk candidates without re-marking junk', async () => {
      mockPrismaService.candidateRecruiterAssignment.findFirst.mockResolvedValue({
        ...baseAssignment,
        operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.JUNK,
        operationsCallAttempts: 2,
      });
      mockPrismaService.operationsCallLog.create.mockResolvedValue({
        id: 'log-junk-callback',
        attemptNumber: 3,
      });
      mockPrismaService.candidateRecruiterAssignment.update.mockResolvedValue({
        ...baseAssignment,
        operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.JUNK,
        operationsCallAttempts: 3,
      });
      mockPrismaService.candidate.update.mockResolvedValue({});

      const result = await service.markOperationsNotInterested(
        candidateId,
        operationsUserId,
        logCallDto,
      );

      expect((result as { alreadyJunk?: boolean }).alreadyJunk).toBe(true);
      expect(result.assignment.operationsFollowUpStage).toBe(
        OPERATIONS_FOLLOW_UP_STAGE.JUNK,
      );
      expect(result.assignment.operationsCallAttempts).toBe(3);
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
      expect(mockPrismaService.candidate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isJunk: true }),
        }),
      );
    });
  });

  describe('sweepOperationsFollowUp', () => {
    it('advances overdue initial 3/3 to week_one, week_one to week_two, and marks overdue week_two as junk', async () => {
      mockPrismaService.candidateRecruiterAssignment.findMany
        .mockResolvedValueOnce([
          { id: 'assignment-initial', candidateId: 'candidate-initial' },
        ])
        .mockResolvedValueOnce([
          { id: 'assignment-week-one', candidateId: 'candidate-week-one' },
        ])
        .mockResolvedValueOnce([
          { id: 'assignment-week-two', candidateId: 'candidate-week-two' },
        ]);
      mockPrismaService.candidateRecruiterAssignment.update.mockResolvedValue({});
      mockPrismaService.candidate.update.mockResolvedValue({});

      const result = await service.sweepOperationsFollowUp();

      expect(result.initialAdvancedToWeekOne).toBe(1);
      expect(result.weekOneAdvanced).toBe(1);
      expect(result.weekTwoJunked).toBe(1);
      expect(mockPrismaService.candidateRecruiterAssignment.update).toHaveBeenCalled();
      expect(mockPrismaService.candidate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'candidate-week-two' },
          data: expect.objectContaining({ isJunk: true }),
        }),
      );
    });
  });

  describe('getCREAssignedSummary', () => {
    it('counts follow-up stages in summary buckets', async () => {
      mockPrismaService.candidate.findMany.mockResolvedValue([
        {
          isJunk: false,
          currentStatus: { statusName: 'untouched' },
          recruiterAssignments: [
            {
              assignmentType: CANDIDATE_ASSIGNMENT_TYPE.CRE_AUTO,
              operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.INITIAL,
            },
          ],
        },
        {
          isJunk: false,
          currentStatus: { statusName: 'rnr' },
          recruiterAssignments: [
            {
              assignmentType: CANDIDATE_ASSIGNMENT_TYPE.CRE_AUTO,
              operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE,
              operationsCallAttempts: 1,
              operationsLastCallAt: new Date('2026-06-01T00:00:00.000Z'),
              operationsStageEnteredAt: new Date('2026-06-01T00:00:00.000Z'),
            },
          ],
        },
        {
          isJunk: false,
          currentStatus: { statusName: 'untouched' },
          recruiterAssignments: [
            {
              assignmentType: CANDIDATE_ASSIGNMENT_TYPE.CRE_AUTO,
              operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.WEEK_ONE,
              operationsCallAttempts: 0,
              operationsLastCallAt: new Date('2026-06-08T00:00:00.000Z'),
              operationsStageEnteredAt: new Date('2026-06-08T00:00:00.000Z'),
            },
          ],
        },
        {
          isJunk: false,
          currentStatus: { statusName: 'rnr' },
          recruiterAssignments: [
            {
              assignmentType: CANDIDATE_ASSIGNMENT_TYPE.CRE_AUTO,
              operationsFollowUpStage: OPERATIONS_FOLLOW_UP_STAGE.WEEK_TWO,
            },
          ],
        },
        {
          isJunk: true,
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

      expect(summary.total).toBe(2);
      expect(summary.roleCounters.untouched).toBe(2);
      expect(summary.roleCounters.weekOne).toBe(1);
      expect(summary.roleCounters.weekTwo).toBe(1);
      expect(summary.roleCounters.junk).toBe(1);
    });
  });
});
