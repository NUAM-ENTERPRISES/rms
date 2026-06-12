import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { AuthModule } from '../auth/auth.module';
import { OriginalDocumentCollectionsController } from './original-document-collections.controller';
import { OriginalDocumentCollectionsService } from './original-document-collections.service';
import { OriginalDocumentCollectionSyncService } from './original-document-collection-sync.service';

@Module({
  imports: [PrismaModule, UploadModule, AuthModule],
  controllers: [OriginalDocumentCollectionsController],
  providers: [
    OriginalDocumentCollectionsService,
    OriginalDocumentCollectionSyncService,
  ],
  exports: [OriginalDocumentCollectionsService],
})
export class OriginalDocumentCollectionsModule {}
