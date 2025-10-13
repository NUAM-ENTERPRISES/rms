import { registerAs } from '@nestjs/config';

export default registerAs('queue', () => ({
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  notifications: {
    outboxPollMs: parseInt(
      process.env.NOTIFICATIONS_OUTBOX_POLL_MS || '5000',
      10,
    ),
    outboxBatchSize: parseInt(
      process.env.NOTIFICATIONS_OUTBOX_BATCH || '10',
      10,
    ),
    maxRetries: parseInt(process.env.NOTIFICATIONS_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.NOTIFICATIONS_RETRY_DELAY || '1000', 10),
  },
  allocation: {
    maxRetries: parseInt(process.env.ALLOCATION_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.ALLOCATION_RETRY_DELAY || '2000', 10),
    batchSize: parseInt(process.env.ALLOCATION_BATCH_SIZE || '100', 10),
  },
}));
