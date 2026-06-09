-- CreateTable
CREATE TABLE "candidate_role_preferences" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "roleCatalogId" TEXT NOT NULL,

    CONSTRAINT "candidate_role_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candidate_role_preferences_candidateId_idx" ON "candidate_role_preferences"("candidateId");

-- CreateIndex
CREATE INDEX "candidate_role_preferences_roleCatalogId_idx" ON "candidate_role_preferences"("roleCatalogId");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_role_preferences_candidateId_roleCatalogId_key" ON "candidate_role_preferences"("candidateId", "roleCatalogId");

-- AddForeignKey
ALTER TABLE "candidate_role_preferences" ADD CONSTRAINT "candidate_role_preferences_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_role_preferences" ADD CONSTRAINT "candidate_role_preferences_roleCatalogId_fkey" FOREIGN KEY ("roleCatalogId") REFERENCES "role_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
