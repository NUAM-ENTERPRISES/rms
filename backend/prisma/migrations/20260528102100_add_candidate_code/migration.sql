-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "candidate_code" TEXT;

-- CreateTable
CREATE TABLE "candidate_code_sequences" (
    "year" INTEGER NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "candidate_code_sequences_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE UNIQUE INDEX "candidates_candidate_code_key" ON "candidates"("candidate_code");

-- CreateIndex
CREATE INDEX "candidates_candidate_code_idx" ON "candidates"("candidate_code");

