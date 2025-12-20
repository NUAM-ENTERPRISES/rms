-- Create role_departments table
CREATE TABLE "role_departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_departments_pkey" PRIMARY KEY ("id")
);

-- Unique index on name
CREATE UNIQUE INDEX "role_departments_name_key" ON "role_departments"("name");

-- Index on isActive
CREATE INDEX "role_departments_isActive_idx" ON "role_departments"("isActive");
