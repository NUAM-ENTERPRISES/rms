-- AlterTable
ALTER TABLE "users" ADD COLUMN "created_by_id" TEXT;

-- CreateIndex
CREATE INDEX "users_created_by_id_idx" ON "users"("created_by_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill creator from audit logs (user create actions)
UPDATE "users" u
SET "created_by_id" = a."userId"
FROM "audit_logs" a
WHERE a."entityType" = 'user'
  AND a."actionType" = 'create'
  AND a."entityId" = u."id"
  AND u."created_by_id" IS NULL
  AND a."userId" <> u."id";
