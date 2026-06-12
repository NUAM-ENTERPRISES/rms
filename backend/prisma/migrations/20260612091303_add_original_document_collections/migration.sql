-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "locker_file_number" TEXT;

-- CreateTable
CREATE TABLE "original_document_collections" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
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
    "mergedDocumentId" TEXT,
    "lockerFileNumber" TEXT,
    "lockerSubmittedAt" TIMESTAMP(3),
    "lockerSubmittedByUserId" TEXT,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "completedAt" TIMESTAMP(3),
    "completedByUserId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "original_document_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "original_document_collection_items" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "isReceived" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,

    CONSTRAINT "original_document_collection_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "original_document_collections_candidateId_idx" ON "original_document_collections"("candidateId");

-- CreateIndex
CREATE INDEX "original_document_collections_collectionType_idx" ON "original_document_collections"("collectionType");

-- CreateIndex
CREATE INDEX "original_document_collections_collectedAt_idx" ON "original_document_collections"("collectedAt");

-- CreateIndex
CREATE INDEX "original_document_collections_status_idx" ON "original_document_collections"("status");

-- CreateIndex
CREATE INDEX "original_document_collection_items_collectionId_idx" ON "original_document_collection_items"("collectionId");

-- CreateIndex
CREATE UNIQUE INDEX "original_document_collection_items_collectionId_docType_key" ON "original_document_collection_items"("collectionId", "docType");

-- AddForeignKey
ALTER TABLE "original_document_collections" ADD CONSTRAINT "original_document_collections_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "original_document_collections" ADD CONSTRAINT "original_document_collections_collectedByUserId_fkey" FOREIGN KEY ("collectedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "original_document_collections" ADD CONSTRAINT "original_document_collections_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "original_document_collections" ADD CONSTRAINT "original_document_collections_mergedDocumentId_fkey" FOREIGN KEY ("mergedDocumentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "original_document_collections" ADD CONSTRAINT "original_document_collections_lockerSubmittedByUserId_fkey" FOREIGN KEY ("lockerSubmittedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "original_document_collections" ADD CONSTRAINT "original_document_collections_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "original_document_collections" ADD CONSTRAINT "original_document_collections_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "original_document_collection_items" ADD CONSTRAINT "original_document_collection_items_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "original_document_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
