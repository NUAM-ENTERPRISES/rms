-- CreateTable
CREATE TABLE "public"."candidate_qualifications" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "university" TEXT,
    "graduationYear" INTEGER,
    "gpa" DOUBLE PRECISION,
    "isCompleted" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candidate_qualifications_candidateId_idx" ON "public"."candidate_qualifications"("candidateId");

-- CreateIndex
CREATE INDEX "candidate_qualifications_qualificationId_idx" ON "public"."candidate_qualifications"("qualificationId");

-- AddForeignKey
ALTER TABLE "public"."candidate_qualifications" ADD CONSTRAINT "candidate_qualifications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "public"."candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."candidate_qualifications" ADD CONSTRAINT "candidate_qualifications_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "public"."qualifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
