/*
  Warnings:

  - You are about to drop the column `trainingType` on the `training_assignments` table. All the data in the column will be lost.
  - You are about to drop the `training_sessions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."training_sessions" DROP CONSTRAINT "training_sessions_trainingAssignmentId_fkey";

-- DropIndex
DROP INDEX "public"."training_assignments_screeningId_key";

-- AlterTable
ALTER TABLE "training_assignments" DROP COLUMN "trainingType",
ADD COLUMN     "attemptNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "meetingLink" TEXT,
ADD COLUMN     "scheduledTime" TIMESTAMP(3),
ADD COLUMN     "sessionType" TEXT;

-- DropTable
DROP TABLE "public"."training_sessions";

-- CreateIndex
CREATE INDEX "training_assignments_screeningId_idx" ON "training_assignments"("screeningId");
