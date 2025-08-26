/*
  Warnings:

  - Changed the type of `type` on the `clients` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."ClientType" AS ENUM ('INDIVIDUAL', 'SUB_AGENCY', 'HEALTHCARE_ORGANIZATION', 'EXTERNAL_SOURCE');

-- CreateEnum
CREATE TYPE "public"."IndividualRelationship" AS ENUM ('CURRENT_EMPLOYEE', 'FORMER_EMPLOYEE', 'NETWORK_CONTACT');

-- CreateEnum
CREATE TYPE "public"."AgencyType" AS ENUM ('LOCAL', 'REGIONAL', 'SPECIALIZED');

-- CreateEnum
CREATE TYPE "public"."FacilityType" AS ENUM ('HOSPITAL', 'CLINIC', 'NURSING_HOME', 'MEDICAL_CENTER');

-- CreateEnum
CREATE TYPE "public"."FacilitySize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE');

-- CreateEnum
CREATE TYPE "public"."ExternalSourceType" AS ENUM ('JOB_BOARD', 'SOCIAL_MEDIA', 'REFERRAL_PLATFORM', 'INDUSTRY_EVENT', 'COLD_OUTREACH', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."AcquisitionMethod" AS ENUM ('ORGANIC', 'PAID', 'PARTNERSHIP', 'REFERRAL');

-- CreateEnum
CREATE TYPE "public"."RelationshipType" AS ENUM ('REFERRAL', 'PARTNERSHIP', 'DIRECT_CLIENT', 'EXTERNAL_SOURCE');

-- AlterTable
-- First, add all new columns
ALTER TABLE "public"."clients" ADD COLUMN     "acquisitionMethod" "public"."AcquisitionMethod",
ADD COLUMN     "agencyType" "public"."AgencyType",
ADD COLUMN     "billingAddress" TEXT,
ADD COLUMN     "commissionRate" DOUBLE PRECISION,
ADD COLUMN     "contractEndDate" TIMESTAMP(3),
ADD COLUMN     "contractStartDate" TIMESTAMP(3),
ADD COLUMN     "facilitySize" "public"."FacilitySize",
ADD COLUMN     "facilityType" "public"."FacilityType",
ADD COLUMN     "locations" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "organization" TEXT,
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "profession" TEXT,
ADD COLUMN     "relationship" "public"."IndividualRelationship",
ADD COLUMN     "relationshipType" "public"."RelationshipType",
ADD COLUMN     "sourceName" TEXT,
ADD COLUMN     "sourceNotes" TEXT,
ADD COLUMN     "sourceType" "public"."ExternalSourceType",
ADD COLUMN     "specialties" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "taxId" TEXT,
ADD COLUMN     "type_new" "public"."ClientType";

-- Convert existing data to new enum type
UPDATE "public"."clients" 
SET "type_new" = CASE 
  WHEN "type" = 'hospital' OR "type" = 'clinic' OR "type" = 'nursing_home' OR "type" = 'medical_center' THEN 'HEALTHCARE_ORGANIZATION'::"public"."ClientType"
  WHEN "type" = 'agency' OR "type" = 'staffing' THEN 'SUB_AGENCY'::"public"."ClientType"
  WHEN "type" = 'individual' OR "type" = 'referrer' THEN 'INDIVIDUAL'::"public"."ClientType"
  ELSE 'EXTERNAL_SOURCE'::"public"."ClientType"
END;

-- Drop old column and rename new column
ALTER TABLE "public"."clients" DROP COLUMN "type";
ALTER TABLE "public"."clients" RENAME COLUMN "type_new" TO "type";
ALTER TABLE "public"."clients" ALTER COLUMN "type" SET NOT NULL;
