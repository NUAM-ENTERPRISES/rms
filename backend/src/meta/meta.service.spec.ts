import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RecruiterAssignmentService } from '../candidates/services/recruiter-assignment.service';
import { CandidateCodeService } from '../candidates/services/candidate-code.service';
import { NotificationsService } from '../notifications/notifications.service';

jest.mock('nanoid', () => ({ nanoid: () => 'mocked-nanoid' }));

import { MetaService } from './meta.service';

describe('MetaService', () => {
  let service: MetaService;

  const mockPrisma = {
    metaLead: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    candidate: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    candidateRecruiterAssignment: {
      findFirst: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    professionType: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockRecruiterAssignmentService = {
    assignRecruiterToCandidate: jest.fn(),
  };

  const mockCandidateCodeService = {
    reserveNextCode: jest.fn().mockResolvedValue('CAND-2026-0001'),
  };

  const mockNotificationsService = {
    createNotification: jest.fn(),
  };

  const pendingLead = {
    id: 'lead-1',
    shortCode: 'abc123',
    status: 'pending',
    platform: 'whatsapp',
    senderId: 'wa-sender-1',
    tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    candidateId: null,
  };

  const details = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    countryCode: '+91',
    mobileNumber: '9876543210',
    gender: 'FEMALE',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetaService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: RecruiterAssignmentService,
          useValue: mockRecruiterAssignmentService,
        },
        { provide: CandidateCodeService, useValue: mockCandidateCodeService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<MetaService>(MetaService);
    jest.spyOn(service as any, 'sendReply').mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitLeadDetails — duplicate handling', () => {
    it('returns 409 ALREADY_REGISTERED for duplicate phone and notifies recruiter', async () => {
      mockPrisma.metaLead.findUnique.mockResolvedValue(pendingLead);
      mockPrisma.candidate.findUnique.mockResolvedValue({
        id: 'cand-phone',
        firstName: 'Jane',
        lastName: 'Doe',
      });
      mockPrisma.metaLead.update.mockResolvedValue({});
      mockPrisma.candidateRecruiterAssignment.findFirst.mockResolvedValue({
        recruiterId: 'rec-1',
        recruiter: {
          id: 'rec-1',
          name: 'Recruiter One',
          email: 'rec@example.com',
          countryCode: '+91',
          mobileNumber: '9000000001',
        },
      });
      mockNotificationsService.createNotification.mockResolvedValue({ id: 'n1' });

      await expect(
        service.submitLeadDetails('abc123', details),
      ).rejects.toMatchObject({
        status: HttpStatus.CONFLICT,
        response: {
          code: 'ALREADY_REGISTERED',
          message: 'Your data is already in Affiniks',
          candidateId: 'cand-phone',
          assignedRecruiter: {
            name: 'Recruiter One',
            email: 'rec@example.com',
            phone: '+91 9000000001',
          },
        },
      });

      expect(mockPrisma.candidate.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.metaLead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead-1' },
          data: expect.objectContaining({
            candidateId: 'cand-phone',
            status: 'linked',
          }),
        }),
      );
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'rec-1',
          type: 'meta_reregistration',
          title: 'Candidate registered again',
          message: 'Jane Doe registered once more',
          link: '/candidates/cand-phone',
          idemKey: 'meta-rereg-cand-phone-abc123',
        }),
      );
      expect(service['sendReply']).toHaveBeenCalledWith(
        'whatsapp',
        'wa-sender-1',
        expect.stringContaining('already in Affiniks'),
      );
      expect(
        mockRecruiterAssignmentService.assignRecruiterToCandidate,
      ).not.toHaveBeenCalled();
    });

    it('returns 409 for duplicate email when phone does not match', async () => {
      mockPrisma.metaLead.findUnique.mockResolvedValue({
        ...pendingLead,
        platform: 'instagram',
        senderId: 'ig-sender-1',
      });
      mockPrisma.candidate.findUnique.mockResolvedValue(null);
      mockPrisma.candidate.findFirst.mockResolvedValue({
        id: 'cand-email',
        firstName: 'Email',
        lastName: 'Match',
      });
      mockPrisma.metaLead.update.mockResolvedValue({});
      mockPrisma.candidateRecruiterAssignment.findFirst.mockResolvedValue({
        recruiterId: 'rec-2',
        recruiter: {
          id: 'rec-2',
          name: 'Recruiter Two',
          email: 'rec2@example.com',
          countryCode: '+91',
          mobileNumber: '9000000002',
        },
      });
      mockNotificationsService.createNotification.mockResolvedValue({ id: 'n2' });

      await expect(
        service.submitLeadDetails('abc123', details),
      ).rejects.toMatchObject({
        status: HttpStatus.CONFLICT,
        response: {
          code: 'ALREADY_REGISTERED',
          candidateId: 'cand-email',
        },
      });

      expect(mockPrisma.candidate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            email: { equals: 'jane@example.com', mode: 'insensitive' },
          },
        }),
      );
      expect(service['sendReply']).toHaveBeenCalledWith(
        'instagram',
        'ig-sender-1',
        expect.stringContaining('Recruiter Two'),
      );
    });

    it('prefers phone match over email match', async () => {
      mockPrisma.metaLead.findUnique.mockResolvedValue({
        ...pendingLead,
        platform: 'facebook',
        senderId: 'fb-sender-1',
      });
      mockPrisma.candidate.findUnique.mockResolvedValue({
        id: 'cand-by-phone',
        firstName: 'Phone',
        lastName: 'Winner',
      });
      mockPrisma.metaLead.update.mockResolvedValue({});
      mockPrisma.candidateRecruiterAssignment.findFirst.mockResolvedValue(null);

      await expect(
        service.submitLeadDetails('abc123', details),
      ).rejects.toMatchObject({
        response: {
          code: 'ALREADY_REGISTERED',
          candidateId: 'cand-by-phone',
        },
      });

      expect(mockPrisma.candidate.findFirst).not.toHaveBeenCalled();
      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
      expect(service['sendReply']).toHaveBeenCalledWith(
        'facebook',
        'fb-sender-1',
        'Your data is already in Affiniks. Our team will contact you shortly.',
      );
    });

    it('links MetaLead and returns 409 without crashing when no recruiter assigned', async () => {
      mockPrisma.metaLead.findUnique.mockResolvedValue(pendingLead);
      mockPrisma.candidate.findUnique.mockResolvedValue({
        id: 'cand-orphan',
        firstName: 'No',
        lastName: 'Recruiter',
      });
      mockPrisma.metaLead.update.mockResolvedValue({});
      mockPrisma.candidateRecruiterAssignment.findFirst.mockResolvedValue(null);

      let caught: HttpException | undefined;
      try {
        await service.submitLeadDetails('abc123', details);
      } catch (err) {
        caught = err as HttpException;
      }

      expect(caught).toBeInstanceOf(HttpException);
      expect(caught!.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(caught!.getResponse()).toEqual({
        code: 'ALREADY_REGISTERED',
        message: 'Your data is already in Affiniks',
        candidateId: 'cand-orphan',
      });
      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
      expect(mockPrisma.metaLead.update).toHaveBeenCalled();
    });
  });

  describe('submitLeadDetails — new candidate', () => {
    it('creates candidate, assigns recruiter, and returns success', async () => {
      mockPrisma.metaLead.findUnique.mockResolvedValue(pendingLead);
      mockPrisma.candidate.findUnique.mockResolvedValue(null);
      mockPrisma.candidate.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (fn: any) =>
        fn({
          candidate: {
            create: jest.fn().mockResolvedValue({ id: 'cand-new' }),
          },
          metaLead: {
            update: jest.fn().mockResolvedValue({}),
          },
          professionType: {
            findFirst: jest.fn().mockResolvedValue({ id: 'prof-nurse' }),
          },
        }),
      );
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });
      mockRecruiterAssignmentService.assignRecruiterToCandidate.mockResolvedValue({
        id: 'rec-new',
        name: 'New Recruiter',
        email: 'new@example.com',
        countryCode: '+91',
        mobileNumber: '9111111111',
      });

      const result = await service.submitLeadDetails('abc123', details);

      expect(result).toEqual({
        message: 'Registration successful',
        candidateId: 'cand-new',
        assignedRecruiter: {
          name: 'New Recruiter',
          email: 'new@example.com',
          phone: '+91 9111111111',
        },
      });
      expect(
        mockRecruiterAssignmentService.assignRecruiterToCandidate,
      ).toHaveBeenCalledWith(
        'cand-new',
        'admin-1',
        'Automatic assignment via Meta Lead registration',
      );
      expect(service['sendReply']).toHaveBeenCalledWith(
        'whatsapp',
        'wa-sender-1',
        expect.stringContaining('Registration successful'),
      );
    });
  });
});
