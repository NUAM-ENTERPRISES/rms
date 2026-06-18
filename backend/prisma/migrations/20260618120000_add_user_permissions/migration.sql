-- Create user_permissions join table for direct per-user permission grants
CREATE TABLE "user_permissions" (
    "userId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("userId", "permissionId")
);

CREATE INDEX "user_permissions_userId_idx" ON "user_permissions"("userId");
CREATE INDEX "user_permissions_permissionId_idx" ON "user_permissions"("permissionId");

ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permissionId_fkey"
    FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from original_document_intake_enabled flag
INSERT INTO "user_permissions" ("userId", "permissionId")
SELECT u."id", p."id"
FROM "users" u
CROSS JOIN "permissions" p
WHERE u."original_document_intake_enabled" = true
  AND p."key" IN ('read:original_document_intake', 'write:original_document_intake')
ON CONFLICT DO NOTHING;

-- Backfill from courier_management_enabled flag
INSERT INTO "user_permissions" ("userId", "permissionId")
SELECT u."id", p."id"
FROM "users" u
CROSS JOIN "permissions" p
WHERE u."courier_management_enabled" = true
  AND p."key" IN (
    'read:courier_management',
    'write:courier_management',
    'read:original_document_intake'
  )
ON CONFLICT DO NOTHING;

-- Drop per-user flag columns
ALTER TABLE "users" DROP COLUMN "original_document_intake_enabled";
ALTER TABLE "users" DROP COLUMN "courier_management_enabled";
