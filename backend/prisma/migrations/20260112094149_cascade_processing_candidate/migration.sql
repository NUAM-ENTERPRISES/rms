-- DropForeignKey
ALTER TABLE "public"."processing_candidates" DROP CONSTRAINT "processing_candidates_candidateId_projectId_roleNeededId_fkey";

-- AddForeignKey
ALTER TABLE "processing_candidates" ADD CONSTRAINT "processing_candidates_candidateId_projectId_roleNeededId_fkey" FOREIGN KEY ("candidateId", "projectId", "roleNeededId") REFERENCES "candidate_projects"("candidateId", "projectId", "roleNeededId") ON DELETE CASCADE ON UPDATE CASCADE;
