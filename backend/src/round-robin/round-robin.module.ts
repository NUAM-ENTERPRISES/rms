import { Module } from '@nestjs/common';
import { RoundRobinService } from './round-robin.service';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [RoundRobinService],
  exports: [RoundRobinService],
})
export class RoundRobinModule {}
