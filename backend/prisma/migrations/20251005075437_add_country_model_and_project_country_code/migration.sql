-- AlterTable
ALTER TABLE "public"."projects" ADD COLUMN     "countryCode" TEXT;

-- CreateTable
CREATE TABLE "public"."countries" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "callingCode" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("code")
);

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "public"."countries"("code") ON DELETE SET NULL ON UPDATE CASCADE;
