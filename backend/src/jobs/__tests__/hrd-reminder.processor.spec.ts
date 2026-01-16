import { HrdReminderProcessor } from '../hrd-reminder.processor';

describe('HrdReminderProcessor', () => {
  let processor: HrdReminderProcessor;
  const prisma: any = {};
  const hrdQueue: any = { add: jest.fn(), getJobs: jest.fn().mockResolvedValue([]) };
  const systemConfigService: any = { getHRDSettings: jest.fn().mockResolvedValue({ daysAfterSubmission: 0, dailyTimes: ['09:00'], remindersPerDay: 1, totalDays: 3, testMode: { enabled: false }, escalate: { enabled: false } }) };
  const notificationsGateway: any = { emitToUser: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    // minimal processor construction
    processor = new HrdReminderProcessor(prisma as any, hrdQueue as any, systemConfigService as any, notificationsGateway as any);
  });

  it('should update reminder as sent and emit socket event', async () => {
    const reminderId = 'rem-1';
    const stepId = 'step-1';
    const procCandidateId = 'pc-1';

    // mock existing reminder
    const reminderRecord = {
      id: reminderId,
      processingStepId: stepId,
      processingCandidateId: procCandidateId,
      reminderCount: 0,
      dailyCount: 0,
      daysCompleted: 0,
      scheduledFor: new Date(Date.now() - 1000),
      assignedTo: 'user-1',
      processingCandidate: { candidate: { firstName: 'John', lastName: 'Doe' }, project: { name: 'Project X' }, assignedProcessingTeamUserId: null },
    };

    prisma.hRDReminder = {
      findUnique: jest.fn().mockResolvedValue(reminderRecord),
      update: jest.fn().mockImplementation(({ where, data }) => Promise.resolve({ ...reminderRecord, ...data })),
    };

    prisma.processingStep = {
      findUnique: jest.fn().mockResolvedValue({ id: stepId, status: 'pending', documents: [] , submittedAt: new Date()}),
    };

    prisma.notification = {
      create: jest.fn().mockResolvedValue({ id: 'n-1' }),
    };

    // set a concrete submittedAt to assert formatting
    const submittedAt = new Date('2025-01-16T16:40:00.000Z');
    prisma.processingStep.findUnique = jest.fn().mockResolvedValue({ id: stepId, status: 'pending', documents: [], submittedAt });

    const job: any = { id: 'job-13', data: { reminderId, processingStepId: stepId, processingCandidateId: procCandidateId, assignedTo: 'user-1' } };

    await processor.process(job);

    // assert DB update to set sent fields
    expect(prisma.hRDReminder.update).toHaveBeenCalled();
    const updateCall = prisma.hRDReminder.update.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: reminderId });
    expect(updateCall.data.status).toBe('sent');
    expect(updateCall.data.sentAt).toBeInstanceOf(Date);
    expect(updateCall.data.reminderCount).toBe(1);
    expect(updateCall.data.dailyCount).toBe(1);

    // assert notification creation link & meta include submittedAt ISO
    expect(prisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        link: `/processingCandidateDetails/${procCandidateId}`,
        meta: expect.objectContaining({ processingStepId: stepId, processingCandidateId: procCandidateId, reminderId: reminderId, submittedAt: submittedAt.toISOString() }),
      }),
    }));

    // assert socket emit and that payload includes route and submittedAt
    expect(notificationsGateway.emitToUser).toHaveBeenCalledWith('user-1', 'hrdReminder.sent', expect.objectContaining({ payload: expect.objectContaining({ route: `/processingCandidateDetails/${procCandidateId}`, submittedAt: submittedAt.toISOString() }) }));
  });

  it('should still send reminder when documents are verified but step not complete', async () => {
    const reminderId = 'rem-2';
    const stepId = 'step-2';
    const procCandidateId = 'pc-2';

    const reminderRecord = {
      id: reminderId,
      processingStepId: stepId,
      processingCandidateId: procCandidateId,
      reminderCount: 0,
      dailyCount: 0,
      daysCompleted: 0,
      scheduledFor: new Date(Date.now() - 1000),
      assignedTo: 'user-2',
      processingCandidate: { candidate: { firstName: 'Jane', lastName: 'Smith' }, project: { name: 'Project Y' }, assignedProcessingTeamUserId: null },
    };

    prisma.hRDReminder.findUnique = jest.fn().mockResolvedValue(reminderRecord);
    prisma.hRDReminder.update = jest.fn().mockImplementation(({ where, data }) => Promise.resolve({ ...reminderRecord, ...data }));

    // step documents show verifications (all verified)
    prisma.processingStep.findUnique = jest.fn().mockResolvedValue({ id: stepId, status: 'pending', documents: [{ candidateProjectDocumentVerification: { status: 'verified' } }], submittedAt: new Date() });

    prisma.notification.create = jest.fn().mockResolvedValue({ id: 'n-2' });

    const job: any = { id: 'job-14', data: { reminderId, processingStepId: stepId, processingCandidateId: procCandidateId, assignedTo: 'user-2' } };

    await processor.process(job);

    expect(prisma.hRDReminder.update).toHaveBeenCalled();
    expect(notificationsGateway.emitToUser).toHaveBeenCalledWith('user-2', 'hrdReminder.sent', expect.any(Object));
  });

  it('should cancel when step has no submittedAt', async () => {
    const reminderId = 'rem-3';
    const stepId = 'step-3';
    const procCandidateId = 'pc-3';

    const reminderRecord = {
      id: reminderId,
      processingStepId: stepId,
      processingCandidateId: procCandidateId,
      reminderCount: 0,
      dailyCount: 0,
      daysCompleted: 0,
      scheduledFor: new Date(Date.now() - 1000),
      assignedTo: 'user-3',
      processingCandidate: { candidate: { firstName: 'Sam', lastName: 'Brown' }, project: { name: 'Project Z' }, assignedProcessingTeamUserId: null },
    };

    prisma.hRDReminder.findUnique = jest.fn().mockResolvedValue(reminderRecord);
    prisma.hRDReminder.update = jest.fn().mockImplementation(({ where, data }) => Promise.resolve({ ...reminderRecord, ...data }));

    // step has no submittedAt
    prisma.processingStep.findUnique = jest.fn().mockResolvedValue({ id: stepId, status: 'pending', documents: [], submittedAt: null });

    const job: any = { id: 'job-15', data: { reminderId, processingStepId: stepId, processingCandidateId: procCandidateId, assignedTo: 'user-3' } };

    const res = await processor.process(job);

    // Expect it to mark reminder as completed/cancelled and not emit
    expect(prisma.hRDReminder.update).toHaveBeenCalled();
    const updateCall = prisma.hRDReminder.update.mock.calls[0][0];
    expect(updateCall.data.status).toBe('completed');
    expect(notificationsGateway.emitToUser).not.toHaveBeenCalledWith('user-3', 'hrdReminder.sent', expect.any(Object));
  });
});
