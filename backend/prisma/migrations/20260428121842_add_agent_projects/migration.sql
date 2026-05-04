-- CreateTable
CREATE TABLE "agent_projects" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_projects_agentId_idx" ON "agent_projects"("agentId");

-- CreateIndex
CREATE INDEX "agent_projects_projectId_idx" ON "agent_projects"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "agent_projects_agentId_projectId_key" ON "agent_projects"("agentId", "projectId");

-- AddForeignKey
ALTER TABLE "agent_projects" ADD CONSTRAINT "agent_projects_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_projects" ADD CONSTRAINT "agent_projects_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
