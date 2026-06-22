import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../database/prisma.module';
import { CandidateCountryRestrictionsController } from './candidate-country-restrictions.controller';
import { CandidateCountryRestrictionsService } from './candidate-country-restrictions.service';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  controllers: [CandidateCountryRestrictionsController],
  providers: [CandidateCountryRestrictionsService],
  exports: [CandidateCountryRestrictionsService],
})
export class CandidateCountryRestrictionsModule {}
