-- DropIndex
DROP INDEX "public"."original_document_collections_candidateId_idx";

-- CreateTable
CREATE TABLE "courier_shipments" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "projectId" TEXT,
    "legNumber" INTEGER NOT NULL,
    "purposeType" TEXT NOT NULL DEFAULT 'internal',
    "deliveryMode" TEXT NOT NULL DEFAULT 'courier',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "trackingId" TEXT,
    "courierPartner" TEXT,
    "sentAt" TIMESTAMP(3),
    "sentByUserId" TEXT,
    "approvedByUserId" TEXT,
    "fromAddressType" TEXT NOT NULL,
    "toAddressType" TEXT NOT NULL,
    "fromAddressSnapshot" JSONB NOT NULL DEFAULT '{}',
    "toAddressSnapshot" JSONB NOT NULL DEFAULT '{}',
    "receivedAt" TIMESTAMP(3),
    "receivedByUserId" TEXT,
    "receivedByName" TEXT,
    "lockerFileNumber" TEXT,
    "mergedDocumentId" TEXT,
    "remarks" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_shipment_documents" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,

    CONSTRAINT "courier_shipment_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "courier_shipments_candidateId_idx" ON "courier_shipments"("candidateId");

-- CreateIndex
CREATE INDEX "courier_shipments_collectionId_idx" ON "courier_shipments"("collectionId");

-- CreateIndex
CREATE INDEX "courier_shipments_status_idx" ON "courier_shipments"("status");

-- CreateIndex
CREATE INDEX "courier_shipments_deliveryMode_idx" ON "courier_shipments"("deliveryMode");

-- CreateIndex
CREATE INDEX "courier_shipments_purposeType_idx" ON "courier_shipments"("purposeType");

-- CreateIndex
CREATE INDEX "courier_shipments_sentAt_idx" ON "courier_shipments"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "courier_shipments_candidateId_legNumber_key" ON "courier_shipments"("candidateId", "legNumber");

-- CreateIndex
CREATE INDEX "courier_shipment_documents_shipmentId_idx" ON "courier_shipment_documents"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "courier_shipment_documents_shipmentId_docType_key" ON "courier_shipment_documents"("shipmentId", "docType");

-- RenameForeignKey
ALTER TABLE "original_document_collection_merge_history" RENAME CONSTRAINT "original_document_collection_merge_history_uploadedByUserId_fke" TO "original_document_collection_merge_history_uploadedByUserI_fkey";

-- AddForeignKey
ALTER TABLE "courier_shipments" ADD CONSTRAINT "courier_shipments_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_shipments" ADD CONSTRAINT "courier_shipments_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "original_document_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_shipments" ADD CONSTRAINT "courier_shipments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_shipments" ADD CONSTRAINT "courier_shipments_mergedDocumentId_fkey" FOREIGN KEY ("mergedDocumentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_shipments" ADD CONSTRAINT "courier_shipments_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_shipments" ADD CONSTRAINT "courier_shipments_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_shipments" ADD CONSTRAINT "courier_shipments_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_shipments" ADD CONSTRAINT "courier_shipments_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_shipment_documents" ADD CONSTRAINT "courier_shipment_documents_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "courier_shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
