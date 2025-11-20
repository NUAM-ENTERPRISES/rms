-- CreateTable
CREATE TABLE "candidate_project_status" (
    "id" SERIAL NOT NULL,
    "statusName" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "stage" TEXT NOT NULL,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_project_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "candidate_project_status_statusName_key" ON "candidate_project_status"("statusName");

-- CreateIndex
CREATE INDEX "candidate_project_status_stage_idx" ON "candidate_project_status"("stage");

-- CreateIndex
CREATE INDEX "candidate_project_status_isTerminal_idx" ON "candidate_project_status"("isTerminal");
