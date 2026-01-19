import { DataFlowRemindersController } from '../data-flow-reminders.controller';

describe('DataFlowRemindersController', () => {
  let controller: DataFlowRemindersController;
  let serviceMock: any;

  beforeEach(() => {
    serviceMock = { getMyReminders: jest.fn().mockResolvedValue({ items: [], total: 0 }) };

    controller = new DataFlowRemindersController(serviceMock as any);
  });

  it('calls service with sentOnly and pagination and returns paginated shape', async () => {
    const req: any = { query: { page: '2', limit: '10' }, user: { id: 'user-1' } };

    const resp = await controller.getScheduler(req);

    expect(serviceMock.getMyReminders).toHaveBeenCalledTimes(1);
    expect(serviceMock.getMyReminders).toHaveBeenCalledWith('user-1', { sentOnly: true, page: 2, limit: 10 });
    expect(resp.data).toHaveProperty('items');
    expect(resp.data).toHaveProperty('total');
    expect(resp.data.page).toBe(2);
    expect(resp.data.limit).toBe(10);
  });
});
