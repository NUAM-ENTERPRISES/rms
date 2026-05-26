import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../notifications.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsGateway } from '../notifications.gateway';

describe('NotificationsService (mute settings)', () => {
  let service: NotificationsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      notification: { /* unused */ },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsGateway, useValue: { emitToUser: jest.fn() } },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => jest.resetAllMocks());

  it('getMuteStatus returns false when user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const result = await service.getMuteStatus('user-1');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { notificationSoundMuted: true },
    });
    expect(result).toBe(false);
  });

  it('getMuteStatus returns value from user record', async () => {
    prisma.user.findUnique.mockResolvedValue({ notificationSoundMuted: true });
    const result = await service.getMuteStatus('user-2');
    expect(result).toBe(true);
  });

  it('setMuteStatus updates and returns new flag', async () => {
    prisma.user.update.mockResolvedValue({ notificationSoundMuted: true });
    const result = await service.setMuteStatus('user-3', true);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-3' },
      data: { notificationSoundMuted: true },
      select: { notificationSoundMuted: true },
    });
    expect(result).toEqual({ muted: true });
  });
});

describe('NotificationsService (createNotification)', () => {
  let service: NotificationsService;
  let prisma: any;
  let gateway: any;

  beforeEach(async () => {
    prisma = {
      notification: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    gateway = {
      emitToUser: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsGateway, useValue: gateway },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => jest.resetAllMocks());

  it('creates notification and emits real-time event', async () => {
    prisma.notification.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', name: 'User 1' });
    prisma.notification.create.mockResolvedValue({
      id: 'notif-1',
      userId: 'user-1',
      type: 'screening_passed',
      title: 'Candidate Passed',
      message: 'Candidate passed',
      link: '/candidate-projects/1/screening/1',
      meta: { candidateProjectMapId: 'cpm-1' },
      idemKey: 'event-1:user-1:screening_passed',
      status: 'unread',
      seen: false,
      readAt: null,
      createdAt: new Date(),
    });

    const result = await service.createNotification({
      userId: 'user-1',
      type: 'screening_passed',
      title: 'Candidate Passed',
      message: 'Candidate passed',
      link: '/candidate-projects/1/screening/1',
      meta: { candidateProjectMapId: 'cpm-1' },
      idemKey: 'event-1:user-1:screening_passed',
    });

    expect(prisma.notification.findUnique).toHaveBeenCalledWith({ where: { idemKey: 'event-1:user-1:screening_passed' } });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    expect(prisma.notification.create).toHaveBeenCalled();
    expect(gateway.emitToUser).toHaveBeenCalledWith('user-1', 'notification:new', expect.objectContaining({ id: 'notif-1', type: 'screening_passed' }));

    expect(result).toEqual(expect.objectContaining({ id: 'notif-1', userId: 'user-1', type: 'screening_passed' }));
  });
});

describe('NotificationsService (notifyDocumentsForwardedToClient)', () => {
  let service: NotificationsService;
  let prisma: any;
  let gateway: any;

  beforeEach(async () => {
    prisma = {
      notification: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'notif-1',
          userId: 'recruiter-1',
          type: 'documents_forwarded',
          title: 'Documents Sent to Client',
          message: 'msg',
          link: '/recruiter-docs/p1/c1',
          meta: {},
          idemKey: 'e1:recruiter-1:docs_forwarded',
          status: 'unread',
          seen: false,
          readAt: null,
          createdAt: new Date(),
        }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'recruiter-1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      candidate: {
        findUnique: jest.fn().mockResolvedValue({ firstName: 'Jane', lastName: 'Doe' }),
      },
      project: {
        findUnique: jest.fn().mockResolvedValue({ title: 'UAE Nurses' }),
      },
      roleNeeded: { findFirst: jest.fn().mockResolvedValue(null) },
      candidateProjects: {
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({ recruiterId: 'recruiter-1' }),
      },
      candidateRecruiterAssignment: { findFirst: jest.fn() },
    };

    gateway = { emitToUser: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsGateway, useValue: gateway },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('notifies assigned recruiter and documentation team when documents are sent to client', async () => {
    prisma.user.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'doc-exec-1' }, { id: 'doc-exec-2' }]);

    const result = await service.notifyDocumentsForwardedToClient({
      eventId: 'evt-1',
      candidateId: 'c1',
      projectId: 'p1',
      senderId: 'doc-exec-1',
      recipientEmail: 'client@example.com',
    });

    expect(result.count).toBe(3);
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'recruiter-1',
          type: 'documents_forwarded',
          title: 'Documents Sent to Client',
          link: '/recruiter-docs/p1/c1',
        }),
      }),
    );
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'doc-exec-1',
          type: 'documents_forwarded',
          title: 'Sent to Client',
          link: '/candidates/c1/documents/p1',
        }),
      }),
    );
  });
});
