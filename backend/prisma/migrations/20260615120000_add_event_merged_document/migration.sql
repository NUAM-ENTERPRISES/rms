-- AlterTable
ALTER TABLE "original_document_collection_events" ADD COLUMN "mergedDocumentId" TEXT;

-- AddForeignKey
ALTER TABLE "original_document_collection_events" ADD CONSTRAINT "original_document_collection_events_mergedDocumentId_fkey" FOREIGN KEY ("mergedDocumentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
