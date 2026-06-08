-- AlterTable
ALTER TABLE "operations_call_logs" ADD COLUMN "usedPhone" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "operations_call_logs" ADD COLUMN "usedWhatsapp" BOOLEAN NOT NULL DEFAULT false;
