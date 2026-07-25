import { Module } from '@nestjs/common';
import { MetaService } from './meta.service';
import { MetaController } from './meta.controller';
import { PrismaModule } from '../database/prisma.module';
import { CandidatesModule } from '../candidates/candidates.module';

@Module({
  imports: [PrismaModule, CandidatesModule],
  providers: [MetaService],
  controllers: [MetaController]
})
export class MetaModule {}
