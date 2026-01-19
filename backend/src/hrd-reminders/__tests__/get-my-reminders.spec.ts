import { HrdRemindersService } from '../hrd-reminders.service';

describe('HrdRemindersService.getMyReminders', () => {
  let service: HrdRemindersService;
  let prismaMock: any;
  let queueMock: any;
  let systemConfigMock: any;

  beforeEach(() => {
    queueMock = { add: jest.fn(), getJobs: jest.fn().mockResolvedValue([]) };

    prismaMock = {
      hRDReminder: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    systemConfigMock = {};

    service = new HrdRemindersService(prismaMock as any, queueMock as any, systemConfigMock as any);
  });

  it('does not apply a scheduledFor filter (dueOnly removed)', async () => {
    await service.getMyReminders('user-1');

    expect(prismaMock.hRDReminder.findMany).toHaveBeenCalledTimes(1);
    const calledWhere = prismaMock.hRDReminder.findMany.mock.calls[0][0].where;
    expect(calledWhere.assignedTo).toBe('user-1');
    expect(calledWhere.status).toEqual({ in: ['pending', 'sent'] });
    expect(calledWhere.scheduledFor).toBeUndefined();
  });
});