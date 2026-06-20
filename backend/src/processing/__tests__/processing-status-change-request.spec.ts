import { Test, TestingModule } from '@nestjs/testing';
import { ProcessingService } from '../processing.service';
import { CandidateProjectsService } from '../../candidate-projects/candidate-projects.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { ProcessingRemindersService } from '../../processing-reminders/processing-reminders.service';
import { STATUS_CHANGE_REQUEST_TYPES } from '../../common/constants/statuses';

describe('ProcessingService status change requests', () => {
  let service: ProcessingService;
  let candidateProjectsService: { createStatusChangeRequest: jest.Mock };

  beforeEach(async () => {
    candidateProjectsService = {
      createStatusChangeRequest: jest.fn().mockResolvedValue({ id: 'req-1', status: 'pending' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessingService,
        {
          provide: PrismaService,
          useValue: {
            processingStep: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'step-1',
                template: { key: 'hrd' },
                processingCandidate: {
                  id: 'pc-1',
                  assignedProcessingTeamUserId: 'user-2',
                  candidateProjectMap: { id: 'cpm-1' },
                },
              }),
            },
          },
        },
        { provide: OutboxService, useValue: {} },
        { provide: ProcessingRemindersService, useValue: { cancelReminder: jest.fn() } },
        { provide: CandidateProjectsService, useValue: candidateProjectsService },
      ],
    }).compile();

    service = module.get(ProcessingService);
  });

  it('delegates createProcessingStatusChangeRequest to candidate projects service', async () => {
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
});
