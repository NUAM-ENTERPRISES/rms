import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { JobsOptions, Queue } from 'bullmq';
import {
  META_OUTBOUND_QUEUE,
  MetaOutboundEnqueueInput,
  MetaOutboundJobData,
} from './meta-outbound.types';

function toBullJobId(idempotencyKey: string): string {
  return idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
}

@Injectable()
export class MetaOutboundService {
  private readonly logger = new Logger(MetaOutboundService.name);

  constructor(
    @InjectQueue(META_OUTBOUND_QUEUE)
    private readonly metaOutboundQueue: Queue<MetaOutboundJobData>,
  ) {}

  async enqueue(
    input: MetaOutboundEnqueueInput,
    options?: JobsOptions,
  ): Promise<{ jobId: string }> {
    const jobData: MetaOutboundJobData = {
      channel: input.channel,
      kind: input.kind,
      to: input.to,
      payload: input.payload,
      idempotencyKey: input.idempotencyKey,
    };

    try {
      const job = await this.metaOutboundQueue.add(
        `${input.channel}:${input.kind}`,
        jobData,
        {
          jobId: toBullJobId(input.idempotencyKey),
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 3000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
          ...options,
        },
      );

      this.logger.log(
        `Enqueued meta-outbound job ${job.id} (${input.channel}/${input.kind}) to ${input.to}`,
      );

      return { jobId: String(job.id) };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      // Idempotent retry: same key already queued/processed
      if (/already exists|Job with id .* already exists/i.test(message)) {
        const existingId = toBullJobId(input.idempotencyKey);
        this.logger.debug(
          `meta-outbound job already exists for key ${input.idempotencyKey} (${existingId})`,
        );
        return { jobId: existingId };
      }
      throw error;
    }
  }
}
