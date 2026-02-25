-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "dataFlow" BOOLEAN DEFAULT false,
ADD COLUMN     "eligibility" BOOLEAN DEFAULT false,
ADD COLUMN     "height" DOUBLE PRECISION,
ADD COLUMN     "languageProficiency" TEXT,
ADD COLUMN     "licensingExam" TEXT,
ADD COLUMN     "skinTone" TEXT,
ADD COLUMN     "smartness" TEXT,
ADD COLUMN     "weight" DOUBLE PRECISION;
