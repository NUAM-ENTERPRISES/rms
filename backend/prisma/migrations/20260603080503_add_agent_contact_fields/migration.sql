-- AlterTable
ALTER TABLE "agents" ADD COLUMN     "alternatePhone1" TEXT,
ADD COLUMN     "alternatePhone2" TEXT,
ADD COLUMN     "countryCode" TEXT,
ADD COLUMN     "whatsappNumber" TEXT;

-- CreateIndex
CREATE INDEX "agents_countryCode_idx" ON "agents"("countryCode");

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "countries"("code") ON DELETE SET NULL ON UPDATE CASCADE;
