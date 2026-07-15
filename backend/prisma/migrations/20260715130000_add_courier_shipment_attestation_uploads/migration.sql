-- CreateTable
CREATE TABLE "courier_shipment_attestation_uploads" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "remarks" TEXT,
    "uploadedByUserId" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replacedAt" TIMESTAMP(3),

    CONSTRAINT "courier_shipment_attestation_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "courier_shipment_attestation_uploads_shipmentId_projectId_idx" ON "courier_shipment_attestation_uploads"("shipmentId", "projectId");

-- CreateIndex
CREATE INDEX "courier_shipment_attestation_uploads_projectId_idx" ON "courier_shipment_attestation_uploads"("projectId");

-- CreateIndex
CREATE INDEX "courier_shipment_attestation_uploads_shipmentId_idx" ON "courier_shipment_attestation_uploads"("shipmentId");

-- CreateIndex
CREATE INDEX "courier_shipment_attestation_uploads_documentId_idx" ON "courier_shipment_attestation_uploads"("documentId");

-- AddForeignKey
ALTER TABLE "courier_shipment_attestation_uploads" ADD CONSTRAINT "courier_shipment_attestation_uploads_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "courier_shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_shipment_attestation_uploads" ADD CONSTRAINT "courier_shipment_attestation_uploads_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_shipment_attestation_uploads" ADD CONSTRAINT "courier_shipment_attestation_uploads_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_shipment_attestation_uploads" ADD CONSTRAINT "courier_shipment_attestation_uploads_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
