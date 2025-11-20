import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const candidateProjectStatuses = [
  {
    statusName: 'nominated',
    label: 'Nominated',
    description: 'Candidate has been nominated for the project',
    stage: 'nomination',
    isTerminal: false,
    color: 'blue',
  },
  {
    statusName: 'pending_documents',
    label: 'Pending Documents',
    description: 'Waiting for candidate to submit required documents',
    stage: 'documents',
    isTerminal: false,
    color: 'yellow',
  },
  {
    statusName: 'documents_submitted',
    label: 'Documents Submitted',
    description: 'Candidate has submitted all required documents',
    stage: 'documents',
    isTerminal: false,
    color: 'blue',
  },
  {
    statusName: 'verification_in_progress',
    label: 'Verification In Progress',
    description: 'Documents are being verified',
    stage: 'documents',
    isTerminal: false,
    color: 'orange',
  },
  {
    statusName: 'documents_verified',
    label: 'Documents Verified',
    description: 'All documents have been verified successfully',
    stage: 'documents',
    isTerminal: false,
    color: 'green',
  },
  {
    statusName: 'approved',
    label: 'Approved',
    description: 'Candidate has been approved for interview',
    stage: 'approval',
    isTerminal: false,
    color: 'green',
  },
  {
    statusName: 'interview_scheduled',
    label: 'Interview Scheduled',
    description: 'Interview has been scheduled',
    stage: 'interview',
    isTerminal: false,
    color: 'purple',
  },
  {
    statusName: 'interview_completed',
    label: 'Interview Completed',
    description: 'Interview has been completed, awaiting results',
    stage: 'interview',
    isTerminal: false,
    color: 'purple',
  },
  {
    statusName: 'interview_passed',
    label: 'Interview Passed',
    description: 'Candidate has passed the interview',
    stage: 'interview',
    isTerminal: false,
    color: 'green',
  },
  {
    statusName: 'selected',
    label: 'Selected',
    description: 'Candidate has been selected for the position',
    stage: 'selection',
    isTerminal: false,
    color: 'green',
  },
  {
    statusName: 'processing',
    label: 'Processing',
    description: 'Candidate is in processing phase (visa, medical, etc.)',
    stage: 'processing',
    isTerminal: false,
    color: 'orange',
  },
  {
    statusName: 'hired',
    label: 'Hired',
    description: 'Candidate has been successfully hired',
    stage: 'final',
    isTerminal: true,
    color: 'green',
  },
  {
    statusName: 'rejected_documents',
    label: 'Rejected - Documents',
    description: 'Candidate rejected due to document issues',
    stage: 'rejected',
    isTerminal: true,
    color: 'red',
  },
  {
    statusName: 'rejected_interview',
    label: 'Rejected - Interview',
    description: 'Candidate did not pass the interview',
    stage: 'rejected',
    isTerminal: true,
    color: 'red',
  },
  {
    statusName: 'rejected_selection',
    label: 'Rejected - Selection',
    description: 'Candidate was not selected after interview',
    stage: 'rejected',
    isTerminal: true,
    color: 'red',
  },
  {
    statusName: 'withdrawn',
    label: 'Withdrawn',
    description: 'Candidate has withdrawn from the process',
    stage: 'withdrawn',
    isTerminal: true,
    color: 'gray',
  },
  {
    statusName: 'on_hold',
    label: 'On Hold',
    description: 'Candidate application is temporarily on hold',
    stage: 'on_hold',
    isTerminal: false,
    color: 'yellow',
  },
];

async function seedCandidateProjectStatuses() {
  console.log('🌱 Seeding candidate project statuses...');

  for (const status of candidateProjectStatuses) {
    await prisma.candidateProjectStatus.upsert({
      where: { statusName: status.statusName },
      update: {
        label: status.label,
        description: status.description,
        stage: status.stage,
        isTerminal: status.isTerminal,
        color: status.color,
      },
      create: status,
    });
  }

  const count = await prisma.candidateProjectStatus.count();
  console.log(`✅ Successfully seeded ${count} candidate project statuses`);

  // Display summary by stage
  const stages = await prisma.candidateProjectStatus.groupBy({
    by: ['stage'],
    _count: {
      id: true,
    },
  });

  console.log('\n📊 Status breakdown by stage:');
  stages.forEach((stage) => {
    console.log(`   ${stage.stage}: ${stage._count.id} statuses`);
  });
}

seedCandidateProjectStatuses()
  .catch((e) => {
    console.error('❌ Error seeding candidate project statuses:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
