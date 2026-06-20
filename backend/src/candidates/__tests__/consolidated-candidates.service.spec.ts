import { Test, TestingModule } from '@nestjs/testing';
import { CandidatesService } from '../candidates.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { PipelineService } from '../pipeline.service';
import { UnifiedEligibilityService } from '../../candidate-eligibility/unified-eligibility.service';
import { RecruiterAssignmentService } from '../services/recruiter-assignment.service';
import { RnrRemindersService } from '../../rnr-reminders/rnr-reminders.service';
import { WhatsAppService } from '../../notifications/whatsapp.service';
import { WhatsAppNotificationService } from '../../notifications/whatsapp-notification.service';
import { ROLE_NAMES } from '../../common/constants/role-ids';

describe('CandidatesService - getConsolidatedCandidates role scoping', () => {
  let service: CandidatesService;

  const mockPrisma = {
    candidate: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidatesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OutboxService, useValue: {} },
        { provide: PipelineService, useValue: {} },
        { provide: UnifiedEligibilityService, useValue: {} },
        { provide: RecruiterAssignmentService, useValue: {} },
        { provide: RnrRemindersService, useValue: {} },
        { provide: WhatsAppService, useValue: {} },
        { provide: WhatsAppNotificationService, useValue: {} },
      ],
    }).compile();

    service = module.get(CandidatesService);

    mockPrisma.candidate.findMany.mockResolvedValue([]);
    mockPrisma.candidate.count.mockResolvedValue(0);
    jest.clearAllMocks();
    mockPrisma.candidate.findMany.mockResolvedValue([]);
    mockPrisma.candidate.count.mockResolvedValue(0);
  });

  it('adds recruiterAssignments scope for Agent Coordinator without management roles', async () => {
    await service.getConsolidatedCandidates(
      { projectId: 'p1', page: 1, limit: 10 } as any,
      'user-cc',
      [ROLE_NAMES.AGENT_COORDINATOR],
    );

    expect(mockPrisma.candidate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          recruiterAssignments: {
            some: { recruiterId: 'user-cc', isActive: true },
          },
        }),
      }),
    );
  });
});
