-- CreateEnum
CREATE TYPE "ClientSubClientLinkType" AS ENUM ('SUB_AGENT', 'FREELANCE');

-- Migrate ClientType enum to DIRECT_CLIENT / SUB_AGENT / FREELANCE
CREATE TYPE "ClientType_new" AS ENUM ('DIRECT_CLIENT', 'SUB_AGENT', 'FREELANCE');

ALTER TABLE "clients" ADD COLUMN "type_new" "ClientType_new";

UPDATE "clients" SET "type_new" = CASE "type"::text
  WHEN 'SUB_AGENCY' THEN 'SUB_AGENT'::"ClientType_new"
  WHEN 'INDIVIDUAL' THEN 'DIRECT_CLIENT'::"ClientType_new"
  WHEN 'HEALTHCARE_ORGANIZATION' THEN 'DIRECT_CLIENT'::"ClientType_new"
  WHEN 'EXTERNAL_SOURCE' THEN 'FREELANCE'::"ClientType_new"
  ELSE 'DIRECT_CLIENT'::"ClientType_new"
END;

ALTER TABLE "clients" DROP COLUMN "type";
ALTER TABLE "clients" RENAME COLUMN "type_new" TO "type";
ALTER TABLE "clients" ALTER COLUMN "type" SET NOT NULL;

DROP TYPE "ClientType";
ALTER TYPE "ClientType_new" RENAME TO "ClientType";

-- CreateTable
CREATE TABLE "client_sub_clients" (
    "id" TEXT NOT NULL,
    "parentClientId" TEXT NOT NULL,
    "childClientId" TEXT NOT NULL,
    "linkType" "ClientSubClientLinkType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_sub_clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_sub_clients_parentClientId_childClientId_key" ON "client_sub_clients"("parentClientId", "childClientId");

CREATE INDEX "client_sub_clients_parentClientId_idx" ON "client_sub_clients"("parentClientId");

CREATE INDEX "client_sub_clients_childClientId_idx" ON "client_sub_clients"("childClientId");

-- AddForeignKey
ALTER TABLE "client_sub_clients" ADD CONSTRAINT "client_sub_clients_parentClientId_fkey" FOREIGN KEY ("parentClientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_sub_clients" ADD CONSTRAINT "client_sub_clients_childClientId_fkey" FOREIGN KEY ("childClientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
