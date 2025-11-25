import { Module } from '@nestjs/common';
import { MockInterviewTemplatesModule } from './templates/mock-interview-templates.module';
import { MockInterviewsModule } from './interviews/mock-interviews.module';
import { TrainingModule } from './training/training.module';

/**
 * Mock Interview Coordination Module
 *
 * Parent module that groups all mock interview coordination features:
 * - Templates: Manage checklist templates for mock interviews
 * - Interviews: Conduct and manage mock interviews
 * - Training: Assign and track candidate training
 */
@Module({
  imports: [MockInterviewTemplatesModule, MockInterviewsModule, TrainingModule],
  exports: [MockInterviewTemplatesModule, MockInterviewsModule, TrainingModule],
})
export class MockInterviewCoordinationModule {}
