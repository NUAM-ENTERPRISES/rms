INSERT INTO "permissions" ("id", "key", "description", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'create:agent_candidates',
  'Create candidates from the Agents page (Add Candidate)',
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
JOIN "permissions" p ON p."key" = 'create:agent_candidates'
WHERE r."name" IN (
  'Manager',
  'Recruitment Lead',
  'Managing Director',
  'Director'
)
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
