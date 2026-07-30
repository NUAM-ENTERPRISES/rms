import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { CandidatesModule } from '../candidates/candidates.module';
import { UploadModule } from '../upload/upload.module';
import { OllamaClientService } from './ollama-client.service';
import { PdfExtractService } from './pdf-extract.service';
import { ResumeAnalysisController } from './resume-analysis.controller';
import { ResumeAnalysisService } from './resume-analysis.service';

@Module({
  imports: [
    ConfigModule,
    CandidatesModule,
    UploadModule,
    MulterModule.register({
      // Memory storage: buffers go to pdf-parse and the upload service
      limits: { fileSize: 5 * 1024 * 1024, files: 20 },
    }),
  ],
  controllers: [ResumeAnalysisController],
  providers: [ResumeAnalysisService, PdfExtractService, OllamaClientService],
})
export class ResumeAnalysisModule {}
