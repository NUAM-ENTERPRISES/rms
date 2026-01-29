-- Drop column then enum safely
ALTER TABLE "processing_steps" DROP COLUMN IF EXISTS "emigrationStatus";

-- Now drop the enum type
DROP TYPE IF EXISTS "public"."EmigrationStatus";
