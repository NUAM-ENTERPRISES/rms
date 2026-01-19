import { DataFlowRemindersService } from '../data-flow-reminders.service';

describe('DataFlowRemindersService.getMyReminders', () => {
  let service: DataFlowRemindersService;
  let prismaMock: any;
  let queueMock: any;
  let systemConfigMock: any;

  beforeEach(() => {
    queueMock = { add: jest.fn(), getJobs: jest.fn().mockResolvedValue([]) };

    prismaMock = {
      dataFlowReminder: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    systemConfigMock = {};

    service = new DataFlowRemindersService(prismaMock as any, queueMock as any, systemConfigMock as any);
  });

  it('does not filter by sentAt by default and applies default pagination', async () => {
    await service.getMyReminders('user-1');

    expect(prismaMock.dataFlowReminder.findMany).toHaveBeenCalledTimes(1);
    const calledArgs = prismaMock.dataFlowReminder.findMany.mock.calls[0][0];
    expect(calledArgs.where.assignedTo).toBe('user-1');
    expect(calledArgs.where.status).toEqual({ in: ['pending', 'sent'] });
    expect(calledArgs.where.sentAt).toBeUndefined();
    expect(calledArgs.take).toBe(20);
    expect(calledArgs.skip).toBe(0);
  });

  it('applies sentAt != null filter and pagination when requested', async () => {
    await service.getMyReminders('user-1', { sentOnly: true, page: 2, limit: 10 });

    expect(prismaMock.dataFlowReminder.count).toHaveBeenCalledTimes(1);
    expect(prismaMock.dataFlowReminder.findMany).toHaveBeenCalledTimes(1);
    const calledArgs = prismaMock.dataFlowReminder.findMany.mock.calls[0][0];
    expect(calledArgs.where.sentAt).toEqual({ not: null });
    expect(calledArgs.take).toBe(10);
    expect(calledArgs.skip).toBe(10);
  });
});
