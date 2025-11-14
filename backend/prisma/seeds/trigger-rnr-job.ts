import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';

const prisma = new PrismaClient();

async function triggerRNRJob() {
  try {
    // Find all active RNR reminders
    const activeReminders = await prisma.rNRReminder.findMany({
      where: {
        status: {
          in: ['pending', 'sent'],
        },
      },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            currentStatusId: true,
          },
        },
      },
    });

    console.log(`Found ${activeReminders.length} active RNR reminders`);

    if (activeReminders.length === 0) {
      console.log('No active reminders found.');
      return;
    }

    // Create BullMQ queue instance
    const rnrQueue = new Queue('rnr-reminders', {
      connection: {
        host: 'localhost',
        port: 6379,
      },
    });

    // Add job to queue for each active reminder
    for (const reminder of activeReminders) {
      // Check if candidate is still in RNR status (statusId = 8)
      if (reminder.candidate.currentStatusId !== 8) {
        console.log(`Skipping candidate ${reminder.candidateId} - not in RNR status anymore`);
        continue;
      }

      console.log(`\nTriggering job for candidate: ${reminder.candidate.firstName} ${reminder.candidate.lastName}`);
      console.log(`  Reminder ID: ${reminder.id}`);
      console.log(`  Days completed: ${reminder.daysCompleted}`);
      console.log(`  Daily count: ${reminder.dailyCount}`);
      console.log(`  Last reminder date: ${reminder.lastReminderDate}`);

      // Check if lastReminderDate is yesterday (for testing)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastDate = new Date(reminder.lastReminderDate);
      lastDate.setHours(0, 0, 0, 0);
      const isOldDate = lastDate.getTime() < today.getTime();

      // If testing with old date and dailyCount >= 2, reset it automatically
      if (isOldDate && reminder.dailyCount >= 2) {
        console.log(`  ⚠️  Detected old date with dailyCount=${reminder.dailyCount}. Resetting dailyCount to 0 for testing...`);
        await prisma.rNRReminder.update({
          where: { id: reminder.id },
          data: { dailyCount: 0 },
        });
        console.log(`  ✓ Reset dailyCount to 0`);
      }

      // Add job to queue with minimal delay (10 seconds)
      const uniqueJobId = `rnr-${reminder.id}-manual-${Date.now()}`;

      await rnrQueue.add(
        'process-rnr-reminder',
        {
          reminderId: reminder.id,
          candidateId: reminder.candidateId,
          recruiterId: reminder.recruiterId,
        },
        {
          delay: 10000, // 10 seconds
          jobId: uniqueJobId,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      console.log(`  ✓ Job ${uniqueJobId} scheduled to run in 10 seconds`);
    }

    await rnrQueue.close();
    console.log('\n✅ All jobs scheduled successfully!');
    console.log('Jobs will run in 10 seconds. Watch your server logs.');
    
  } catch (error) {
    console.error('Error triggering RNR job:', error);
  } finally {
    await prisma.$disconnect();
  }
}

triggerRNRJob();
