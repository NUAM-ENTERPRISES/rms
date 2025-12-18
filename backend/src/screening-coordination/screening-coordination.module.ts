import { Module } from '@nestjs/common';
import { ScreeningTemplatesModule } from './templates/screening-templates.module';
import { ScreeningsModule } from './screenings/screenings.module';
import { TrainingModule } from './training/training.module';

/**
 * Screening Coordination Module
 *
 * Parent module that groups all screening coordination features:
 * - Templates: Manage checklist templates for screenings
 * - Screenings: Conduct and manage screenings
 * - Training: Assign and track candidate training
 */
@Module({
  imports: [ScreeningTemplatesModule, ScreeningsModule, TrainingModule],
  exports: [ScreeningTemplatesModule, ScreeningsModule, TrainingModule],
})
export class ScreeningCoordinationModule {}
