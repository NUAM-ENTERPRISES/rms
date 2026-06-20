-- Rename project role visa types: contract -> company_visa, permanent -> direct_visa
UPDATE "project_roles"
SET "visaType" = 'company_visa'
WHERE "visaType" = 'contract';

UPDATE "project_roles"
SET "visaType" = 'direct_visa'
WHERE "visaType" = 'permanent';

ALTER TABLE "project_roles" ALTER COLUMN "visaType" SET DEFAULT 'company_visa';
