-- CreateTable
CREATE TABLE "mock_interviews" (
    "id" TEXT NOT NULL,
    "candidateProjectMapId" TEXT NOT NULL,
    "coordinatorId" TEXT NOT NULL,
    "scheduledTime" TIMESTAMP(3),
    "duration" INTEGER NOT NULL DEFAULT 60,
    "meetingLink" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'video',
    "conductedAt" TIMESTAMP(3),
    "overallRating" INTEGER,
    "decision" TEXT,
    "remarks" TEXT,
    "strengths" TEXT,
    "areasOfImprovement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mock_interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_interview_checklist_items" (
    "id" TEXT NOT NULL,
    "mockInterviewId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "criterion" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "rating" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mock_interview_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_interview_checklist_templates" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "criterion" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mock_interview_checklist_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_assignments" (
    "id" TEXT NOT NULL,
    "candidateProjectMapId" TEXT NOT NULL,
    "mockInterviewId" TEXT,
    "assignedBy" TEXT NOT NULL,
    "trainingType" TEXT NOT NULL,
    "focusAreas" TEXT[],
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "targetCompletionDate" TIMESTAMP(3),
    "notes" TEXT,
    "improvementNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_sessions" (
    "id" TEXT NOT NULL,
    "trainingAssignmentId" TEXT NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "topic" TEXT NOT NULL,
    "trainer" TEXT,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "performance" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mock_interviews_candidateProjectMapId_idx" ON "mock_interviews"("candidateProjectMapId");

-- CreateIndex
CREATE INDEX "mock_interviews_coordinatorId_idx" ON "mock_interviews"("coordinatorId");

-- CreateIndex
CREATE INDEX "mock_interviews_scheduledTime_idx" ON "mock_interviews"("scheduledTime");

-- CreateIndex
CREATE INDEX "mock_interviews_decision_idx" ON "mock_interviews"("decision");

-- CreateIndex
CREATE INDEX "mock_interview_checklist_items_mockInterviewId_idx" ON "mock_interview_checklist_items"("mockInterviewId");

-- CreateIndex
CREATE INDEX "mock_interview_checklist_items_category_idx" ON "mock_interview_checklist_items"("category");

-- CreateIndex
CREATE INDEX "mock_interview_checklist_templates_roleId_idx" ON "mock_interview_checklist_templates"("roleId");

-- CreateIndex
CREATE INDEX "mock_interview_checklist_templates_isActive_idx" ON "mock_interview_checklist_templates"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "mock_interview_checklist_templates_roleId_criterion_key" ON "mock_interview_checklist_templates"("roleId", "criterion");

-- CreateIndex
CREATE INDEX "training_assignments_candidateProjectMapId_idx" ON "training_assignments"("candidateProjectMapId");

-- CreateIndex
CREATE INDEX "training_assignments_mockInterviewId_idx" ON "training_assignments"("mockInterviewId");

-- CreateIndex
CREATE INDEX "training_assignments_assignedBy_idx" ON "training_assignments"("assignedBy");

-- CreateIndex
CREATE INDEX "training_assignments_status_idx" ON "training_assignments"("status");

-- CreateIndex
CREATE INDEX "training_sessions_trainingAssignmentId_idx" ON "training_sessions"("trainingAssignmentId");

-- CreateIndex
CREATE INDEX "training_sessions_sessionDate_idx" ON "training_sessions"("sessionDate");

-- AddForeignKey
ALTER TABLE "mock_interviews" ADD CONSTRAINT "mock_interviews_candidateProjectMapId_fkey" FOREIGN KEY ("candidateProjectMapId") REFERENCES "candidate_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_interview_checklist_items" ADD CONSTRAINT "mock_interview_checklist_items_mockInterviewId_fkey" FOREIGN KEY ("mockInterviewId") REFERENCES "mock_interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_interview_checklist_templates" ADD CONSTRAINT "mock_interview_checklist_templates_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_candidateProjectMapId_fkey" FOREIGN KEY ("candidateProjectMapId") REFERENCES "candidate_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_mockInterviewId_fkey" FOREIGN KEY ("mockInterviewId") REFERENCES "mock_interviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_trainingAssignmentId_fkey" FOREIGN KEY ("trainingAssignmentId") REFERENCES "training_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
