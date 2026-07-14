-- AlterTable
ALTER TABLE "courier_shipment_documents" ADD COLUMN "receiveVerifiedAt" TIMESTAMP(3),
ADD COLUMN "receiveRemarks" TEXT;
