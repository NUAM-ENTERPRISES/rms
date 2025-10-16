-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "otp" TEXT,
ADD COLUMN     "otpExpiresAt" TIMESTAMP(3);
