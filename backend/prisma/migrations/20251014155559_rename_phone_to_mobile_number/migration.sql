/*
  Warnings:

  - You are about to drop the column `phone` on the `candidates` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[countryCode,mobileNumber]` on the table `candidates` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `mobileNumber` to the `candidates` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."candidates_countryCode_phone_idx";

-- DropIndex
DROP INDEX "public"."candidates_countryCode_phone_key";

-- AlterTable
ALTER TABLE "public"."candidates" DROP COLUMN "phone",
ADD COLUMN     "mobileNumber" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "candidates_countryCode_mobileNumber_idx" ON "public"."candidates"("countryCode", "mobileNumber");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_countryCode_mobileNumber_key" ON "public"."candidates"("countryCode", "mobileNumber");
