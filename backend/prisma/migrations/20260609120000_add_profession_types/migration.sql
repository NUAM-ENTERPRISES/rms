-- CreateTable
CREATE TABLE "profession_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profession_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profession_types_name_key" ON "profession_types"("name");

-- CreateIndex
CREATE INDEX "profession_types_isActive_idx" ON "profession_types"("isActive");

-- Seed profession types
INSERT INTO "profession_types" ("id", "name", "label", "description", "sortOrder", "isActive", "createdAt", "updatedAt")
VALUES
    ('pt_nurse_seed001', 'nurse', 'Nurse', 'Nursing and patient care roles', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('pt_doctor_seed01', 'doctor', 'Doctor', 'Physician and medical doctor roles', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('pt_technician_s01', 'technician', 'Technician', 'Allied health and technical support roles', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable
ALTER TABLE "candidates" ADD COLUMN "professionTypeId" TEXT;

-- Backfill existing candidates with Nurse
UPDATE "candidates" SET "professionTypeId" = 'pt_nurse_seed001' WHERE "professionTypeId" IS NULL;

-- Make column required
ALTER TABLE "candidates" ALTER COLUMN "professionTypeId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "candidates_professionTypeId_idx" ON "candidates"("professionTypeId");

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_professionTypeId_fkey" FOREIGN KEY ("professionTypeId") REFERENCES "profession_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
