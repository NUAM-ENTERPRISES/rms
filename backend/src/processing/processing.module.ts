import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { ProcessingService } from './processing.service';
import { ProcessingController } from './processing.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ProcessingController],
  providers: [ProcessingService],
  exports: [ProcessingService],
})
export class ProcessingModule {}
