-- CreateEnum
CREATE TYPE "AgentCandidateRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "agent_candidate_requests" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" "AgentCandidateRequestStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_candidate_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_candidate_request_items" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "roleNeededId" TEXT NOT NULL,
    "requestedCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_candidate_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_candidate_requests_projectId_status_createdAt_idx" ON "agent_candidate_requests"("projectId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "agent_candidate_requests_requestedById_createdAt_idx" ON "agent_candidate_requests"("requestedById", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "agent_candidate_request_items_requestId_roleNeededId_key" ON "agent_candidate_request_items"("requestId", "roleNeededId");

-- CreateIndex
CREATE INDEX "agent_candidate_request_items_requestId_idx" ON "agent_candidate_request_items"("requestId");

-- CreateIndex
CREATE INDEX "agent_candidate_request_items_roleNeededId_idx" ON "agent_candidate_request_items"("roleNeededId");

-- AddForeignKey
ALTER TABLE "agent_candidate_requests" ADD CONSTRAINT "agent_candidate_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_candidate_requests" ADD CONSTRAINT "agent_candidate_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_candidate_request_items" ADD CONSTRAINT "agent_candidate_request_items_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "agent_candidate_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_candidate_request_items" ADD CONSTRAINT "agent_candidate_request_items_roleNeededId_fkey" FOREIGN KEY ("roleNeededId") REFERENCES "project_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
