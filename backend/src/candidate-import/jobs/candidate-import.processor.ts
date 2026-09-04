import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  CANDIDATE_IMPORT_QUEUE,
  CandidateImportJobData,
} from '../constants/candidate-import.constants';
import { CandidateImportService } from '../services/candidate-import.service';

/**
 * Parsing a 30-tab workbook plus its Vertex catalog lookups takes far longer
 * than an HTTP request should, so the upload endpoint only enqueues and the
 * wizard polls the batch for progress.
 */
@Processor(CANDIDATE_IMPORT_QUEUE)
export class CandidateImportProcessor extends WorkerHost {
  private readonly logger = new Logger(CandidateImportProcessor.name);

  constructor(private readonly candidateImportService: CandidateImportService) {
    super();
  }

  async process(job: Job<CandidateImportJobData>): Promise<void> {
    this.logger.log(
      `Parsing import batch ${job.data.batchId} (job ${job.id ?? 'n/a'}).`,
    );
    // processBatch records its own failures onto the batch row, so the job
    // itself is not retried into a loop against a permanently bad file.
    await this.candidateImportService.processBatch(job.data);
  }
}
