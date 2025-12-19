BEGIN;

-- Rename mock interview tables to screening equivalents
ALTER TABLE mock_interviews RENAME TO screenings;
ALTER TABLE mock_interview_checklist_items RENAME TO screening_checklist_items;
ALTER TABLE mock_interview_templates RENAME TO screening_templates;
ALTER TABLE mock_interview_template_items RENAME TO screening_template_items;

-- Rename columns referencing mockInterviewId to screeningId and recreate FK constraints
ALTER TABLE training_assignments RENAME COLUMN "mockInterviewId" TO "screeningId";
ALTER TABLE training_assignments DROP CONSTRAINT IF EXISTS training_assignments_mockinterviewid_fkey;
ALTER TABLE training_assignments ADD CONSTRAINT training_assignments_screeningid_fkey FOREIGN KEY ("screeningId") REFERENCES screenings(id) ON DELETE SET NULL;

ALTER TABLE screening_checklist_items RENAME COLUMN "mockInterviewId" TO "screeningId";
ALTER TABLE screening_checklist_items DROP CONSTRAINT IF EXISTS screening_checklist_items_mockinterviewid_fkey;
ALTER TABLE screening_checklist_items ADD CONSTRAINT screening_checklist_items_screeningid_fkey FOREIGN KEY ("screeningId") REFERENCES screenings(id) ON DELETE CASCADE;

COMMIT;
