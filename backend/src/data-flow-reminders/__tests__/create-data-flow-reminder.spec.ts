import { DataFlowRemindersService } from '../data-flow-reminders.service';

describe('DataFlowRemindersService.createDataFlowReminder', () => {
  let service: DataFlowRemindersService;
  let prismaMock: any;
  let queueMock: any;
  let systemConfigMock: any;

  beforeEach(() => {
    queueMock = { add: jest.fn(), getJobs: jest.fn().mockResolvedValue([]) };

    prismaMock = {
      processingStep: { findUnique: jest.fn().mockResolvedValue({ assignedTo: null, processingCandidate: { assignedProcessingTeamUserId: null } }) },
      dataFlowReminder: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'rem-1' }),
        update: jest.fn().mockResolvedValue(null),
      },
    };

    systemConfigMock = {
      getDataFlowSettings: jest.fn().mockResolvedValue({
        daysAfterSubmission: 15,
        remindersPerDay: 1,
        dailyTimes: ['09:00'],
        totalDays: 3,
        delayBetweenReminders: 1440,
        officeHours: { start: '09:00', end: '18:00' },
        escalate: { enabled: false, afterDays: 3, assignmentStrategy: 'round_robin' },
        testMode: { enabled: false, immediateDelayMinutes: 1 },
      }),
    };

    service = new DataFlowRemindersService(prismaMock as any, queueMock as any, systemConfigMock as any);
  });

  it('schedules the first reminder 15 days after submittedAt at 09:00 and enqueues a job', async () => {
    const submittedAt = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

    await service.createDataFlowReminder('step-1', 'pc-1', null, submittedAt);

    expect(prismaMock.dataFlowReminder.create).toHaveBeenCalledTimes(1);

    const createdData = prismaMock.dataFlowReminder.create.mock.calls[0][0].data;
    const expected = new Date(submittedAt.getTime() + 15 * 24 * 60 * 60 * 1000);
    expected.setHours(9, 0, 0, 0);

    const scheduled = new Date(createdData.scheduledFor);

    expect(scheduled.getTime()).toBe(expected.getTime());
    expect(queueMock.add).toHaveBeenCalled();
  });
});
