import { PrismaClient } from '@prisma/client';

declare const process: any;
declare const require: any;
declare const module: any;

export async function seedSystemConfig(prisma: PrismaClient) {
  console.log('🌱 Seeding System Configuration...');

  // RNR Settings
  const rnrSettings = {
    totalDays: 3,
    remindersPerDay: 2,
    delayBetweenReminders: 240, // minutes — production default (4 hours)
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
  const hrdSettings = {
    // Testing mode: start reminders 1 minute after submittedAt
    daysAfterSubmission: 0,
    remindersPerDay: 1,
    dailyTimes: ['09:00'], // times in HH:mm (office morning)
    totalDays: 3, 
    delayBetweenReminders: 1, // 1 minute delay for testing
    officeHours: {
      enabled: false, // Disabled for testing common flows
      start: '00:00',
      end: '23:59',
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

  // DATA FLOW Settings
  const dataFlowSettings = {
    // Testing mode: start reminders 1 minute after submittedAt
    daysAfterSubmission: 0,
    remindersPerDay: 1,
    dailyTimes: ['09:00'],
    totalDays: 3,
    delayBetweenReminders: 1, // 1 minute delay for testing
    officeHours: {
      enabled: false,
      start: '00:00',
      end: '23:59',
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

  // Common settings for other processing steps (15 days)
  const defaultProcessingSettings = (key: string, description: string) => {
    const settings = {
      daysAfterSubmission: 15,
      remindersPerDay: 1,
      dailyTimes: ['09:00'],
      totalDays: 3,
      delayBetweenReminders: 60 * 24,
      officeHours: {
        enabled: true,
        start: '09:00',
        end: '18:00',
      },
      escalate: {
        enabled: false,
        afterDays: 3,
        assignmentStrategy: 'round_robin',
      },
      testMode: {
        enabled: false,
        immediateDelayMinutes: 1,
      },
    };

    return prisma.systemConfig.upsert({
      where: { key },
      update: {
        value: settings,
        description,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        key,
        value: settings,
        description,
        isActive: true,
      },
    });
  };

  await Promise.all([
    defaultProcessingSettings('MEDICAL_SETTINGS', 'Medical reminder system configuration'),
    defaultProcessingSettings('BIOMETRIC_SETTINGS', 'Biometric reminder system configuration'),
    defaultProcessingSettings('EMIGRATION_SETTINGS', 'Emigration reminder system configuration'),
    defaultProcessingSettings('DOCUMENT_RECEIVED_SETTINGS', 'Document Received / Council Registration reminder system configuration'),
  ]);

  // State code → ordered language codes for recruiter auto-assignment
  const stateRecruitmentLanguages: Record<string, string[]> = {
    // States
    AP: ['te', 'hi', 'en'], // Andhra Pradesh
    AR: ['hi', 'en'],       // Arunachal Pradesh
    AS: ['as', 'hi', 'en'], // Assam
    BR: ['hi', 'en'],       // Bihar
    CT: ['hi', 'en'],       // Chhattisgarh
    GA: ['gom', 'hi', 'en'],// Goa
    GJ: ['gu', 'hi', 'en'], // Gujarat
    HR: ['hi', 'en'],       // Haryana
    HP: ['hi', 'en'],       // Himachal Pradesh
    JH: ['hi', 'en'],       // Jharkhand
    KA: ['kn', 'hi', 'en'], // Karnataka
    KL: ['ml', 'en'],       // Kerala
    MP: ['hi', 'en'],       // Madhya Pradesh
    MH: ['hi', 'mr'],       // Maharashtra (Hindi priority as requested)
    MN: ['mni', 'hi', 'en'],// Manipur
    ML: ['hi', 'en'],       // Meghalaya
    MZ: ['lus', 'hi', 'en'],// Mizoram
    NL: ['en', 'hi'],       // Nagaland
    OR: ['or', 'hi', 'en'], // Odisha
    PB: ['pa', 'hi', 'en'], // Punjab
    RJ: ['hi', 'en'],       // Rajasthan
    SK: ['ne', 'hi', 'en'], // Sikkim
    TN: ['ta', 'en'],       // Tamil Nadu
    TG: ['te', 'hi', 'en'], // Telangana
    TR: ['hi', 'en'],       // Tripura
    UP: ['hi', 'en'],       // Uttar Pradesh
    UT: ['hi', 'en'],       // Uttarakhand
    WB: ['bn', 'hi', 'en'], // West Bengal

    // Union Territories
    AN: ['hi', 'en'],       // Andaman and Nicobar Islands
    CH: ['hi', 'en'],       // Chandigarh
    DN: ['hi', 'en'],       // Dadra and Nagar Haveli
    DD: ['hi', 'en'],       // Daman and Diu
    DL: ['hi', 'en'],       // Delhi
    JK: ['hi', 'en'],       // Jammu and Kashmir
    LA: ['hi', 'en'],       // Ladakh
    LD: ['ml', 'en'],       // Lakshadweep
    PY: ['ta', 'en'],       // Puducherry
  };

  await prisma.systemConfig.upsert({
    where: { key: 'STATE_RECRUITMENT_LANGUAGES' },
    update: {
      value: stateRecruitmentLanguages,
      description: 'Map state code (e.g. KL, MH) to ISO 639-1 language codes for round-robin matching',
      isActive: true,
      updatedAt: new Date(),
    },
    create: {
      key: 'STATE_RECRUITMENT_LANGUAGES',
      value: stateRecruitmentLanguages,
      description: 'Map state code (e.g. KL, MH) to ISO 639-1 language codes for round-robin matching',
      isActive: true,
    },
  });

  // Session Monitoring Settings
  const sessionSettings = {
    activityThrottleMinutes: 5,
    idleThresholdMinutes: 15,
    adminSessionPollingSeconds: 60,
    maxSessionDurationHours: 24,
    breakAutoResetMinutes: 30,
    heartbeatEnabled: true,
    realtimeSessionUpdatesEnabled: true,
  };

  await prisma.systemConfig.upsert({
    where: { key: 'SESSION_SETTINGS' },
    update: {
      value: sessionSettings,
      description: 'Session monitoring and activity tracking configuration',
      isActive: true,
      updatedAt: new Date(),
    },
    create: {
      key: 'SESSION_SETTINGS',
      value: sessionSettings,
      description: 'Session monitoring and activity tracking configuration',
      isActive: true,
    },
  });

  const affiniksOfficeAddresses = {
    kochi: {
      label: 'Kochi Office',
      address: 'Affiniks Kochi Office, MG Road, Kochi',
      addressCountryCode: 'IN',
      addressStateId: null,
      pincode: '682016',
      altPhone: '+91 484 000 0001',
      phone: '+91 484 000 0000',
    },
    delhi: {
      label: 'Delhi Office',
      address: 'Affiniks Delhi Office, Connaught Place, New Delhi',
      addressCountryCode: 'IN',
      addressStateId: null,
      pincode: '110001',
      altPhone: '+91 11 0000 0001',
      phone: '+91 11 0000 0000',
    },
  };

  await prisma.systemConfig.upsert({
    where: { key: 'AFFINIKS_OFFICE_ADDRESSES' },
    update: {
      value: affiniksOfficeAddresses,
      description: 'Preset physical addresses for Affiniks Kochi and Delhi offices (courier management)',
      isActive: true,
      updatedAt: new Date(),
    },
    create: {
      key: 'AFFINIKS_OFFICE_ADDRESSES',
      value: affiniksOfficeAddresses,
      description: 'Preset physical addresses for Affiniks Kochi and Delhi offices (courier management)',
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
  const prisma = new PrismaClient();
  seedSystemConfig(prisma)
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
