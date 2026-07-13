CREATE TABLE "original_document_collection_checklist_items" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "original_document_collection_checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "original_document_collection_checklist_items_collectionId_docType_key"
ON "original_document_collection_checklist_items"("collectionId", "docType");

CREATE INDEX "original_document_collection_checklist_items_collectionId_idx"
ON "original_document_collection_checklist_items"("collectionId");

ALTER TABLE "original_document_collection_checklist_items"
ADD CONSTRAINT "original_document_collection_checklist_items_collectionId_fkey"
FOREIGN KEY ("collectionId") REFERENCES "original_document_collections"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "original_document_collection_checklist_items" (
    "id",
    "collectionId",
    "docType",
    "mandatory",
    "sortOrder",
    "createdAt",
    "updatedAt"
)
SELECT
    'odcci_' || md5(collection."id" || checklist."docType"),
    collection."id",
    checklist."docType",
    true,
    checklist."sortOrder",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "original_document_collections" AS collection
CROSS JOIN (
    VALUES
        ('passport_original', 0),
        ('degree_certificate_original', 1),
        ('registration_certificate_original', 2),
        ('experience_certificate_original', 3),
        ('sslc_certificate_original', 4),
        ('plus_two_certificate_original', 5),
        ('transcript_original', 6),
        ('pcc_original', 7)
) AS checklist("docType", "sortOrder");
