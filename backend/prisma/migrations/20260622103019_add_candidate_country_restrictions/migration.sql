-- AlterTable
ALTER TABLE "candidate_project_status_change_requests" ADD COLUMN     "restrictCountryCode" TEXT;

-- CreateTable
CREATE TABLE "candidate_country_restrictions" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "restrictionType" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceMeta" JSONB,
    "statusChangeRequestId" TEXT,
    "restrictedById" TEXT NOT NULL,
    "restrictedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "liftedAt" TIMESTAMP(3),
    "liftedById" TEXT,
    "liftReason" TEXT,

    CONSTRAINT "candidate_country_restrictions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candidate_country_restrictions_candidateId_isActive_idx" ON "candidate_country_restrictions"("candidateId", "isActive");

-- CreateIndex
CREATE INDEX "candidate_country_restrictions_countryCode_isActive_idx" ON "candidate_country_restrictions"("countryCode", "isActive");

-- Partial unique: one active restriction per candidate per country
CREATE UNIQUE INDEX "candidate_country_restrictions_candidate_country_active_key"
ON "candidate_country_restrictions"("candidateId", "countryCode")
WHERE "isActive" = true;

-- RenameForeignKey
ALTER TABLE "candidate_project_status_change_requests" RENAME CONSTRAINT "candidate_project_status_change_requests_processingCandidateId_" TO "candidate_project_status_change_requests_processingCandida_fkey";

-- AddForeignKey
ALTER TABLE "candidate_country_restrictions" ADD CONSTRAINT "candidate_country_restrictions_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_country_restrictions" ADD CONSTRAINT "candidate_country_restrictions_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "countries"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_country_restrictions" ADD CONSTRAINT "candidate_country_restrictions_restrictedById_fkey" FOREIGN KEY ("restrictedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_country_restrictions" ADD CONSTRAINT "candidate_country_restrictions_liftedById_fkey" FOREIGN KEY ("liftedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_country_restrictions" ADD CONSTRAINT "candidate_country_restrictions_statusChangeRequestId_fkey" FOREIGN KEY ("statusChangeRequestId") REFERENCES "candidate_project_status_change_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
