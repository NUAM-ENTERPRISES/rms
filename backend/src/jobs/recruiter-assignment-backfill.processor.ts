import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RecruiterAssignmentService } from '../candidates/services/recruiter-assignment.service';
import {
  BACKFILL_UNASSIGNED_RECRUITER_QUEUE,
  BackfillUnassignedRecruiterJobData,
} from '../candidates/constants/recruiter-assignment-backfill';

@Processor(BACKFILL_UNASSIGNED_RECRUITER_QUEUE)
export class RecruiterAssignmentBackfillProcessor extends WorkerHost {
  private readonly logger = new Logger(
    RecruiterAssignmentBackfillProcessor.name,
  );

  constructor(
    private readonly recruiterAssignmentService: RecruiterAssignmentService,
  ) {
    super();
  }

  async process(
    job: Job<BackfillUnassignedRecruiterJobData>,
  ): Promise<{ assigned: number; skipped: number; failed: number }> {
    this.logger.log(
      `Processing unassigned recruiter backfill job ${job.id ?? ''}`,
    );
    const result =
      await this.recruiterAssignmentService.backfillUnassignedRecruiterAssignments(
        {
          assignedByUserId: job.data?.assignedByUserId,
          recruiterId: job.data?.recruiterId,
        },
      );
    this.logger.log(
      `Unassigned recruiter backfill job complete: assigned=${result.assigned} skipped=${result.skipped} failed=${result.failed}`,
    );
    return result;
  }
};
