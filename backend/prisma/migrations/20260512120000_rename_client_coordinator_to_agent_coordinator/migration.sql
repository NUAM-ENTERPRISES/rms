-- Align legacy seeded role display name with Agent Coordinator (JWT role arrays / visibility checks).
UPDATE "roles"
SET
  name = 'Agent Coordinator',
  description = 'Agent Coordinator - Manages external agents and agent-sourced candidates'
WHERE name = 'Client Coordinator';
