import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../notifications.service';

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
        { provide: 'PrismaService', useValue: prisma },
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
