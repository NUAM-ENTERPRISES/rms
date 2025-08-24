/*
  Warnings:

  - You are about to drop the column `jti` on the `refresh_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `tokenHash` on the `refresh_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `refresh_tokens` table. All the data in the column will be lost.
  - Added the required column `hash` to the `refresh_tokens` table without a default value. This is not possible if the table is not empty.

*/

-- First, revoke all existing refresh tokens by setting revokedAt
UPDATE "public"."refresh_tokens" SET "revokedAt" = NOW() WHERE "revokedAt" IS NULL;

-- DropForeignKey
ALTER TABLE "public"."refresh_tokens" DROP CONSTRAINT "refresh_tokens_userId_fkey";

-- DropIndex
DROP INDEX "public"."refresh_tokens_jti_key";

-- DropIndex
DROP INDEX "public"."refresh_tokens_revokedAt_idx";

-- DropIndex
DROP INDEX "public"."refresh_tokens_tokenHash_idx";

-- AlterTable
ALTER TABLE "public"."refresh_tokens" DROP COLUMN "jti",
DROP COLUMN "tokenHash",
DROP COLUMN "updatedAt",
ADD COLUMN     "hash" TEXT NOT NULL DEFAULT '';

-- Remove the default value after adding the column
ALTER TABLE "public"."refresh_tokens" ALTER COLUMN "hash" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "public"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
