-- AlterTable
ALTER TABLE "clients" ADD COLUMN "createdBy" TEXT;

-- CreateIndex
CREATE INDEX "clients_createdBy_idx" ON "clients"("createdBy");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill from project creators where client has no owner yet
UPDATE "clients" AS c
SET "createdBy" = p."createdBy"
FROM "projects" AS p
WHERE p."clientId" = c.id
  AND c."createdBy" IS NULL
  AND p."createdBy" IS NOT NULL;
