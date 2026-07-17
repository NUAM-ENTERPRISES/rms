-- CreateTable
CREATE TABLE "country_coverage_transfers" (
    "id" TEXT NOT NULL,
    "sourceUserId" TEXT NOT NULL,
    "transferredById" TEXT NOT NULL,
    "sourceCountryCode" TEXT NOT NULL,
    "sourceCountryCodes" TEXT[],
    "destinationCountryCode" TEXT NOT NULL,
    "destinationCountryCodes" TEXT[],
    "candidateCount" INTEGER NOT NULL DEFAULT 0,
    "transferMode" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "country_coverage_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country_coverage_transfer_candidates" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "candidateNameSnapshot" TEXT NOT NULL,
    "fromRecruiterId" TEXT NOT NULL,
    "toRecruiterId" TEXT NOT NULL,
    "fromRecruiterNameSnapshot" TEXT NOT NULL,
    "toRecruiterNameSnapshot" TEXT NOT NULL,
    "statusNameSnapshot" TEXT NOT NULL,

    CONSTRAINT "country_coverage_transfer_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "country_coverage_transfers_sourceUserId_idx" ON "country_coverage_transfers"("sourceUserId");

-- CreateIndex
CREATE INDEX "country_coverage_transfers_transferredById_idx" ON "country_coverage_transfers"("transferredById");

-- CreateIndex
CREATE INDEX "country_coverage_transfers_destinationCountryCode_idx" ON "country_coverage_transfers"("destinationCountryCode");

-- CreateIndex
CREATE INDEX "country_coverage_transfers_sourceCountryCode_idx" ON "country_coverage_transfers"("sourceCountryCode");

-- CreateIndex
CREATE INDEX "country_coverage_transfers_createdAt_idx" ON "country_coverage_transfers"("createdAt");

-- CreateIndex
CREATE INDEX "country_coverage_transfer_candidates_candidateId_idx" ON "country_coverage_transfer_candidates"("candidateId");

-- CreateIndex
CREATE INDEX "country_coverage_transfer_candidates_fromRecruiterId_idx" ON "country_coverage_transfer_candidates"("fromRecruiterId");

-- CreateIndex
CREATE INDEX "country_coverage_transfer_candidates_toRecruiterId_idx" ON "country_coverage_transfer_candidates"("toRecruiterId");

-- CreateIndex
CREATE INDEX "country_coverage_transfer_candidates_transferId_idx" ON "country_coverage_transfer_candidates"("transferId");

-- CreateIndex
CREATE UNIQUE INDEX "country_coverage_transfer_candidates_transferId_candidateId_key" ON "country_coverage_transfer_candidates"("transferId", "candidateId");

-- AddForeignKey
ALTER TABLE "country_coverage_transfers" ADD CONSTRAINT "country_coverage_transfers_sourceUserId_fkey" FOREIGN KEY ("sourceUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "country_coverage_transfers" ADD CONSTRAINT "country_coverage_transfers_transferredById_fkey" FOREIGN KEY ("transferredById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "country_coverage_transfer_candidates" ADD CONSTRAINT "country_coverage_transfer_candidates_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "country_coverage_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "country_coverage_transfer_candidates" ADD CONSTRAINT "country_coverage_transfer_candidates_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "country_coverage_transfer_candidates" ADD CONSTRAINT "country_coverage_transfer_candidates_fromRecruiterId_fkey" FOREIGN KEY ("fromRecruiterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "country_coverage_transfer_candidates" ADD CONSTRAINT "country_coverage_transfer_candidates_toRecruiterId_fkey" FOREIGN KEY ("toRecruiterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
