-- AlterTable
ALTER TABLE "roles" ADD COLUMN "is_system" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "roles" ADD COLUMN "created_by_id" TEXT;

-- CreateIndex
CREATE INDEX "roles_created_by_id_idx" ON "roles"("created_by_id");
CREATE INDEX "roles_is_system_idx" ON "roles"("is_system");

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill seeded system roles
UPDATE "roles"
SET "is_system" = true
WHERE "name" IN (
  'CEO',
  'Director',
  'Manager',
  'Processing Manager',
  'Recruiter Manager',
  'Team Head',
  'Team Lead',
  'Recruiter',
  'Documentation Executive',
  'Documents Control Executive',
  'Processing Executive',
  'Interview Coordinator',
  'Screening Trainer',
  'Agent Coordinator',
  'Project Coordinator',
  'System Admin',
  'Operations',
  'CRE',
  'Admin',
  'Client Coordinator'
);
