-- DropForeignKey
ALTER TABLE "public"."candidates" DROP CONSTRAINT "candidates_professionTypeId_fkey";

-- AlterTable
ALTER TABLE "candidates" ALTER COLUMN "lastName" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_professionTypeId_fkey" FOREIGN KEY ("professionTypeId") REFERENCES "profession_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "candidates_focusesAllProfessions_idx" RENAME TO "candidates_focuses_all_professions_idx";

-- RenameIndex
ALTER INDEX "candidates_professionSector_idx" RENAME TO "candidates_profession_sector_idx";

-- RenameIndex
ALTER INDEX "original_document_collection_checklist_items_collectionId_docTy" RENAME TO "original_document_collection_checklist_items_collectionId_d_key";
