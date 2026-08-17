import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PrismaModule } from '../database/prisma.module';
import { ProcessingModule } from '../processing/processing.module';
import { UploadModule } from '../upload/upload.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GoogleDriveModule } from '../google-drive/google-drive.module';
import { CandidateProjectsModule } from '../candidate-projects/candidate-projects.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => ProcessingModule),
    forwardRef(() => UploadModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => CandidateProjectsModule),
    GoogleDriveModule,
    BullModule.registerQueue({
      name: 'document-forward',
    }),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
