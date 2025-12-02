-- Ensure Interview Coordinator can view standard interviews list
INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."key" = 'read:interviews'
WHERE r."name" = 'Interview Coordinator'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

