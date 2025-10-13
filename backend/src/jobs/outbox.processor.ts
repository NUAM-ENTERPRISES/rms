import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class OutboxProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxProcessor.name);
  private interval: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
  ) {}

  onModuleInit() {
    const pollMs = this.configService.get<number>(
      'queue.notifications.outboxPollMs',
      5000,
    );
    const batchSize = this.configService.get<number>(
      'queue.notifications.outboxBatchSize',
      10,
    );

    this.logger.log(
      `Starting outbox processor with poll interval: ${pollMs}ms, batch size: ${batchSize}`,
    );

    this.interval = setInterval(async () => {
      await this.processOutboxEvents(batchSize);
    }, pollMs);
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  private async processOutboxEvents(batchSize: number) {
    try {
      // Get unprocessed events, oldest first
      const events = await this.prisma.outboxEvent.findMany({
        where: {
          processed: false,
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: batchSize,
      });

      if (events.length === 0) {
        return;
      }

      this.logger.debug(`Processing ${events.length} outbox events`);

      for (const event of events) {
        try {
          // Create job with event data
          const jobData = {
            type: event.type,
            eventId: event.id,
            payload: event.payload,
          };

          // Add job to notifications queue
          await this.notificationsQueue.add(event.type, jobData, {
            jobId: event.id, // Use event ID as job ID for idempotency
            attempts: this.configService.get<number>(
              'queue.notifications.maxRetries',
              3,
            ),
            backoff: {
              type: 'exponential',
              delay: this.configService.get<number>(
                'queue.notifications.retryDelay',
                1000,
              ),
            },
          });

          // Mark event as processed
          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: { processed: true },
          });

          this.logger.debug(`Enqueued event ${event.id} of type ${event.type}`);
        } catch (error) {
          this.logger.error(
            `Failed to process outbox event ${event.id}: ${error.message}`,
            error.stack,
          );

          // Increment attempts and mark as processed if max attempts reached
          const updatedEvent = await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              attempts: { increment: 1 },
            },
          });

          if (
            updatedEvent.attempts >=
            this.configService.get<number>('queue.notifications.maxRetries', 3)
          ) {
            await this.prisma.outboxEvent.update({
              where: { id: event.id },
              data: { processed: true },
            });

            this.logger.error(
              `Event ${event.id} marked as processed after max attempts`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Outbox processor error: ${error.message}`,
        error.stack,
      );
    }
  }
}
