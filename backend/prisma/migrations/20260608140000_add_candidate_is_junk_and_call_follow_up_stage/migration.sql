-- AlterTable
ALTER TABLE "candidates" ADD COLUMN "is_junk" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "operations_call_logs" ADD COLUMN "followUpStage" TEXT NOT NULL DEFAULT 'initial';

-- CreateIndex
CREATE INDEX "candidates_is_junk_idx" ON "candidates"("is_junk");
