-- Redesign Template System Migration
-- Changes:
-- 1. Create new MockInterviewTemplate table (collections)
-- 2. Create new MockInterviewTemplateItem table (questions within templates)
-- 3. Add templateId to mock_interviews
-- 4. Add templateItemId to mock_interview_checklist_items
-- 5. Keep old mock_interview_checklist_templates table for data migration

-- CreateTable: MockInterviewTemplate (new collection-based structure)
CREATE TABLE "mock_interview_templates" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mock_interview_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MockInterviewTemplateItem (questions within templates)
CREATE TABLE "mock_interview_template_items" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "criterion" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mock_interview_template_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: MockInterviewTemplate -> RoleCatalog
ALTER TABLE "mock_interview_templates" ADD CONSTRAINT "mock_interview_templates_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: MockInterviewTemplateItem -> MockInterviewTemplate
ALTER TABLE "mock_interview_template_items" ADD CONSTRAINT "mock_interview_template_items_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "mock_interview_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: MockInterviewTemplateItem -> MockInterviewChecklistItem (for linking answers)
ALTER TABLE "mock_interview_checklist_items" ADD COLUMN "templateItemId" TEXT;

ALTER TABLE "mock_interview_checklist_items" ADD CONSTRAINT "mock_interview_checklist_items_templateItemId_fkey" FOREIGN KEY ("templateItemId") REFERENCES "mock_interview_template_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add templateId to mock_interviews
ALTER TABLE "mock_interviews" ADD COLUMN "templateId" TEXT;

ALTER TABLE "mock_interviews" ADD CONSTRAINT "mock_interviews_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "mock_interview_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: MockInterviewTemplate
CREATE UNIQUE INDEX "mock_interview_templates_roleId_name_key" ON "mock_interview_templates"("roleId", "name");
CREATE INDEX "mock_interview_templates_roleId_idx" ON "mock_interview_templates"("roleId");
CREATE INDEX "mock_interview_templates_isActive_idx" ON "mock_interview_templates"("isActive");

-- CreateIndex: MockInterviewTemplateItem
CREATE UNIQUE INDEX "mock_interview_template_items_templateId_category_criterion_key" ON "mock_interview_template_items"("templateId", "category", "criterion");
CREATE INDEX "mock_interview_template_items_templateId_idx" ON "mock_interview_template_items"("templateId");
CREATE INDEX "mock_interview_template_items_category_idx" ON "mock_interview_template_items"("category");

-- CreateIndex: MockInterview
CREATE INDEX "mock_interviews_templateId_idx" ON "mock_interviews"("templateId");

-- CreateIndex: MockInterviewChecklistItem
CREATE INDEX "mock_interview_checklist_items_templateItemId_idx" ON "mock_interview_checklist_items"("templateItemId");

