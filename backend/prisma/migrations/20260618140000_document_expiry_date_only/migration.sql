-- AlterTable
ALTER TABLE "documents"
  ALTER COLUMN "expiryDate" TYPE DATE
  USING "expiryDate"::date;
