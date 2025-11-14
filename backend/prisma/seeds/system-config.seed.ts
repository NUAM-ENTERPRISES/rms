import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedSystemConfig() {
  console.log('🌱 Seeding System Configuration...');

  // RNR Settings
  const rnrSettings = {
    totalDays: 3,
    remindersPerDay: 2,
    delayBetweenReminders: 1, // CHANGE THIS: 1 min for testing, 240 min (4 hours) for production
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

  console.log('✅ System Config seeded successfully!');
  console.log(`   - RNR delay between reminders: ${rnrSettings.delayBetweenReminders} minutes`);
  console.log(`   - Reminders per day: ${rnrSettings.remindersPerDay}`);
  console.log(`   - Total days: ${rnrSettings.totalDays}`);
  console.log(`   - Office hours: ${rnrSettings.officeHours.start} - ${rnrSettings.officeHours.end}`);
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
