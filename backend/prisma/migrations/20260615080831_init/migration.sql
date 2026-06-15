-- DropIndex
DROP INDEX "public"."original_document_collections_candidateId_idx";

-- RenameForeignKey
ALTER TABLE "original_document_collection_merge_history" RENAME CONSTRAINT "original_document_collection_merge_history_uploadedByUserId_fke" TO "original_document_collection_merge_history_uploadedByUserI_fkey";
