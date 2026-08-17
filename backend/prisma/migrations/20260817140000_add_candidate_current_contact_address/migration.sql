-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "current_contact_country_code" TEXT,
ADD COLUMN     "current_contact_number" TEXT,
ADD COLUMN     "current_address_country_code" TEXT,
ADD COLUMN     "current_address_state_id" TEXT,
ADD COLUMN     "current_address" TEXT,
ADD COLUMN     "current_address_pincode" TEXT;

-- CreateIndex
CREATE INDEX "candidates_current_address_country_code_idx" ON "candidates"("current_address_country_code");

-- CreateIndex
CREATE INDEX "candidates_current_address_state_id_idx" ON "candidates"("current_address_state_id");

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_current_address_country_code_fkey" FOREIGN KEY ("current_address_country_code") REFERENCES "countries"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_current_address_state_id_fkey" FOREIGN KEY ("current_address_state_id") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;
