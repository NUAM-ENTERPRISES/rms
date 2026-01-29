-- Drop column then enum safely
ALTER TABLE "processing_steps" DROP COLUMN IF EXISTS "prometricResult";

-- Now drop the enum type
DROP TYPE IF EXISTS "public"."PrometricResult";
