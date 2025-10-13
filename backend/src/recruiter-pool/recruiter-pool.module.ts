import { Module } from '@nestjs/common';
import { RecruiterPoolService } from './recruiter-pool.service';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [RecruiterPoolService],
  exports: [RecruiterPoolService],
})
export class RecruiterPoolModule {}
