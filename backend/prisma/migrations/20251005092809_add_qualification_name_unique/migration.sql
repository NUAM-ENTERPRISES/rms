/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `qualifications` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "qualifications_name_key" ON "public"."qualifications"("name");
