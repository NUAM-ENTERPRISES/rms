-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "workExperienceId" TEXT;

-- CreateIndex
CREATE INDEX "documents_workExperienceId_idx" ON "documents"("workExperienceId");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_workExperienceId_fkey" FOREIGN KEY ("workExperienceId") REFERENCES "work_experiences"("id") ON DELETE SET NULL ON UPDATE CASCADE;
