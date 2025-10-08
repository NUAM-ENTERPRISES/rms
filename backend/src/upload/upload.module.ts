import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule } from '@nestjs/config';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    MulterModule.register({
      storage: undefined, // Use memory storage (file.buffer)
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
      },
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
