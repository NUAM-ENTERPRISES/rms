import { Module } from '@nestjs/common';
import { MetaService } from './meta.service';
import { MetaController } from './meta.controller';
import { PrismaModule } from 'src/database/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [MetaService],
  controllers: [MetaController]
})
export class MetaModule {}
