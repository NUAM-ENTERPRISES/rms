/*
  Warnings:

  - Made the column `accommodation` on table `interviews` required. This step will fail if there are existing NULL values in that column.
  - Made the column `airTicketDown` on table `interviews` required. This step will fail if there are existing NULL values in that column.
  - Made the column `airTicketUp` on table `interviews` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "interviews" ADD COLUMN     "airTicket" TEXT DEFAULT 'up-and-down',
ALTER COLUMN "accommodation" SET NOT NULL,
ALTER COLUMN "airTicketDown" SET NOT NULL,
ALTER COLUMN "airTicketUp" SET NOT NULL;
