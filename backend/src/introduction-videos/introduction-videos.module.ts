import { Module, forwardRef } from '@nestjs/common';
import { IntroductionVideosController } from './introduction-videos.controller';
import { IntroductionVideosService } from './introduction-videos.service';
import { PrismaModule } from '../database/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { DocumentsModule } from '../documents/documents.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => UploadModule),
    forwardRef(() => DocumentsModule),
    NotificationsModule,
  ],
  controllers: [IntroductionVideosController],
  providers: [IntroductionVideosService],
  exports: [IntroductionVideosService],
})
export class IntroductionVideosModule {}
