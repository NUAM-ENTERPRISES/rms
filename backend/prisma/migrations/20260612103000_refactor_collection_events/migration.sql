-- CreateTable: intake events
CREATE TABLE "original_document_collection_events" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "collectionType" TEXT NOT NULL,
    "collectedByUserId" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL,
    "directOffice" TEXT,
    "directOfficeOther" TEXT,
    "interviewVenue" TEXT,
    "agentId" TEXT,
    "agentNameManual" TEXT,
    "courierPartner" TEXT,
    "trackingNumber" TEXT,
    "remarks" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "original_document_collection_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable: per-event checklist items
CREATE TABLE "original_document_collection_event_items" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "isReceived" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,

    CONSTRAINT "original_document_collection_event_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: merge upload history
CREATE TABLE "original_document_collection_merge_history" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedByUserId" TEXT NOT NULL,
    "replacedAt" TIMESTAMP(3),

    CONSTRAINT "original_document_collection_merge_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable: processing sync log per doc type
CREATE TABLE "original_document_collection_sync_logs" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedByUserId" TEXT NOT NULL,

    CONSTRAINT "original_document_collection_sync_logs_pkey" PRIMARY KEY ("id")
);

-- Parent id per candidate (earliest collection row survives as parent)
CREATE TEMP TABLE "_collection_parent_map" AS
SELECT
    c."id" AS "old_id",
    c."candidateId",
    FIRST_VALUE(c."id") OVER (
        PARTITION BY c."candidateId"
        ORDER BY c."createdAt" ASC, c."id" ASC
    ) AS "parent_id"
FROM "original_document_collections" c;

-- Migrate every legacy row into an event (event id = legacy collection id)
INSERT INTO "original_document_collection_events" (
    "id",
    "collectionId",
    "collectionType",
    "collectedByUserId",
    "collectedAt",
    "directOffice",
    "directOfficeOther",
    "interviewVenue",
    "agentId",
    "agentNameManual",
    "courierPartner",
    "trackingNumber",
    "remarks",
    "createdByUserId",
    "createdAt",
    "updatedAt"
)
SELECT
    c."id",
    m."parent_id",
    c."collectionType",
    c."collectedByUserId",
    c."collectedAt",
    c."directOffice",
    c."directOfficeOther",
    c."interviewVenue",
    c."agentId",
    c."agentNameManual",
    c."courierPartner",
    c."trackingNumber",
    c."remarks",
    c."createdByUserId",
    c."createdAt",
    c."updatedAt"
FROM "original_document_collections" c
JOIN "_collection_parent_map" m ON m."old_id" = c."id";

-- Migrate checklist items to event items
INSERT INTO "original_document_collection_event_items" (
    "id",
    "eventId",
    "docType",
    "isReceived",
    "remarks"
)
SELECT
    i."id",
    i."collectionId",
    i."docType",
    i."isReceived",
    i."remarks"
FROM "original_document_collection_items" i;

-- Archive prior merge documents (non-current) into history
INSERT INTO "original_document_collection_merge_history" (
    "id",
    "collectionId",
    "documentId",
    "uploadedAt",
    "uploadedByUserId",
    "replacedAt"
)
SELECT
    replace(gen_random_uuid()::text, '-', ''),
    m."parent_id",
    c."mergedDocumentId",
    c."updatedAt",
    c."createdByUserId",
    CURRENT_TIMESTAMP
FROM "original_document_collections" c
JOIN "_collection_parent_map" m ON m."old_id" = c."id"
JOIN "original_document_collections" parent ON parent."id" = m."parent_id"
WHERE c."mergedDocumentId" IS NOT NULL
  AND c."mergedDocumentId" IS DISTINCT FROM parent."mergedDocumentId";

-- Consolidate parent row fields from latest activity per candidate
UPDATE "original_document_collections" parent
SET
    "mergedDocumentId" = latest."mergedDocumentId",
    "lockerFileNumber" = COALESCE(latest."lockerFileNumber", parent."lockerFileNumber"),
    "lockerSubmittedAt" = COALESCE(latest."lockerSubmittedAt", parent."lockerSubmittedAt"),
    "lockerSubmittedByUserId" = COALESCE(latest."lockerSubmittedByUserId", parent."lockerSubmittedByUserId"),
    "status" = latest."status",
    "completedAt" = latest."completedAt",
    "completedByUserId" = latest."completedByUserId",
    "updatedAt" = latest."updatedAt"
FROM (
    SELECT DISTINCT ON (m."parent_id")
        m."parent_id",
        c."mergedDocumentId",
        c."lockerFileNumber",
        c."lockerSubmittedAt",
        c."lockerSubmittedByUserId",
        c."status",
        c."completedAt",
        c."completedByUserId",
        c."updatedAt"
    FROM "original_document_collections" c
    JOIN "_collection_parent_map" m ON m."old_id" = c."id"
    ORDER BY m."parent_id", c."updatedAt" DESC, c."createdAt" DESC
) latest
WHERE parent."id" = latest."parent_id";

-- Remove duplicate parent rows (non-survivor collection rows)
DELETE FROM "original_document_collections" c
USING "_collection_parent_map" m
WHERE c."id" = m."old_id"
  AND c."id" <> m."parent_id";

-- Drop legacy item table
DROP TABLE "original_document_collection_items";

-- Drop event-level columns from parent collection
ALTER TABLE "original_document_collections" DROP CONSTRAINT IF EXISTS "original_document_collections_collectedByUserId_fkey";
ALTER TABLE "original_document_collections" DROP CONSTRAINT IF EXISTS "original_document_collections_agentId_fkey";

DROP INDEX IF EXISTS "original_document_collections_collectionType_idx";
DROP INDEX IF EXISTS "original_document_collections_collectedAt_idx";

ALTER TABLE "original_document_collections" DROP COLUMN "collectionType";
ALTER TABLE "original_document_collections" DROP COLUMN "collectedByUserId";
ALTER TABLE "original_document_collections" DROP COLUMN "collectedAt";
ALTER TABLE "original_document_collections" DROP COLUMN "directOffice";
ALTER TABLE "original_document_collections" DROP COLUMN "directOfficeOther";
ALTER TABLE "original_document_collections" DROP COLUMN "interviewVenue";
ALTER TABLE "original_document_collections" DROP COLUMN "agentId";
ALTER TABLE "original_document_collections" DROP COLUMN "agentNameManual";
ALTER TABLE "original_document_collections" DROP COLUMN "courierPartner";
ALTER TABLE "original_document_collections" DROP COLUMN "trackingNumber";
ALTER TABLE "original_document_collections" DROP COLUMN "remarks";

-- One collection per candidate
CREATE UNIQUE INDEX "original_document_collections_candidateId_key" ON "original_document_collections"("candidateId");

-- Event indexes and FKs
CREATE INDEX "original_document_collection_events_collectionId_idx" ON "original_document_collection_events"("collectionId");
CREATE INDEX "original_document_collection_events_collectionType_idx" ON "original_document_collection_events"("collectionType");
CREATE INDEX "original_document_collection_events_collectedAt_idx" ON "original_document_collection_events"("collectedAt");

CREATE UNIQUE INDEX "original_document_collection_event_items_eventId_docType_key" ON "original_document_collection_event_items"("eventId", "docType");
CREATE INDEX "original_document_collection_event_items_eventId_idx" ON "original_document_collection_event_items"("eventId");

CREATE INDEX "original_document_collection_merge_history_collectionId_idx" ON "original_document_collection_merge_history"("collectionId");

CREATE UNIQUE INDEX "original_document_collection_sync_logs_collectionId_docType_key" ON "original_document_collection_sync_logs"("collectionId", "docType");
CREATE INDEX "original_document_collection_sync_logs_collectionId_idx" ON "original_document_collection_sync_logs"("collectionId");

ALTER TABLE "original_document_collection_events" ADD CONSTRAINT "original_document_collection_events_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "original_document_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "original_document_collection_events" ADD CONSTRAINT "original_document_collection_events_collectedByUserId_fkey" FOREIGN KEY ("collectedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "original_document_collection_events" ADD CONSTRAINT "original_document_collection_events_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "original_document_collection_events" ADD CONSTRAINT "original_document_collection_events_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "original_document_collection_event_items" ADD CONSTRAINT "original_document_collection_event_items_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "original_document_collection_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "original_document_collection_merge_history" ADD CONSTRAINT "original_document_collection_merge_history_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "original_document_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "original_document_collection_merge_history" ADD CONSTRAINT "original_document_collection_merge_history_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "original_document_collection_merge_history" ADD CONSTRAINT "original_document_collection_merge_history_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "original_document_collection_sync_logs" ADD CONSTRAINT "original_document_collection_sync_logs_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "original_document_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
