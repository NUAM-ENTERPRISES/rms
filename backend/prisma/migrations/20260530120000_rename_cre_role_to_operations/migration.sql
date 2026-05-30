-- Rename CRE role to Operations
UPDATE "roles"
SET
  "name" = 'Operations',
  "description" = 'Operations team - handles escalated RNR candidates'
WHERE "name" = 'CRE';
