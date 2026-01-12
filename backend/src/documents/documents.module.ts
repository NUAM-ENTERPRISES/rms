import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PrismaModule } from '../database/prisma.module';
import { OutboxService } from '../notifications/outbox.service';
import { ProcessingModule } from '../processing/processing.module';

@Module({
  imports: [PrismaModule, ProcessingModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, OutboxService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
