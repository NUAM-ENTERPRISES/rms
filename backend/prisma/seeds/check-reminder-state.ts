import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const reminder = await prisma.rNRReminder.findFirst({
    where: { 
      candidateId: 'cmhx5rqqd0003q4a3b1v1yaad',
      status: { in: ['pending', 'sent'] }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  if (!reminder) {
    console.log('Reminder not found!');
    return;
  }
  
  console.log('\n📊 Current Reminder State:');
  console.log(`  Days Completed: ${reminder.daysCompleted}`);
  console.log(`  Daily Count: ${reminder.dailyCount}`);
  console.log(`  Reminder Count: ${reminder.reminderCount}`);
  console.log(`  Status: ${reminder.status}`);
  console.log(`  Last Reminder Date: ${reminder.lastReminderDate}`);
  console.log(`  CRE Assigned: ${reminder.creAssigned}`);
  console.log(`  Sent At: ${reminder.sentAt}`);
  
  await prisma.$disconnect();
}

check();
