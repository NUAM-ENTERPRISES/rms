import { Module, forwardRef } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule } from '@nestjs/config';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { UploadCompressionService } from './upload-compression.service';
import { UPLOAD_ACCEPT_BUFFER_BYTES } from './upload.constants';
import { PrismaModule } from '../database/prisma.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    forwardRef(() => DocumentsModule),
    MulterModule.register({
      storage: undefined, // Use memory storage (file.buffer)
      limits: {
        fileSize: UPLOAD_ACCEPT_BUFFER_BYTES,
      },
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService, UploadCompressionService],
  exports: [UploadService],
})
export class UploadModule {}
