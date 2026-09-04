import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { WorkExperienceModule } from '../candidates/work-experience.module';
import { CandidatesModule } from '../candidates/candidates.module';
import { PrismaModule } from '../database/prisma.module';
import { DocumentsModule } from '../documents/documents.module';
import { UploadModule } from '../upload/upload.module';
import { VertexAiModule } from '../vertex-ai/vertex-ai.module';
import { CandidateImportController } from './candidate-import.controller';
import {
  CANDIDATE_IMPORT_QUEUE,
  DOCUMENT_CLASSIFICATION_QUEUE,
  MAX_BUNDLE_FILE_BYTES,
} from './constants/candidate-import.constants';
import { DocumentBundleController } from './document-bundle.controller';
import { CandidateImportProcessor } from './jobs/candidate-import.processor';
import { DocumentClassificationProcessor } from './jobs/document-classification.processor';
import { CandidateImportService } from './services/candidate-import.service';
import { CatalogApprovalService } from './services/catalog-approval.service';
import { CatalogMappingService } from './services/catalog-mapping.service';
import { DocumentBundleService } from './services/document-bundle.service';
import { DuplicateDetectionService } from './services/duplicate-detection.service';
import { MergedPdfClassifierService } from './services/merged-pdf-classifier.service';
import { MergedPdfProfileExtractorService } from './services/merged-pdf-profile-extractor.service';
import { RecruiterResolutionService } from './services/recruiter-resolution.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    UploadModule,
    VertexAiModule,
    CandidatesModule,
    WorkExperienceModule,
    DocumentsModule,
    MulterModule.register({
      // Memory storage: buffers go straight to the parser and the upload
      // service. Sized for the largest single upload this module accepts,
      // which is the 50MB merged-document bundle.
      limits: { fileSize: MAX_BUNDLE_FILE_BYTES, files: 1 },
    }),
    BullModule.registerQueue({
      name: CANDIDATE_IMPORT_QUEUE,
      defaultJobOptions: {
        // Parsing failures are recorded on the batch, so retrying a bad file
        // only wastes work; one retry covers transient Vertex or S3 blips.
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: 50,
      },
    }),
    BullModule.registerQueue({
      name: DOCUMENT_CLASSIFICATION_QUEUE,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: 50,
      },
    }),
  ],
  controllers: [CandidateImportController, DocumentBundleController],
  providers: [
    CandidateImportService,
    CatalogMappingService,
    CatalogApprovalService,
    DuplicateDetectionService,
    RecruiterResolutionService,
    DocumentBundleService,
    MergedPdfClassifierService,
    MergedPdfProfileExtractorService,
    CandidateImportProcessor,
    DocumentClassificationProcessor,
  ],
  exports: [CandidateImportService, CatalogMappingService],
})
export class CandidateImportModule {}
