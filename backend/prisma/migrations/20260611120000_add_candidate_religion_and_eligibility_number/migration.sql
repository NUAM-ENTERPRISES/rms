-- AlterTable
ALTER TABLE "candidates" ADD COLUMN "religionId" TEXT,
ADD COLUMN "eligibility_number" TEXT;

-- CreateIndex
CREATE INDEX "candidates_religionId_idx" ON "candidates"("religionId");

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_religionId_fkey" FOREIGN KEY ("religionId") REFERENCES "religions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
