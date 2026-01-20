/*
  Warnings:

  - The `emigrationStatus` column on the `processing_steps` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "EmigrationStatus" AS ENUM ('PENDING', 'FAILED', 'COMPLETED');

-- AlterTable
ALTER TABLE "processing_steps" DROP COLUMN "emigrationStatus",
ADD COLUMN     "emigrationStatus" "EmigrationStatus";
