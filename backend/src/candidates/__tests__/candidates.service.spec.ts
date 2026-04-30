import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CandidatesService } from '../candidates.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../notifications/outbox.service';
import { PipelineService } from '../pipeline.service';
import { UnifiedEligibilityService } from '../../candidate-eligibility/unified-eligibility.service';
import { RecruiterAssignmentService } from '../services/recruiter-assignment.service';
import { RnrRemindersService } from '../../rnr-reminders/rnr-reminders.service';
import { WhatsAppService } from '../../notifications/whatsapp.service';
import { WhatsAppNotificationService } from '../../notifications/whatsapp-notification.service';

describe('CandidatesService', () => {
  let service: CandidatesService;
  let prisma: {
    candidate: { findUnique: jest.Mock };
    document: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      candidate: { findUnique: jest.fn() },
      document: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidatesService,
        { provide: PrismaService, useValue: prisma },
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCandidateProfileCompletion', () => {
    it('returns 100% when all required personal fields and documents exist', async () => {
      prisma.candidate.findUnique.mockResolvedValue({
        id: 'candidate123',
        email: 'john@example.com',
        mobileNumber: '9876543210',
        dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
      });

      prisma.document.findMany.mockResolvedValue([
        { docType: 'resume' },
        { docType: 'degree_certificate' },
        { docType: 'passport_photo' },
        { docType: 'passport_copy' },
        { docType: 'aadhaar' },
        { docType: 'registration_certificate' },
      ]);

      const result = await service.getCandidateProfileCompletion('candidate123');
      expect(result.percent).toBe(100);
      expect(result.missing).toHaveLength(0);
      expect(result.breakdown.personal.completedCount).toBe(3);
      expect(result.breakdown.documents.completedCount).toBe(6);
    });

    it('includes missing dob/email and missing required docs', async () => {
      prisma.candidate.findUnique.mockResolvedValue({
        id: 'candidate123',
        email: null,
        mobileNumber: '9876543210',
        dateOfBirth: null,
      });

      prisma.document.findMany.mockResolvedValue([
        { docType: 'resume' },
        { docType: 'passport_copy' },
      ]);

      const result = await service.getCandidateProfileCompletion('candidate123');
      expect(result.percent).toBeLessThan(100);

      const missingKeys = result.missing.map((m: any) => m.key);
      expect(missingKeys).toEqual(
        expect.arrayContaining(['dateOfBirth', 'email']),
      );
      expect(result.breakdown.personal.completedCount).toBe(1);
      expect(result.breakdown.documents.completedCount).toBe(2);
    });

    it('throws NotFoundException when candidate does not exist', async () => {
      prisma.candidate.findUnique.mockResolvedValue(null);
      await expect(
        service.getCandidateProfileCompletion('missing'),
      ).rejects.toThrow(
        new NotFoundException('Candidate with ID missing not found'),
      );
    });
  });
});
