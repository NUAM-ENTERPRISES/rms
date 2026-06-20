-- AlterTable
ALTER TABLE "documents"
  ALTER COLUMN "issuedAt" TYPE TIMESTAMP(3) USING "issuedAt"::timestamp;

ALTER TABLE "documents"
  ALTER COLUMN "expiryDate" TYPE TIMESTAMP(3) USING "expiryDate"::timestamp;
