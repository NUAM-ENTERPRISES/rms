import { Module } from '@nestjs/common';
import { MockInterviewTemplatesController } from './mock-interview-templates.controller';
import { MockInterviewTemplatesService } from './mock-interview-templates.service';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MockInterviewTemplatesController],
  providers: [MockInterviewTemplatesService],
  exports: [MockInterviewTemplatesService],
})
export class MockInterviewTemplatesModule {}
