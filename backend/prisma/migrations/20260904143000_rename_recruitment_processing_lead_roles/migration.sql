-- Merge/rename leadership role display names (idempotent).
-- Recruiter Manager + Recruitment Team Lead → Recruitment Lead
-- Processing Manager + Processing Team Lead → Processing Lead

CREATE OR REPLACE FUNCTION merge_role_by_name(from_name text, to_name text)
RETURNS void AS $$
DECLARE
  from_id text;
  to_id text;
BEGIN
  SELECT id INTO from_id FROM roles WHERE name = from_name;
  IF from_id IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO to_id FROM roles WHERE name = to_name;

  IF to_id IS NULL THEN
    UPDATE roles SET name = to_name, "updatedAt" = CURRENT_TIMESTAMP WHERE id = from_id;
    RETURN;
  END IF;

  INSERT INTO user_roles ("userId", "roleId")
  SELECT ur."userId", to_id
  FROM user_roles ur
  WHERE ur."roleId" = from_id
  ON CONFLICT ("userId", "roleId") DO NOTHING;

  DELETE FROM user_roles WHERE "roleId" = from_id;
  DELETE FROM role_permissions WHERE "roleId" = from_id;
  DELETE FROM roles WHERE id = from_id;
END;
$$ LANGUAGE plpgsql;

SELECT merge_role_by_name('Recruiter Manager', 'Recruitment Lead');
SELECT merge_role_by_name('Recruitment Team Lead', 'Recruitment Lead');
SELECT merge_role_by_name('Processing Manager', 'Processing Lead');
SELECT merge_role_by_name('Processing Team Lead', 'Processing Lead');

DROP FUNCTION merge_role_by_name(text, text);
