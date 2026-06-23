import { OutboxProcessor } from '../outbox.processor';

describe('OutboxProcessor', () => {
  const mockPrisma = {
    outboxEvent: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => defaultValue),
  };

  const mockNotificationsQueue = {
    add: jest.fn(),
  };

  let processor: OutboxProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new OutboxProcessor(
      mockPrisma as any,
      mockConfigService as any,
      mockNotificationsQueue as any,
    );
  });

  it('skips overlapping poll cycles while a batch is in flight', async () => {
    let resolveFindMany: (value: unknown[]) => void = () => undefined;
    const findManyPromise = new Promise<unknown[]>((resolve) => {
      resolveFindMany = resolve;
    });

    mockPrisma.outboxEvent.findMany.mockReturnValue(findManyPromise);

    const firstCycle = (processor as any).processOutboxEvents(10);
    const secondCycle = (processor as any).processOutboxEvents(10);

    resolveFindMany([]);
    await firstCycle;
    await secondCycle;

    expect(mockPrisma.outboxEvent.findMany).toHaveBeenCalledTimes(1);
  });

  it('enqueues notifications jobs with retention options', async () => {
    mockPrisma.outboxEvent.findMany.mockResolvedValue([
      {
        id: 'event-1',
        type: 'notification.created',
        payload: { title: 'Hello' },
      },
    ]);
    mockPrisma.outboxEvent.update.mockResolvedValue({});

    await (processor as any).processOutboxEvents(10);

    expect(mockNotificationsQueue.add).toHaveBeenCalledWith(
      'notification.created',
      expect.objectContaining({ eventId: 'event-1' }),
      expect.objectContaining({
        removeOnComplete: 100,
        removeOnFail: 50,
      }),
    );
  });
});
