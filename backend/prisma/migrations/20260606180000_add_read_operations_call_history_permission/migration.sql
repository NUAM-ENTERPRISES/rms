INSERT INTO "permissions" ("id", "key", "description", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'read:operations_call_history',
  'View Operations call log history for any Operations-handled candidate',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO UPDATE
SET
  "description" = EXCLUDED."description",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."key" = 'read:operations_call_history'
WHERE r."name" IN (
  'Recruiter Manager',
  'Team Head',
  'Team Lead',
  'Operations',
  'CRE'
)
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
