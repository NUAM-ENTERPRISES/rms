-- AddForeignKey
ALTER TABLE "candidate_project_map" ADD CONSTRAINT "candidate_project_map_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
