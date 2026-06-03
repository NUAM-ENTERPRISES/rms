import { CallbackReminderProcessor } from '../callback-reminder.processor';

describe('CallbackReminderProcessor', () => {
  const mockPrisma = {
    callbackReminder: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockNotifications = {
    createNotification: jest.fn(),
  };

  const mockCallbackService = {
    isCallBackStatusName: jest.fn(),
  };

  let processor: CallbackReminderProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new CallbackReminderProcessor(
      mockPrisma as any,
      mockNotifications as any,
      mockCallbackService as any,
    );
  });

  it('skips when candidate is no longer on Call Back', async () => {
    mockPrisma.callbackReminder.findUnique.mockResolvedValue({
      id: 'r1',
      status: 'pending',
      sentAt: null,
      recruiterId: 'u1',
      candidateId: 'c1',
      statusHistoryId: 'h1',
      scheduledFor: new Date(),
      candidate: {
        id: 'c1',
        firstName: 'Jane',
        lastName: 'Doe',
        countryCode: '+91',
        mobileNumber: '9876543210',
        currentStatus: { statusName: 'Interested' },
      },
      statusHistory: { statusUpdatedAt: new Date(), reason: null },
    });
    mockCallbackService.isCallBackStatusName.mockReturnValue(false);

    const result = await processor.process({
      id: 'job1',
      data: { reminderId: 'r1', candidateId: 'c1' },
    } as any);

    expect(result.success).toBe(false);
    expect(mockNotifications.createNotification).not.toHaveBeenCalled();
  });

  it('sends notification when due', async () => {
    mockPrisma.callbackReminder.findUnique.mockResolvedValue({
      id: 'r1',
      status: 'pending',
      sentAt: null,
      recruiterId: 'u1',
      candidateId: 'c1',
      statusHistoryId: 'h1',
      scheduledFor: new Date(),
      candidate: {
        id: 'c1',
        firstName: 'Jane',
        lastName: 'Doe',
        countryCode: '+91',
        mobileNumber: '9876543210',
        currentStatus: { statusName: 'Call Back' },
      },
      statusHistory: { statusUpdatedAt: new Date(), reason: 'Call later' },
    });
    mockCallbackService.isCallBackStatusName.mockReturnValue(true);

    const result = await processor.process({
      id: 'job1',
      data: { reminderId: 'r1', candidateId: 'c1' },
    } as any);

    expect(result.success).toBe(true);
    expect(mockPrisma.callbackReminder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'sent' }),
      }),
    );
    expect(mockNotifications.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CALLBACK_REMINDER',
        meta: expect.objectContaining({
          countryCode: '+91',
          mobileNumber: '9876543210',
        }),
      }),
    );
  });
});
