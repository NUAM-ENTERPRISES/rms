-- DropForeignKey
ALTER TABLE "public"."screening_checklist_items" DROP CONSTRAINT "screening_checklist_items_screeningid_fkey";

-- DropForeignKey
ALTER TABLE "public"."training_assignments" DROP CONSTRAINT "training_assignments_screeningid_fkey";

-- AlterTable
ALTER TABLE "screening_checklist_items" RENAME CONSTRAINT "mock_interview_checklist_items_pkey" TO "screening_checklist_items_pkey";

-- AlterTable
ALTER TABLE "screening_template_items" RENAME CONSTRAINT "mock_interview_template_items_pkey" TO "screening_template_items_pkey";

-- AlterTable
ALTER TABLE "screening_templates" RENAME CONSTRAINT "mock_interview_templates_pkey" TO "screening_templates_pkey";

-- AlterTable
ALTER TABLE "screenings" RENAME CONSTRAINT "mock_interviews_pkey" TO "screenings_pkey";

-- RenameForeignKey
ALTER TABLE "screening_checklist_items" RENAME CONSTRAINT "mock_interview_checklist_items_mockInterviewId_fkey" TO "screening_checklist_items_screeningId_fkey";

-- RenameForeignKey
ALTER TABLE "screening_checklist_items" RENAME CONSTRAINT "mock_interview_checklist_items_templateItemId_fkey" TO "screening_checklist_items_templateItemId_fkey";

-- RenameForeignKey
ALTER TABLE "screening_template_items" RENAME CONSTRAINT "mock_interview_template_items_templateId_fkey" TO "screening_template_items_templateId_fkey";

-- RenameForeignKey
ALTER TABLE "screening_templates" RENAME CONSTRAINT "mock_interview_templates_roleId_fkey" TO "screening_templates_roleId_fkey";

-- RenameForeignKey
ALTER TABLE "screenings" RENAME CONSTRAINT "mock_interviews_candidateProjectMapId_fkey" TO "screenings_candidateProjectMapId_fkey";

-- RenameForeignKey
ALTER TABLE "screenings" RENAME CONSTRAINT "mock_interviews_templateId_fkey" TO "screenings_templateId_fkey";

-- RenameForeignKey
ALTER TABLE "training_assignments" RENAME CONSTRAINT "training_assignments_mockInterviewId_fkey" TO "training_assignments_screeningId_fkey";

-- RenameIndex
ALTER INDEX "mock_interview_checklist_items_category_idx" RENAME TO "screening_checklist_items_category_idx";

-- RenameIndex
ALTER INDEX "mock_interview_checklist_items_mockInterviewId_idx" RENAME TO "screening_checklist_items_screeningId_idx";

-- RenameIndex
ALTER INDEX "mock_interview_checklist_items_templateItemId_idx" RENAME TO "screening_checklist_items_templateItemId_idx";

-- RenameIndex
ALTER INDEX "mock_interview_template_items_category_idx" RENAME TO "screening_template_items_category_idx";

-- RenameIndex
ALTER INDEX "mock_interview_template_items_templateId_category_criterion_key" RENAME TO "screening_template_items_templateId_category_criterion_key";

-- RenameIndex
ALTER INDEX "mock_interview_template_items_templateId_idx" RENAME TO "screening_template_items_templateId_idx";

-- RenameIndex
ALTER INDEX "mock_interview_templates_isActive_idx" RENAME TO "screening_templates_isActive_idx";

-- RenameIndex
ALTER INDEX "mock_interview_templates_roleId_idx" RENAME TO "screening_templates_roleId_idx";

-- RenameIndex
ALTER INDEX "mock_interview_templates_roleId_name_key" RENAME TO "screening_templates_roleId_name_key";

-- RenameIndex
ALTER INDEX "mock_interviews_candidateProjectMapId_idx" RENAME TO "screenings_candidateProjectMapId_idx";

-- RenameIndex
ALTER INDEX "mock_interviews_coordinatorId_idx" RENAME TO "screenings_coordinatorId_idx";

-- RenameIndex
ALTER INDEX "mock_interviews_decision_idx" RENAME TO "screenings_decision_idx";

-- RenameIndex
ALTER INDEX "mock_interviews_scheduledTime_idx" RENAME TO "screenings_scheduledTime_idx";

-- RenameIndex
ALTER INDEX "mock_interviews_templateId_idx" RENAME TO "screenings_templateId_idx";

-- RenameIndex
ALTER INDEX "training_assignments_mockInterviewId_idx" RENAME TO "training_assignments_screeningId_idx";
