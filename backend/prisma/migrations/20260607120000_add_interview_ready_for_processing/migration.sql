-- AlterTable
ALTER TABLE "interviews" ADD COLUMN "readyForProcessingAt" TIMESTAMP(3),
ADD COLUMN "readyForProcessingById" TEXT;

-- CreateIndex
CREATE INDEX "interviews_readyForProcessingAt_idx" ON "interviews"("readyForProcessingAt");

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_readyForProcessingById_fkey" FOREIGN KEY ("readyForProcessingById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: existing passed interviews remain visible on Ready for Processing queue
UPDATE "interviews"
SET "readyForProcessingAt" = COALESCE("completedAt", "updatedAt")
WHERE "outcome" = 'passed' AND "readyForProcessingAt" IS NULL;
