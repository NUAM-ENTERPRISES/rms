-- AlterTable
ALTER TABLE "candidate_qualifications" ADD COLUMN     "countryCode" TEXT;

-- AlterTable
ALTER TABLE "work_experiences" ADD COLUMN     "countryCode" TEXT;

-- CreateIndex
CREATE INDEX "candidate_qualifications_countryCode_idx" ON "candidate_qualifications"("countryCode");

-- CreateIndex
CREATE INDEX "work_experiences_countryCode_idx" ON "work_experiences"("countryCode");

-- AddForeignKey
ALTER TABLE "work_experiences" ADD CONSTRAINT "work_experiences_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "countries"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_qualifications" ADD CONSTRAINT "candidate_qualifications_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "countries"("code") ON DELETE SET NULL ON UPDATE CASCADE;
