-- Insert documents control granular permissions
INSERT INTO "permissions" ("id", "key", "description", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'read:original_document_intake', 'View original document intake register and collections', NOW(), NOW()),
  (gen_random_uuid()::text, 'write:original_document_intake', 'Create and manage original document intake collections', NOW(), NOW()),
  (gen_random_uuid()::text, 'read:courier_management', 'View courier management register and legs', NOW(), NOW()),
  (gen_random_uuid()::text, 'write:courier_management', 'Create and manage courier legs', NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;

-- Grant all four permissions to Documents Control Executive role
INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" = 'Documents Control Executive'
  AND p."key" IN (
    'read:original_document_intake',
    'write:original_document_intake',
    'read:courier_management',
    'write:courier_management'
  )
ON CONFLICT DO NOTHING;
