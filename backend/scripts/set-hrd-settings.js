const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const daysAfterSubmission = process.env.DAYS_AFTER_SUBMISSION ? Number(process.env.DAYS_AFTER_SUBMISSION) : 15;
  const dailyTimes = process.env.DAILY_TIMES ? process.env.DAILY_TIMES.split(',') : ['09:00'];
  const remindersPerDay = process.env.REMINDERS_PER_DAY ? Number(process.env.REMINDERS_PER_DAY) : 1;
  const totalDays = process.env.TOTAL_DAYS ? Number(process.env.TOTAL_DAYS) : 3;
  const delayBetweenReminders = process.env.DELAY_BETWEEN_REMINDERS ? Number(process.env.DELAY_BETWEEN_REMINDERS) : 1440;

  const hrdSettings = {
    daysAfterSubmission,
    remindersPerDay,
    dailyTimes,
    totalDays,
    delayBetweenReminders,
    officeHours: { start: '09:00', end: '18:00' },
    escalate: { enabled: false, afterDays: 3, assignmentStrategy: 'round_robin' },
    testMode: { enabled: false, immediateDelayMinutes: 1 },
  };

  console.log('Upserting HRD_SETTINGS with:', JSON.stringify(hrdSettings, null, 2));

  await prisma.systemConfig.upsert({
    where: { key: 'HRD_SETTINGS' },
    update: { value: hrdSettings, description: 'HRD reminder system configuration', isActive: true, updatedAt: new Date() },
    create: { key: 'HRD_SETTINGS', value: hrdSettings, description: 'HRD reminder system configuration', isActive: true },
  });

  console.log('✅ HRD_SETTINGS upserted successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });