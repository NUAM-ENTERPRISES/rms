/*
  Warnings:

  - You are about to drop the `processing` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `processing_step_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `processing_steps` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."processing" DROP CONSTRAINT "processing_candidateProjectMapId_fkey";

-- DropForeignKey
ALTER TABLE "public"."processing_step_history" DROP CONSTRAINT "processing_step_history_actorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."processing_step_history" DROP CONSTRAINT "processing_step_history_candidateProjectMapId_fkey";

-- DropForeignKey
ALTER TABLE "public"."processing_steps" DROP CONSTRAINT "processing_steps_candidateProjectMapId_fkey";

-- DropForeignKey
ALTER TABLE "public"."processing_steps" DROP CONSTRAINT "processing_steps_lastUpdatedById_fkey";

-- DropTable
DROP TABLE "public"."processing";

-- DropTable
DROP TABLE "public"."processing_step_history";

-- DropTable
DROP TABLE "public"."processing_steps";

-- DropEnum
DROP TYPE "public"."ProcessingStepKey";

-- DropEnum
DROP TYPE "public"."ProcessingStepStatus";
