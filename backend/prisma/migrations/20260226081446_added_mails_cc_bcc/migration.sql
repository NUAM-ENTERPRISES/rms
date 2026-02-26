-- AlterTable
ALTER TABLE "document_forward_history" ADD COLUMN     "bccEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "ccEmails" TEXT[] DEFAULT ARRAY[]::TEXT[];
