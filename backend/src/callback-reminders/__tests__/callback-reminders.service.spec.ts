import { BadRequestException } from '@nestjs/common';
import { CallbackRemindersService } from '../callback-reminders.service';

describe('CallbackRemindersService', () => {
  const mockQueue = {
    add: jest.fn(),
    getJobs: jest.fn().mockResolvedValue([]),
  };

  const mockPrisma = {
    callbackReminder: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  let service: CallbackRemindersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CallbackRemindersService(
      mockPrisma as any,
      mockQueue as any,
    );
  });

  describe('isCallBackStatusName', () => {
    it('recognizes call back variants', () => {
      expect(service.isCallBackStatusName('Call Back')).toBe(true);
      expect(service.isCallBackStatusName('call_back')).toBe(true);
      expect(service.isCallBackStatusName('RNR')).toBe(false);
    });
  });

  describe('createCallbackReminder', () => {
    it('rejects callbackAt in the past', async () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      await expect(
        service.createCallbackReminder('c1', 'u1', 'h1', past),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates reminder and enqueues job', async () => {
      const future = new Date(Date.now() + 5 * 60_000).toISOString();
      mockPrisma.callbackReminder.findFirst.mockResolvedValue(null);
      mockPrisma.callbackReminder.create.mockResolvedValue({
        id: 'rem1',
      });

      await service.createCallbackReminder('c1', 'u1', 'h1', future);

      expect(mockPrisma.callbackReminder.create).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-callback-reminder',
        expect.objectContaining({ reminderId: 'rem1', candidateId: 'c1' }),
        expect.objectContaining({ delay: expect.any(Number) }),
      );
    });
  });

  describe('cancelCallbackReminders', () => {
    it('marks active reminders completed', async () => {
      mockPrisma.callbackReminder.findMany.mockResolvedValue([{ id: 'r1' }]);

      await service.cancelCallbackReminders('c1');

      expect(mockPrisma.callbackReminder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ candidateId: 'c1' }),
          data: expect.objectContaining({ status: 'completed' }),
        }),
      );
    });
  });
});
