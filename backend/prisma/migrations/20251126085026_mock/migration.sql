/*
  Warnings:

  - You are about to drop the `mock_interview_checklist_templates` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE IF EXISTS "public"."mock_interview_checklist_templates" DROP CONSTRAINT IF EXISTS "mock_interview_checklist_templates_roleId_fkey";

-- DropTable
DROP TABLE IF EXISTS "public"."mock_interview_checklist_templates";
