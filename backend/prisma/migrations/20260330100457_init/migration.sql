/*
  Warnings:

  - You are about to drop the column `airTicketDown` on the `interviews` table. All the data in the column will be lost.
  - You are about to drop the column `airTicketUp` on the `interviews` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "interviews" DROP COLUMN "airTicketDown",
DROP COLUMN "airTicketUp";
