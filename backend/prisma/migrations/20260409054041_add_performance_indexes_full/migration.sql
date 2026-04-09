-- CreateIndex
CREATE INDEX "candidate_projects_candidateId_projectId_idx" ON "candidate_projects"("candidateId", "projectId");

-- CreateIndex
CREATE INDEX "candidate_recruiter_assignments_recruiterId_isActive_idx" ON "candidate_recruiter_assignments"("recruiterId", "isActive");

-- CreateIndex
CREATE INDEX "candidate_recruiter_assignments_candidateId_isActive_idx" ON "candidate_recruiter_assignments"("candidateId", "isActive");

-- CreateIndex
CREATE INDEX "candidates_createdAt_idx" ON "candidates"("createdAt");

-- CreateIndex
CREATE INDEX "candidates_source_idx" ON "candidates"("source");

-- CreateIndex
CREATE INDEX "candidates_gender_idx" ON "candidates"("gender");
