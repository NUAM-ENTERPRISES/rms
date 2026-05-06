-- CreateTable
CREATE TABLE "agent_candidate_declared_projects" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_candidate_declared_projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_candidate_declared_projects_candidateId_idx" ON "agent_candidate_declared_projects"("candidateId");

-- CreateIndex
CREATE INDEX "agent_candidate_declared_projects_projectId_idx" ON "agent_candidate_declared_projects"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "agent_candidate_declared_projects_candidateId_projectId_key" ON "agent_candidate_declared_projects"("candidateId", "projectId");

-- AddForeignKey
ALTER TABLE "agent_candidate_declared_projects" ADD CONSTRAINT "agent_candidate_declared_projects_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_candidate_declared_projects" ADD CONSTRAINT "agent_candidate_declared_projects_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
