-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "dataFlow" BOOLEAN DEFAULT false,
ADD COLUMN     "eligibility" BOOLEAN DEFAULT false,
ADD COLUMN     "licensingExam" TEXT;
