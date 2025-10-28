-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "groomingRequired" TEXT NOT NULL DEFAULT 'formal',
ADD COLUMN     "hideContactInfo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "resumeEditable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "roles_needed" ADD COLUMN     "candidateReligions" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "candidateStates" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "maxHeight" DOUBLE PRECISION,
ADD COLUMN     "maxWeight" DOUBLE PRECISION,
ADD COLUMN     "minHeight" DOUBLE PRECISION,
ADD COLUMN     "minWeight" DOUBLE PRECISION,
ADD COLUMN     "requiredSkills" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "visaType" TEXT NOT NULL DEFAULT 'contract';

-- CreateTable
CREATE TABLE "religions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "religions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "states" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "religions_name_key" ON "religions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "states_code_key" ON "states"("code");
