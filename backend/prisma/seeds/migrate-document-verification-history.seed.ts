import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * This seed migrates existing document verification data to the new history table
 * Run this ONCE after applying the migration to preserve historical data
 */
async function migrateDocumentVerificationHistory() {
  console.log('🔄 Migrating document verification history...');

  // Note: Since we removed the verifiedBy, verifiedAt, rejectedBy, rejectedAt fields,
  // there's no historical data to migrate. This seed is provided as a template
  // for future use if you need to backfill history from another source.

  // If you had preserved the data before migration, you would query it here
  // and create history entries. For example:
  
  // const verifications = await prisma.candidateProjectDocumentVerification.findMany({
  //   where: {
  //     OR: [
  //       { verifiedBy: { not: null } },
  //       { rejectedBy: { not: null } },
  //     ],
  //   },
  // });

  // for (const verification of verifications) {
  //   if (verification.verifiedBy && verification.verifiedAt) {
  //     await prisma.documentVerificationHistory.create({
  //       data: {
  //         verificationId: verification.id,
  //         action: 'verified',
  //         performedBy: verification.verifiedBy,
  //         performedAt: verification.verifiedAt,
  //       },
  //     });
  //   }
  //   if (verification.rejectedBy && verification.rejectedAt) {
  //     await prisma.documentVerificationHistory.create({
  //       data: {
  //         verificationId: verification.id,
  //         action: 'rejected',
  //         performedBy: verification.rejectedBy,
  //         performedAt: verification.rejectedAt,
  //       },
  //     });
  //   }
  // }

  console.log('✅ Document verification history migration complete');
  console.log('ℹ️  Going forward, all verification actions will be tracked in the history table');
}

migrateDocumentVerificationHistory()
  .catch((e) => {
    console.error('❌ Error migrating document verification history:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
