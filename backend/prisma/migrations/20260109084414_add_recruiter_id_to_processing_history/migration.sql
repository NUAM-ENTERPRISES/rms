-- AlterTable
ALTER TABLE "processing_history" ADD COLUMN     "recruiterId" TEXT;

-- CreateIndex
CREATE INDEX "processing_history_recruiterId_idx" ON "processing_history"("recruiterId");

-- AddForeignKey
ALTER TABLE "processing_history" ADD CONSTRAINT "processing_history_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
