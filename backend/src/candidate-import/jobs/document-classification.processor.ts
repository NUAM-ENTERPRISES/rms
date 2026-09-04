import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  DOCUMENT_CLASSIFICATION_QUEUE,
  DocumentClassificationJobData,
} from '../constants/candidate-import.constants';
import { DocumentBundleService } from '../services/document-bundle.service';

/**
 * Rendering scanned pages and calling Vertex on a 30-page bundle takes minutes,
 * so classification always runs out of band and the UI polls the bundle.
 */
@Processor(DOCUMENT_CLASSIFICATION_QUEUE)
export class DocumentClassificationProcessor extends WorkerHost {
  private readonly logger = new Logger(DocumentClassificationProcessor.name);

  constructor(private readonly documentBundleService: DocumentBundleService) {
    super();
  }

  async process(job: Job<DocumentClassificationJobData>): Promise<void> {
    this.logger.log(
      `Classifying bundle ${job.data.bundleId} (job ${job.id ?? 'n/a'}).`,
    );
    // Failures are recorded on the bundle row rather than thrown, so a bad
    // scan does not retry endlessly against the same unreadable file.
    await this.documentBundleService.classifyBundle(job.data.bundleId);
  }
}
