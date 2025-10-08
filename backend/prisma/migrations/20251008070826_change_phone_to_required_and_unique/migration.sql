/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Made the column `phone` on table `users` required. This step will fail if there are existing NULL values in that column.

*/

-- Step 1: Update NULL phone values with unique temporary phone numbers
DO $$
DECLARE
    counter BIGINT := 9000000000;
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT "id" FROM "public"."users" WHERE "phone" IS NULL ORDER BY "createdAt"
    LOOP
        UPDATE "public"."users" 
        SET "phone" = '+91' || counter::TEXT
        WHERE "id" = user_record."id";
        counter := counter + 1;
    END LOOP;
END $$;

-- Step 2: Make the column NOT NULL (now safe because we've filled NULL values)
ALTER TABLE "public"."users" ALTER COLUMN "phone" SET NOT NULL;

-- Step 3: Create unique constraint on phone
CREATE UNIQUE INDEX "users_phone_key" ON "public"."users"("phone");

-- Step 4: Create index on phone for authentication queries
CREATE INDEX "users_phone_idx" ON "public"."users"("phone");
