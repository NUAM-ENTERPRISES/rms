-- AlterTable
ALTER TABLE "interviews" ADD COLUMN     "roleCatalogId" TEXT;

-- AlterTable
ALTER TABLE "screenings" ADD COLUMN     "roleCatalogId" TEXT;

-- CreateIndex
CREATE INDEX "interviews_roleCatalogId_idx" ON "interviews"("roleCatalogId");

-- CreateIndex
CREATE INDEX "screenings_roleCatalogId_idx" ON "screenings"("roleCatalogId");

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_roleCatalogId_fkey" FOREIGN KEY ("roleCatalogId") REFERENCES "role_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screenings" ADD CONSTRAINT "screenings_roleCatalogId_fkey" FOREIGN KEY ("roleCatalogId") REFERENCES "role_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
