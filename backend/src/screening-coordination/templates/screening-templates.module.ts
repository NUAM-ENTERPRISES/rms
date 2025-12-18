import { Module } from '@nestjs/common';
import { ScreeningTemplatesController } from './screening-templates.controller';
import { ScreeningTemplatesService } from './screening-templates.service';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ScreeningTemplatesController],
  providers: [ScreeningTemplatesService],
  exports: [ScreeningTemplatesService],
})
export class ScreeningTemplatesModule {}
