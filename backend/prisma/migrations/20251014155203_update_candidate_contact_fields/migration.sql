/*
  Warnings:

  - You are about to drop the column `contact` on the `candidates` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[countryCode,phone]` on the table `candidates` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `countryCode` to the `candidates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `candidates` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."candidates_contact_key";

-- AlterTable
ALTER TABLE "public"."candidates" DROP COLUMN "contact",
ADD COLUMN     "countryCode" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "candidates_countryCode_phone_idx" ON "public"."candidates"("countryCode", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_countryCode_phone_key" ON "public"."candidates"("countryCode", "phone");
