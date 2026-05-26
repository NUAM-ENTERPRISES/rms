-- Rename project role visa types: contract -> direct_visa, permanent -> company_visa
UPDATE "project_roles"
SET "visaType" = 'direct_visa'
WHERE "visaType" = 'contract';

UPDATE "project_roles"
SET "visaType" = 'company_visa'
WHERE "visaType" = 'permanent';

ALTER TABLE "project_roles" ALTER COLUMN "visaType" SET DEFAULT 'direct_visa';
