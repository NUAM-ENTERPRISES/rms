-- Make training_assignments.mockInterviewId explicitly optional and ensure FK uses ON DELETE SET NULL

-- Ensure the column allows NULLs
ALTER TABLE "training_assignments" ALTER COLUMN "mockInterviewId" DROP NOT NULL;

-- Recreate foreign key constraint with ON DELETE SET NULL (safe to run even if already present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_assignments_mockInterviewId_fkey') THEN
    ALTER TABLE "training_assignments" DROP CONSTRAINT training_assignments_mockInterviewId_fkey;
  END IF;
END$$;

ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_mockInterviewId_fkey" FOREIGN KEY ("mockInterviewId") REFERENCES "mock_interviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;
