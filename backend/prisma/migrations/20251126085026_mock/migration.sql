/*
  Warnings:

  - You are about to drop the `mock_interview_checklist_templates` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."mock_interview_checklist_templates" DROP CONSTRAINT "mock_interview_checklist_templates_roleId_fkey";

-- DropTable
DROP TABLE "public"."mock_interview_checklist_templates";
