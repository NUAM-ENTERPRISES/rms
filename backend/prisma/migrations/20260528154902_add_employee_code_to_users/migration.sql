-- AlterTable
ALTER TABLE "users" ADD COLUMN     "employee_code" TEXT;

-- CreateTable
CREATE TABLE "employee_code_sequences" (
    "year" INTEGER NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "employee_code_sequences_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_code_key" ON "users"("employee_code");

-- CreateIndex
CREATE INDEX "users_employee_code_idx" ON "users"("employee_code");

