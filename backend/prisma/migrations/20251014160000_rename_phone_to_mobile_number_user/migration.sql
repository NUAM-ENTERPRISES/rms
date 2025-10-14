-- Rename phone to mobileNumber in users table
ALTER TABLE "users" RENAME COLUMN "phone" TO "mobileNumber";

-- Update the unique constraint
ALTER TABLE "users" DROP CONSTRAINT "users_countryCode_phone_key";
ALTER TABLE "users" ADD CONSTRAINT "users_countryCode_mobileNumber_key" UNIQUE ("countryCode", "mobileNumber");

-- Update the index
DROP INDEX IF EXISTS "users_countryCode_phone_idx";
CREATE INDEX "users_countryCode_mobileNumber_idx" ON "users"("countryCode", "mobileNumber");
