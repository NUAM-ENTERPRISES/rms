import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { ProfessionTypesController } from './profession-types.controller';
import { ProfessionTypesService } from './profession-types.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProfessionTypesController],
  providers: [ProfessionTypesService],
  exports: [ProfessionTypesService],
})
export class ProfessionTypesModule {}
