import { Module } from '@nestjs/common';
import { MockInterviewsController } from './mock-interviews.controller';
import { MockInterviewsService } from './mock-interviews.service';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MockInterviewsController],
  providers: [MockInterviewsService],
  exports: [MockInterviewsService],
})
export class MockInterviewsModule {}
