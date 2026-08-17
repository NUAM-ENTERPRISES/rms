-- Interview Coordinators must not have manage:interviews.
-- That permission disables assignee scoping (same pattern as Documentation Executive
-- without manage:documents), so every IC would see the full shared queue.
DELETE FROM "role_permissions" rp
USING "roles" r, "permissions" p
WHERE rp."roleId" = r.id
  AND rp."permissionId" = p.id
  AND r.name = 'Interview Coordinator'
  AND p.key = 'manage:interviews';
