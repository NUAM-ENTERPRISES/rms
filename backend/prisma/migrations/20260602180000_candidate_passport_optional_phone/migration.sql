-- AlterTable: optional phone + passport intake for Agent Coordinator create flow
ALTER TABLE "candidates" ALTER COLUMN "countryCode" DROP NOT NULL;
ALTER TABLE "candidates" ALTER COLUMN "mobileNumber" DROP NOT NULL;
ALTER TABLE "candidates" ADD COLUMN "passport_number" TEXT;
CREATE INDEX "candidates_passport_number_idx" ON "candidates"("passport_number");
