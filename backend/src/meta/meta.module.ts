import { Module } from '@nestjs/common';
import { MetaService } from './meta.service';
import { MetaController } from './meta.controller';
import { PrismaModule } from 'src/database/prisma.module';
import { CandidatesModule } from 'src/candidates/candidates.module';

@Module({
  imports: [PrismaModule, CandidatesModule],
  providers: [MetaService],
  controllers: [MetaController]
})
export class MetaModule {}
