-- CreateEnum
CREATE TYPE "SessionAvailability" AS ENUM ('ACTIVE', 'BREAK', 'ON_CALL');

-- AlterTable
ALTER TABLE "user_sessions" ADD COLUMN     "availability" "SessionAvailability" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "availabilityUpdatedAt" TIMESTAMP(3);
