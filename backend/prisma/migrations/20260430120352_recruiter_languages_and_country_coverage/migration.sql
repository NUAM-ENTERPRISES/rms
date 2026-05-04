-- CreateEnum
CREATE TYPE "LanguageProficiency" AS ENUM ('PRIMARY', 'SECONDARY', 'TERTIARY');

-- CreateEnum
CREATE TYPE "RecruiterCountrySectorScope" AS ENUM ('HEALTHCARE', 'NON_HEALTH_CARE');

-- CreateTable
CREATE TABLE "languages" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "user_languages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "proficiency" "LanguageProficiency" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_country_coverage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "sectorScopes" "RecruiterCountrySectorScope"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_country_coverage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "languages_isActive_idx" ON "languages"("isActive");

-- CreateIndex
CREATE INDEX "user_languages_userId_idx" ON "user_languages"("userId");

-- CreateIndex
CREATE INDEX "user_languages_languageCode_idx" ON "user_languages"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "user_languages_userId_languageCode_key" ON "user_languages"("userId", "languageCode");

-- CreateIndex
CREATE INDEX "user_country_coverage_userId_idx" ON "user_country_coverage"("userId");

-- CreateIndex
CREATE INDEX "user_country_coverage_countryCode_idx" ON "user_country_coverage"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "user_country_coverage_userId_countryCode_key" ON "user_country_coverage"("userId", "countryCode");

-- AddForeignKey
ALTER TABLE "user_languages" ADD CONSTRAINT "user_languages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_languages" ADD CONSTRAINT "user_languages_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "languages"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_country_coverage" ADD CONSTRAINT "user_country_coverage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_country_coverage" ADD CONSTRAINT "user_country_coverage_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "countries"("code") ON DELETE CASCADE ON UPDATE CASCADE;
