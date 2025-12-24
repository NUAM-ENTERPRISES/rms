-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "roleCatalogId" TEXT;

-- CreateIndex
CREATE INDEX "documents_roleCatalogId_idx" ON "documents"("roleCatalogId");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_roleCatalogId_fkey" FOREIGN KEY ("roleCatalogId") REFERENCES "role_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
