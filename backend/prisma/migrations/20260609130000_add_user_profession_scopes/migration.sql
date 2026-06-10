-- CreateTable
CREATE TABLE "user_profession_scopes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "professionTypeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profession_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profession_scopes_userId_professionTypeId_key" ON "user_profession_scopes"("userId", "professionTypeId");

-- CreateIndex
CREATE INDEX "user_profession_scopes_userId_idx" ON "user_profession_scopes"("userId");

-- CreateIndex
CREATE INDEX "user_profession_scopes_professionTypeId_idx" ON "user_profession_scopes"("professionTypeId");

-- AddForeignKey
ALTER TABLE "user_profession_scopes" ADD CONSTRAINT "user_profession_scopes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profession_scopes" ADD CONSTRAINT "user_profession_scopes_professionTypeId_fkey" FOREIGN KEY ("professionTypeId") REFERENCES "profession_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: Recruiter role users → Nurse only
INSERT INTO "user_profession_scopes" ("id", "userId", "professionTypeId", "createdAt", "updatedAt")
SELECT
    'ups_nurse_' || u."id",
    u."id",
    'pt_nurse_seed001',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "users" u
WHERE EXISTS (
    SELECT 1
    FROM "user_roles" ur
    INNER JOIN "roles" r ON r."id" = ur."roleId"
    WHERE ur."userId" = u."id"
      AND r."name" = 'Recruiter'
);

-- Backfill: all other users → all active profession types
INSERT INTO "user_profession_scopes" ("id", "userId", "professionTypeId", "createdAt", "updatedAt")
SELECT
    'ups_all_' || u."id" || '_' || pt."id",
    u."id",
    pt."id",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "users" u
CROSS JOIN "profession_types" pt
WHERE pt."isActive" = true
  AND NOT EXISTS (
    SELECT 1
    FROM "user_roles" ur
    INNER JOIN "roles" r ON r."id" = ur."roleId"
    WHERE ur."userId" = u."id"
      AND r."name" = 'Recruiter'
);
