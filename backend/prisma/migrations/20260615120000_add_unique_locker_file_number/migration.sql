-- Enforce unique locker file numbers across original document collections.
CREATE UNIQUE INDEX "original_document_collections_lockerFileNumber_key"
ON "original_document_collections"("lockerFileNumber")
WHERE "lockerFileNumber" IS NOT NULL;
