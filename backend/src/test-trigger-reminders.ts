import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { InterviewReminderService } from './interviews/interview-reminder.service';
import { SystemConfigService } from './system-config/system-config.service';

/**
 * TEST SCRIPT: Manually triggers the interview reminder cron job logic.
 */
async function bootstrap() {
  process.env.NODE_PATH = './src:./'; // Allow relative imports from src
  const app = await NestFactory.createApplicationContext(AppModule);
  const reminderService = app.get(InterviewReminderService);
  const configService = app.get(SystemConfigService);

  try {
    console.log('--- Interview Reminder Test Mode ---');
    
    // Set config to 1 day so March 12 (tomorrow) is picked up
    console.log('⚙️ Setting INTERVIEW_REMINDER_DAYS to 1 for this test...');
    await configService.setConfig('INTERVIEW_REMINDER_DAYS', 1, 'Temporary test value');

    console.log('🚀 Triggering handleInterviewReminders()...');
    await reminderService.handleInterviewReminders();
    
    console.log('✅ Logic executed. Check your browser for real-time notifications!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
