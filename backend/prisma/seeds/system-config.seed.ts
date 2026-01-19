import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedSystemConfig() {
  console.log('🌱 Seeding System Configuration...');

  // RNR Settings
  const rnrSettings = {
    totalDays: 3,
    remindersPerDay: 2,
    delayBetweenReminders: 240, // minutes — default production: 240 (4 hours); set to 1 for quick local testing
    officeHours: {
      start: '09:00',
      end: '18:00',
    },
    creAssignment: {
      enabled: true,
      afterDays: 3,
      assignmentStrategy: 'round_robin',
      creRoleId: null,
      creTeamId: null,
    },
  };

  await prisma.systemConfig.upsert({
    where: { key: 'RNR_SETTINGS' },
    update: {
      value: rnrSettings,
      description: 'RNR (Ring Not Response) reminder system configuration',
      isActive: true,
      updatedAt: new Date(),
    },
    create: {
      key: 'RNR_SETTINGS',
      value: rnrSettings,
      description: 'RNR (Ring Not Response) reminder system configuration',
      isActive: true,
    },
  });

  // HRD Settings (new)
  // For testing: schedule first HRD reminder ~1 minute from now
  const now = new Date();
  const oneMinuteLater = new Date(now.getTime() + 60 * 1000);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const hhmm = `${pad(oneMinuteLater.getHours())}:${pad(oneMinuteLater.getMinutes())}`;

  const hrdSettings = {
    // Production defaults: start reminders 15 days after submittedAt
    daysAfterSubmission: 15,
    remindersPerDay: 1,
    dailyTimes: ['09:00'], // times in HH:mm (office morning)
    totalDays: 3, // send reminders for 3 consecutive days (first + 2 follow-ups)
    delayBetweenReminders: 60 * 24, // minutes (1 day) - fallback for repeating daily reminders
    officeHours: {
      start: '09:00',
      end: '18:00',
    },
    escalate: {
      enabled: false,
      afterDays: 3,
      assignmentStrategy: 'round_robin',
    },
    testMode: {
      enabled: true,
      immediateDelayMinutes: 1,
    },
  };

  await prisma.systemConfig.upsert({
    where: { key: 'HRD_SETTINGS' },
    update: {
      value: hrdSettings,
      description: 'HRD reminder system configuration',
      isActive: true,
      updatedAt: new Date(),
    },
    create: {
      key: 'HRD_SETTINGS',
      value: hrdSettings,
      description: 'HRD reminder system configuration',
      isActive: true,
    },
  });

  // DATA FLOW Settings (same defaults as HRD) — enable test mode for quick verification
  const dataFlowSettings = {
    ...hrdSettings,
    // For testing: schedule first reminder immediately
    daysAfterSubmission: 0,
    testMode: { ...hrdSettings.testMode, enabled: true, immediateDelayMinutes: 1 },
  };

  await prisma.systemConfig.upsert({
    where: { key: 'DATA_FLOW_SETTINGS' },
    update: {
      value: dataFlowSettings,
      description: 'Data Flow reminder system configuration',
      isActive: true,
      updatedAt: new Date(),
    },
    create: {
      key: 'DATA_FLOW_SETTINGS',
      value: dataFlowSettings,
      description: 'Data Flow reminder system configuration',
      isActive: true,
    },
  });

  console.log('✅ System Config seeded successfully!');
  console.log(`   - RNR delay between reminders: ${rnrSettings.delayBetweenReminders} minutes`);
  console.log(`   - Reminders per day: ${rnrSettings.remindersPerDay}`);
  console.log(`   - Total days: ${rnrSettings.totalDays}`);
  console.log(`   - Office hours: ${rnrSettings.officeHours.start} - ${rnrSettings.officeHours.end}`);
  console.log('');
  console.log('   - HRD days after submission:', hrdSettings.daysAfterSubmission);
  console.log('   - HRD daily times:', hrdSettings.dailyTimes.join(', '));
  console.log('   - HRD reminders per day:', hrdSettings.remindersPerDay);
  console.log('   - HRD total days:', hrdSettings.totalDays);
  console.log('');
  console.log('   - Data Flow days after submission:', dataFlowSettings.daysAfterSubmission);
  console.log('   - Data Flow daily times:', dataFlowSettings.dailyTimes.join(', '));
  console.log('   - Data Flow reminders per day:', dataFlowSettings.remindersPerDay);
  console.log('   - Data Flow total days:', dataFlowSettings.totalDays);
}

// Run if executed directly
if (require.main === module) {
  seedSystemConfig()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
