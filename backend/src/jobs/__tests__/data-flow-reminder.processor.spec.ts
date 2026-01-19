import { DataFlowReminderProcessor } from '../data-flow-reminder.processor';

describe('DataFlowReminderProcessor', () => {
  let processor: DataFlowReminderProcessor;
  const prisma: any = {};
  const dataFlowQueue: any = { add: jest.fn(), getJobs: jest.fn().mockResolvedValue([]) };
  const systemConfigService: any = { getDataFlowSettings: jest.fn().mockResolvedValue({ daysAfterSubmission: 0, dailyTimes: ['09:00'], remindersPerDay: 1, totalDays: 3, testMode: { enabled: false }, escalate: { enabled: false } }) };
  const notificationsGateway: any = { emitToUser: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new DataFlowReminderProcessor(prisma as any, dataFlowQueue as any, systemConfigService as any, notificationsGateway as any);
  });

  it('should update reminder as sent and emit socket event', async () => {
    const reminderId = 'rem-1';
    const stepId = 'step-1';
    const procCandidateId = 'pc-1';

    const reminderRecord = { id: reminderId, processingStepId: stepId, processingCandidateId: procCandidateId, reminderCount: 0, dailyCount: 0, daysCompleted: 0, scheduledFor: new Date(Date.now() - 1000), assignedTo: 'user-1', processingCandidate: { candidate: { firstName: 'John', lastName: 'Doe' }, project: { name: 'Project X' }, assignedProcessingTeamUserId: null } };

    prisma.dataFlowReminder = { findUnique: jest.fn().mockResolvedValue(reminderRecord), update: jest.fn().mockImplementation(({ where, data }) => Promise.resolve({ ...reminderRecord, ...data })) };

    prisma.processingStep = { findUnique: jest.fn().mockResolvedValue({ id: stepId, status: 'pending', documents: [] , submittedAt: new Date()}) };

    prisma.notification = { create: jest.fn().mockResolvedValue({ id: 'n-1' }) };

    const submittedAt = new Date('2025-01-16T16:40:00.000Z');
    prisma.processingStep.findUnique = jest.fn().mockResolvedValue({ id: stepId, status: 'pending', documents: [], submittedAt });

    const job: any = { id: 'job-13', data: { reminderId, processingStepId: stepId, processingCandidateId: procCandidateId, assignedTo: 'user-1' } };

    await processor.process(job);

    expect(prisma.dataFlowReminder.update).toHaveBeenCalled();
    const updateCall = prisma.dataFlowReminder.update.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: reminderId });
    expect(updateCall.data.status).toBe('sent');
    expect(updateCall.data.sentAt).toBeInstanceOf(Date);
    expect(updateCall.data.reminderCount).toBe(1);
    expect(updateCall.data.dailyCount).toBe(1);

    expect(prisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ link: `/processingCandidateDetails/${procCandidateId}`, meta: expect.objectContaining({ processingStepId: stepId, processingCandidateId: procCandidateId, reminderId: reminderId, submittedAt: submittedAt.toISOString() }), }), }));

    expect(notificationsGateway.emitToUser).toHaveBeenCalledWith('user-1', 'dataFlowReminder.sent', expect.objectContaining({ payload: expect.objectContaining({ route: `/processingCandidateDetails/${procCandidateId}`, submittedAt: submittedAt.toISOString() }) }));
  });
});
