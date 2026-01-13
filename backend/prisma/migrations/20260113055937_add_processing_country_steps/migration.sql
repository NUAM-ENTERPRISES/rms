-- CreateTable
CREATE TABLE "processing_country_steps" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "stepTemplateId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "processing_country_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "processing_country_steps_countryCode_idx" ON "processing_country_steps"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "processing_country_steps_countryCode_stepTemplateId_key" ON "processing_country_steps"("countryCode", "stepTemplateId");

-- AddForeignKey
ALTER TABLE "processing_country_steps" ADD CONSTRAINT "processing_country_steps_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "countries"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_country_steps" ADD CONSTRAINT "processing_country_steps_stepTemplateId_fkey" FOREIGN KEY ("stepTemplateId") REFERENCES "processing_step_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
