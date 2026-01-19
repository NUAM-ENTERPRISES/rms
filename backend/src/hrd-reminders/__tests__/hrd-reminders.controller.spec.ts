import { HrdRemindersController } from '../hrd-reminders.controller';

describe('HrdRemindersController', () => {
  let controller: HrdRemindersController;
  let serviceMock: any;

  beforeEach(() => {
    serviceMock = { getMyReminders: jest.fn().mockResolvedValue([]) };

    controller = new HrdRemindersController(serviceMock as any);
  });

  it('requests reminders without passing dueOnly', async () => {
    const req: any = { query: { dueOnly: 'true' }, user: { id: 'user-1' } };

    await controller.getHrdScheduler(req);

    expect(serviceMock.getMyReminders).toHaveBeenCalledTimes(1);
    const calledWith = serviceMock.getMyReminders.mock.calls[0];
    expect(calledWith[0]).toBe('user-1');
    expect(calledWith.length).toBe(1);
  });
});
