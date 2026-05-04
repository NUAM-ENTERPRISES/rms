-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "address" TEXT,
ADD COLUMN     "addressCountryCode" TEXT,
ADD COLUMN     "addressStateId" TEXT;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "addressCountryCode" TEXT,
ADD COLUMN     "addressStateId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "address" TEXT,
ADD COLUMN     "addressCountryCode" TEXT,
ADD COLUMN     "addressStateId" TEXT;

-- CreateIndex
CREATE INDEX "candidates_addressCountryCode_idx" ON "candidates"("addressCountryCode");

-- CreateIndex
CREATE INDEX "candidates_addressStateId_idx" ON "candidates"("addressStateId");

-- CreateIndex
CREATE INDEX "clients_addressCountryCode_idx" ON "clients"("addressCountryCode");

-- CreateIndex
CREATE INDEX "clients_addressStateId_idx" ON "clients"("addressStateId");

-- CreateIndex
CREATE INDEX "users_addressCountryCode_idx" ON "users"("addressCountryCode");

-- CreateIndex
CREATE INDEX "users_addressStateId_idx" ON "users"("addressStateId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_addressCountryCode_fkey" FOREIGN KEY ("addressCountryCode") REFERENCES "countries"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_addressStateId_fkey" FOREIGN KEY ("addressStateId") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_addressCountryCode_fkey" FOREIGN KEY ("addressCountryCode") REFERENCES "countries"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_addressStateId_fkey" FOREIGN KEY ("addressStateId") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_addressCountryCode_fkey" FOREIGN KEY ("addressCountryCode") REFERENCES "countries"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_addressStateId_fkey" FOREIGN KEY ("addressStateId") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;
