-- Remove deprecated Interview fields: type and interviewer
ALTER TABLE "interviews" DROP COLUMN IF EXISTS "type";
ALTER TABLE "interviews" DROP COLUMN IF EXISTS "interviewer";

