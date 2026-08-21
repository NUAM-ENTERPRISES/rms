-- Rename system RBAC role display/identifier names
UPDATE "roles"
SET
  "name" = 'Admin',
  "description" = 'Complete system access'
WHERE "name" = 'System Admin';

UPDATE "roles"
SET
  "name" = 'Managing Director',
  "description" = 'Reports, analytics, strategic overview'
WHERE "name" = 'CEO';

UPDATE "roles"
SET
  "name" = 'Department Head',
  "description" = 'Department-level management'
WHERE "name" = 'Manager';

UPDATE "roles"
SET
  "name" = 'Recruitment Team Lead',
  "description" = 'Manages recruiters and team performance'
WHERE "name" = 'Recruiter Manager';

UPDATE "roles"
SET
  "name" = 'Processing Team Lead',
  "description" = 'Processing team lead - manages processing workflows'
WHERE "name" = 'Processing Manager';

UPDATE "roles"
SET
  "name" = 'Recruitment Executive',
  "description" = 'Sources and manages candidates'
WHERE "name" = 'Recruiter';

UPDATE "roles"
SET
  "name" = 'Document Control Executive',
  "description" = 'Reviews, verifies, and controls documents'
WHERE "name" = 'Documents Control Executive';

UPDATE "roles"
SET
  "name" = 'Screening & Training Executive',
  "description" = 'Candidate screening and training'
WHERE "name" = 'Screening Trainer';

UPDATE "roles"
SET
  "name" = 'Operations Executive',
  "description" = 'Handles operational activities'
WHERE "name" = 'Operations';
