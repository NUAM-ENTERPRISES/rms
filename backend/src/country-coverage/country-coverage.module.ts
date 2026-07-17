import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CountryCoverageController } from './country-coverage.controller';
import { CountryCoverageService } from './country-coverage.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CountryCoverageController],
  providers: [CountryCoverageService],
  exports: [CountryCoverageService],
})
export class CountryCoverageModule {}
