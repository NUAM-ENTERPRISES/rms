-- Drop old unique index on country + docType
DROP INDEX IF EXISTS "country_document_requirements_countryCode_docType_key";

-- Create a new unique index that includes the processing step id
CREATE UNIQUE INDEX "country_document_requirements_countryCode_docType_step_key" ON "country_document_requirements"("countryCode", "docType", "processingStepTemplateId");
