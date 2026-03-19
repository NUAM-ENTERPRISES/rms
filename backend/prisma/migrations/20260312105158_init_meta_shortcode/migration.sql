/*
  Warnings:

  - A unique constraint covering the columns `[shortCode]` on the table `meta_leads` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "meta_leads" ADD COLUMN     "platform" TEXT,
ADD COLUMN     "senderId" TEXT,
ADD COLUMN     "shortCode" TEXT,
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3),
ALTER COLUMN "leadId" DROP NOT NULL,
ALTER COLUMN "rawPayload" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "meta_leads_shortCode_key" ON "meta_leads"("shortCode");

-- CreateIndex
CREATE INDEX "meta_leads_shortCode_idx" ON "meta_leads"("shortCode");
