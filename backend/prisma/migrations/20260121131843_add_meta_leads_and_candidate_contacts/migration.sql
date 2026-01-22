-- CreateEnum
CREATE TYPE "MetaLeadStatus" AS ENUM ('pending', 'linked', 'skipped', 'fraud', 'review', 'processed');

-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "candidate_contacts" JSONB NOT NULL DEFAULT '[]',
ALTER COLUMN "dateOfBirth" DROP NOT NULL;

-- CreateTable
CREATE TABLE "meta_leads" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "formId" TEXT,
    "campaignId" TEXT,
    "adsetId" TEXT,
    "adId" TEXT,
    "fullName" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" VARCHAR(254),
    "countryCode" TEXT,
    "phoneNumber" TEXT,
    "formSubmissionTime" TIMESTAMP(3),
    "rawPayload" JSONB NOT NULL,
    "status" "MetaLeadStatus" NOT NULL DEFAULT 'pending',
    "source" TEXT DEFAULT 'meta',
    "consentGiven" BOOLEAN DEFAULT false,
    "consentAt" TIMESTAMP(3),
    "candidateId" TEXT,
    "processingNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "erasedAt" TIMESTAMP(3),

    CONSTRAINT "meta_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meta_leads_leadId_key" ON "meta_leads"("leadId");

-- CreateIndex
CREATE INDEX "meta_leads_email_idx" ON "meta_leads"("email");

-- CreateIndex
CREATE INDEX "meta_leads_countryCode_phoneNumber_idx" ON "meta_leads"("countryCode", "phoneNumber");

-- CreateIndex
CREATE INDEX "meta_leads_status_idx" ON "meta_leads"("status");

-- AddForeignKey
ALTER TABLE "meta_leads" ADD CONSTRAINT "meta_leads_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
