-- DropForeignKey
ALTER TABLE "public"."projects" DROP CONSTRAINT "projects_clientId_fkey";

-- AlterTable
ALTER TABLE "public"."projects" ALTER COLUMN "clientId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
