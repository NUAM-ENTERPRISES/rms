/*
  Warnings:

  - A unique constraint covering the columns `[countryCode,phone]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `countryCode` to the `users` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Add countryCode column as nullable initially
ALTER TABLE "public"."users" ADD COLUMN "countryCode" TEXT;

-- Step 2: Split existing phone numbers into countryCode and phone
-- Assuming phone numbers are in format: +[country_code][number]
-- This will extract the country code (including +) and update the phone to be without it

UPDATE "public"."users"
SET 
  "countryCode" = SUBSTRING("phone" FROM '^(\+\d{1,4})'),
  "phone" = SUBSTRING("phone" FROM '^\+\d{1,4}(.+)$')
WHERE "phone" LIKE '+%';

-- For any phone numbers that don't start with +, set default country code to +91 (India)
UPDATE "public"."users"
SET 
  "countryCode" = '+91',
  "phone" = "phone"
WHERE "countryCode" IS NULL;

-- Step 3: Make countryCode NOT NULL now that all rows have values
ALTER TABLE "public"."users" ALTER COLUMN "countryCode" SET NOT NULL;

-- Step 4: Drop old unique constraint on phone
DROP INDEX IF EXISTS "public"."users_phone_key";

-- Step 5: Drop old index on phone
DROP INDEX IF EXISTS "public"."users_phone_idx";

-- Step 6: Create composite index for authentication queries
CREATE INDEX "users_countryCode_phone_idx" ON "public"."users"("countryCode", "phone");

-- Step 7: Create unique constraint on countryCode + phone combination
CREATE UNIQUE INDEX "users_countryCode_phone_key" ON "public"."users"("countryCode", "phone");
