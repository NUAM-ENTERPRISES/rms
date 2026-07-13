-- AlterTable
ALTER TABLE "work_experiences" ADD COLUMN "stateId" TEXT;

-- CreateIndex
CREATE INDEX "work_experiences_stateId_idx" ON "work_experiences"("stateId");

-- AddForeignKey
ALTER TABLE "work_experiences" ADD CONSTRAINT "work_experiences_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;
