-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "eligibility_issued_at" TIMESTAMP(3),
ADD COLUMN     "eligibility_expiry_at" TIMESTAMP(3);
