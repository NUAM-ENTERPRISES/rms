/*
  Warnings:

  - You are about to drop the column `reminderCount` on the `rnr_reminders` table. All the data in the column will be lost.
  - You are about to drop the column `sentAt` on the `rnr_reminders` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[candidateId]` on the table `rnr_reminders` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."rnr_reminders_candidateId_idx";

-- AlterTable
ALTER TABLE "rnr_reminders" DROP COLUMN "reminderCount",
DROP COLUMN "sentAt",
ADD COLUMN     "currentCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "history" JSONB NOT NULL DEFAULT '[]';

-- CreateIndex
CREATE UNIQUE INDEX "rnr_reminders_candidateId_key" ON "rnr_reminders"("candidateId");
