/*
  Warnings:

  - You are about to drop the column `expectedSalary` on the `candidates` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "candidates" DROP COLUMN "expectedSalary",
ADD COLUMN     "expectedMaxSalary" INTEGER,
ADD COLUMN     "expectedMinSalary" INTEGER,
ADD COLUMN     "sectorType" TEXT,
ADD COLUMN     "visaType" TEXT;

-- CreateTable
CREATE TABLE "candidate_preferred_countries" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,

    CONSTRAINT "candidate_preferred_countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_facility_preferences" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "facilityType" TEXT NOT NULL,

    CONSTRAINT "candidate_facility_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candidate_preferred_countries_candidateId_idx" ON "candidate_preferred_countries"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_preferred_countries_candidateId_countryCode_key" ON "candidate_preferred_countries"("candidateId", "countryCode");

-- CreateIndex
CREATE INDEX "candidate_facility_preferences_candidateId_idx" ON "candidate_facility_preferences"("candidateId");

-- AddForeignKey
ALTER TABLE "candidate_preferred_countries" ADD CONSTRAINT "candidate_preferred_countries_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_preferred_countries" ADD CONSTRAINT "candidate_preferred_countries_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "countries"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_facility_preferences" ADD CONSTRAINT "candidate_facility_preferences_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
