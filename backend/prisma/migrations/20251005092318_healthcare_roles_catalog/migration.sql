-- CreateEnum
CREATE TYPE "public"."QualificationLevel" AS ENUM ('CERTIFICATE', 'DIPLOMA', 'BACHELOR', 'MASTER', 'DOCTORATE');

-- CreateTable
CREATE TABLE "public"."role_catalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "isClinical" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."qualifications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "level" "public"."QualificationLevel" NOT NULL,
    "field" TEXT NOT NULL,
    "program" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."qualification_aliases" (
    "id" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "isCommon" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qualification_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."qualification_country_profiles" (
    "id" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "regulatedTitle" TEXT,
    "issuingBody" TEXT,
    "accreditationStatus" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qualification_country_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."qualification_equivalencies" (
    "id" TEXT NOT NULL,
    "fromQualificationId" TEXT NOT NULL,
    "toQualificationId" TEXT NOT NULL,
    "countryCode" TEXT,
    "isEquivalent" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qualification_equivalencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."role_recommended_qualifications" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "countryCode" TEXT,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_recommended_qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."role_needed_education_requirements" (
    "id" TEXT NOT NULL,
    "roleNeededId" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_needed_education_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_catalog_name_key" ON "public"."role_catalog"("name");

-- CreateIndex
CREATE UNIQUE INDEX "role_catalog_slug_key" ON "public"."role_catalog"("slug");

-- CreateIndex
CREATE INDEX "role_catalog_category_idx" ON "public"."role_catalog"("category");

-- CreateIndex
CREATE INDEX "role_catalog_isClinical_idx" ON "public"."role_catalog"("isClinical");

-- CreateIndex
CREATE INDEX "role_catalog_isActive_idx" ON "public"."role_catalog"("isActive");

-- CreateIndex
CREATE INDEX "qualifications_level_idx" ON "public"."qualifications"("level");

-- CreateIndex
CREATE INDEX "qualifications_field_idx" ON "public"."qualifications"("field");

-- CreateIndex
CREATE INDEX "qualifications_isActive_idx" ON "public"."qualifications"("isActive");

-- CreateIndex
CREATE INDEX "qualification_aliases_alias_idx" ON "public"."qualification_aliases"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "qualification_aliases_qualificationId_alias_key" ON "public"."qualification_aliases"("qualificationId", "alias");

-- CreateIndex
CREATE INDEX "qualification_country_profiles_countryCode_idx" ON "public"."qualification_country_profiles"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "qualification_country_profiles_qualificationId_countryCode_key" ON "public"."qualification_country_profiles"("qualificationId", "countryCode");

-- CreateIndex
CREATE INDEX "qualification_equivalencies_fromQualificationId_idx" ON "public"."qualification_equivalencies"("fromQualificationId");

-- CreateIndex
CREATE INDEX "qualification_equivalencies_toQualificationId_idx" ON "public"."qualification_equivalencies"("toQualificationId");

-- CreateIndex
CREATE UNIQUE INDEX "qualification_equivalencies_fromQualificationId_toQualifica_key" ON "public"."qualification_equivalencies"("fromQualificationId", "toQualificationId", "countryCode");

-- CreateIndex
CREATE INDEX "role_recommended_qualifications_roleId_idx" ON "public"."role_recommended_qualifications"("roleId");

-- CreateIndex
CREATE INDEX "role_recommended_qualifications_qualificationId_idx" ON "public"."role_recommended_qualifications"("qualificationId");

-- CreateIndex
CREATE INDEX "role_recommended_qualifications_weight_idx" ON "public"."role_recommended_qualifications"("weight");

-- CreateIndex
CREATE UNIQUE INDEX "role_recommended_qualifications_roleId_qualificationId_coun_key" ON "public"."role_recommended_qualifications"("roleId", "qualificationId", "countryCode");

-- CreateIndex
CREATE INDEX "role_needed_education_requirements_roleNeededId_idx" ON "public"."role_needed_education_requirements"("roleNeededId");

-- CreateIndex
CREATE INDEX "role_needed_education_requirements_qualificationId_idx" ON "public"."role_needed_education_requirements"("qualificationId");

-- CreateIndex
CREATE UNIQUE INDEX "role_needed_education_requirements_roleNeededId_qualificati_key" ON "public"."role_needed_education_requirements"("roleNeededId", "qualificationId");

-- AddForeignKey
ALTER TABLE "public"."qualification_aliases" ADD CONSTRAINT "qualification_aliases_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "public"."qualifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."qualification_country_profiles" ADD CONSTRAINT "qualification_country_profiles_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "public"."qualifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."qualification_country_profiles" ADD CONSTRAINT "qualification_country_profiles_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "public"."countries"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."qualification_equivalencies" ADD CONSTRAINT "qualification_equivalencies_fromQualificationId_fkey" FOREIGN KEY ("fromQualificationId") REFERENCES "public"."qualifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."qualification_equivalencies" ADD CONSTRAINT "qualification_equivalencies_toQualificationId_fkey" FOREIGN KEY ("toQualificationId") REFERENCES "public"."qualifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."qualification_equivalencies" ADD CONSTRAINT "qualification_equivalencies_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "public"."countries"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."role_recommended_qualifications" ADD CONSTRAINT "role_recommended_qualifications_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."role_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."role_recommended_qualifications" ADD CONSTRAINT "role_recommended_qualifications_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "public"."qualifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."role_recommended_qualifications" ADD CONSTRAINT "role_recommended_qualifications_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "public"."countries"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."role_needed_education_requirements" ADD CONSTRAINT "role_needed_education_requirements_roleNeededId_fkey" FOREIGN KEY ("roleNeededId") REFERENCES "public"."roles_needed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."role_needed_education_requirements" ADD CONSTRAINT "role_needed_education_requirements_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "public"."qualifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
