import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ProcessingService } from '../processing.service';
import { CandidateProjectsService } from '../../candidate-projects/candidate-projects.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { ProcessingRemindersService } from '../../processing-reminders/processing-reminders.service';
import {
  STATUS_CHANGE_REQUEST_TYPES,
  isProcessingStatusTransitionAllowed,
} from '../../common/constants/statuses';

describe('Processing status transition helpers', () => {
  it('allows phase 2 transition matrix', () => {
    expect(
      isProcessingStatusTransitionAllowed(
        STATUS_CHANGE_REQUEST_TYPES.PROCESSING_REACTIVATE,
        'cancelled',
      ),
    ).toBe(true);
    expect(
      isProcessingStatusTransitionAllowed(
        STATUS_CHANGE_REQUEST_TYPES.PROCESSING_HOLD,
        'cancelled',
      ),
    ).toBe(true);
    expect(
      isProcessingStatusTransitionAllowed(
        STATUS_CHANGE_REQUEST_TYPES.PROCESSING_CANCEL,
        'on_hold',
      ),
    ).toBe(true);
    expect(
      isProcessingStatusTransitionAllowed(
        STATUS_CHANGE_REQUEST_TYPES.PROCESSING_CANCEL,
        'cancelled',
      ),
    ).toBe(false);
  });
});

describe('ProcessingService status change requests', () => {
  let service: ProcessingService;
  let prisma: any;
  let candidateProjectsService: {
    createStatusChangeRequest: jest.Mock;
  };

  beforeEach(async () => {
    candidateProjectsService = {
      createStatusChangeRequest: jest.fn().mockResolvedValue({ id: 'req-1', status: 'pending' }),
    };

    prisma = {
      processingStep: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      processingCandidate: {
        findUnique: jest.fn(),
      },
      processingHistory: {
        findFirst: jest.fn(),
      },
      candidateProjectSubStatus: {
        findUnique: jest.fn(),
      },
      candidateProjects: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      candidateProjectStatusHistory: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessingService,
        { provide: PrismaService, useValue: prisma },
        { provide: OutboxService, useValue: {} },
        { provide: ProcessingRemindersService, useValue: { cancelReminder: jest.fn() } },
        { provide: CandidateProjectsService, useValue: candidateProjectsService },
      ],
    }).compile();

    service = module.get(ProcessingService);
  });

  it('delegates createProcessingStatusChangeRequest to candidate projects service', async () => {
    prisma.processingStep.findUnique.mockResolvedValue({
      id: 'step-1',
      template: { key: 'hrd' },
      processingCandidate: {
        id: 'pc-1',
        processingStatus: 'in_progress',
        assignedProcessingTeamUserId: 'user-2',
        candidateProjectMap: { id: 'cpm-1' },
      },
    });

    await service.createProcessingStatusChangeRequest(
      {
        processingStepId: 'step-1',
        requestType: STATUS_CHANGE_REQUEST_TYPES.PROCESSING_CANCEL,
        reason: 'Candidate withdrew from project',
      },
      'user-1',
    );

    expect(candidateProjectsService.createStatusChangeRequest).toHaveBeenCalledWith(
      'cpm-1',
      expect.objectContaining({
        requestType: STATUS_CHANGE_REQUEST_TYPES.PROCESSING_CANCEL,
        requestedStatus: 'processing_cancelled',
        processingStepId: 'step-1',
        stepKey: 'hrd',
        processingCandidateId: 'pc-1',
      }),
      'user-1',
    );
  });

  it('returns status update context for cancelled processing', async () => {
    prisma.processingCandidate.findUnique.mockResolvedValue({
      id: 'pc-1',
      processingStatus: 'cancelled',
    });
    prisma.processingHistory.findFirst.mockResolvedValue({
      step: 'hrd',
      status: 'cancelled',
    });
    prisma.processingStep.findFirst.mockResolvedValue({
      id: 'step-hrd',
      template: { key: 'hrd', label: 'HRD' },
    });

    const result = await service.getProcessingStatusUpdateContext('pc-1');

    expect(result).toEqual(
      expect.objectContaining({
        processingStatus: 'cancelled',
        anchorStepId: 'step-hrd',
        stepKey: 'hrd',
        availableRequestTypes: [
          STATUS_CHANGE_REQUEST_TYPES.PROCESSING_HOLD,
          STATUS_CHANGE_REQUEST_TYPES.PROCESSING_REACTIVATE,
        ],
      }),
    );
  });

  it('returns status update context for on-hold processing', async () => {
    prisma.processingCandidate.findUnique.mockResolvedValue({
      id: 'pc-1',
      processingStatus: 'on_hold',
    });
    prisma.processingStep.findFirst.mockResolvedValue({
      id: 'step-visa',
      template: { key: 'visa', label: 'Visa' },
    });

    const result = await service.getProcessingStatusUpdateContext('pc-1');

    expect(result.availableRequestTypes).toEqual([
      STATUS_CHANGE_REQUEST_TYPES.PROCESSING_CANCEL,
      STATUS_CHANGE_REQUEST_TYPES.PROCESSING_REACTIVATE,
    ]);
    expect(result.anchorStepId).toBe('step-visa');
  });

  it('rejects create when request type does not match processing status', async () => {
    prisma.processingStep.findUnique.mockResolvedValue({
      id: 'step-1',
      template: { key: 'hrd' },
      processingCandidate: {
        id: 'pc-1',
        processingStatus: 'cancelled',
        assignedProcessingTeamUserId: 'user-2',
        candidateProjectMap: { id: 'cpm-1' },
      },
    });

    await expect(
      service.createProcessingStatusChangeRequest(
        {
          processingStepId: 'step-1',
          requestType: STATUS_CHANGE_REQUEST_TYPES.PROCESSING_CANCEL,
          reason: 'Invalid transition attempt',
        },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('executes approved reactivation from on hold', async () => {
    prisma.processingStep.findUnique.mockResolvedValue({
      id: 'step-1',
      status: 'on_hold',
      template: { key: 'visa', label: 'Visa' },
      processingCandidateId: 'pc-1',
      startedAt: null,
      processingCandidate: {
        id: 'pc-1',
        processingStatus: 'on_hold',
        candidateId: 'c-1',
        projectId: 'p-1',
        roleNeededId: 'r-1',
      },
    });

    prisma.processingStep.update = jest.fn();
    prisma.processingCandidate.update = jest.fn();
    prisma.candidateProjects.findFirst = jest.fn().mockResolvedValue({
      id: 'cpm-1',
      recruiterId: 'rec-1',
    });
    prisma.processingHistory.create = jest.fn();

    jest.spyOn(service, 'syncCandidateProjectProcessingSubStatus').mockResolvedValue(undefined);

    await service.executeApprovedProcessingStatusChange(
      {
        requestType: STATUS_CHANGE_REQUEST_TYPES.PROCESSING_REACTIVATE,
        processingStepId: 'step-1',
        candidateProjectMapId: 'cpm-1',
        reason: 'Ready to continue visa processing',
      },
      'mgr-1',
    );

    expect(prisma.processingStep.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'step-1' },
        data: expect.objectContaining({ status: 'in_progress' }),
      }),
    );
    expect(prisma.processingCandidate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pc-1' },
        data: expect.objectContaining({
          processingStatus: 'in_progress',
          step: 'visa',
        }),
      }),
    );
    expect(service.syncCandidateProjectProcessingSubStatus).toHaveBeenCalledWith(
      'cpm-1',
      'processing_in_progress',
      'mgr-1',
      'Ready to continue visa processing',
    );
  });
});
