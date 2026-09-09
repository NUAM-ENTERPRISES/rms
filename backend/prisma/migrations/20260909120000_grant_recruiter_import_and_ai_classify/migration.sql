INSERT INTO "permissions" ("id", "key", "description", "createdAt", "updatedAt")
VALUES
  (
    gen_random_uuid(),
    'import:candidates',
    'Import candidates from recruiter Excel or CSV sheets',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'ai_classify:candidate_documents',
    'Upload merged candidate PDFs and split them into documents using AI',
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
JOIN "permissions" p ON p."key" IN (
  'import:candidates',
  'ai_classify:candidate_documents'
)
WHERE r."name" IN (
  'Recruitment Executive',
  'Recruiter',
  'Recruitment Lead',
  'Recruiter Manager'
)
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
