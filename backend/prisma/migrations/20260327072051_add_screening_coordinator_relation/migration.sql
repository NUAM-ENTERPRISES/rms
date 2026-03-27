-- AddForeignKey
ALTER TABLE "screenings" ADD CONSTRAINT "screenings_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
