-- AddForeignKey
ALTER TABLE "processing_candidates" ADD CONSTRAINT "processing_candidates_candidateId_projectId_roleNeededId_fkey" FOREIGN KEY ("candidateId", "projectId", "roleNeededId") REFERENCES "candidate_projects"("candidateId", "projectId", "roleNeededId") ON DELETE RESTRICT ON UPDATE CASCADE;
