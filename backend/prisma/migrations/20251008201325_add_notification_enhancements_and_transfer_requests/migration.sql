/*
  Warnings:

  - A unique constraint covering the columns `[idemKey]` on the table `notifications` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `idemKey` to the `notifications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."notifications" ADD COLUMN     "idemKey" TEXT NOT NULL,
ADD COLUMN     "link" TEXT,
ADD COLUMN     "meta" JSONB,
ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'unread';

-- CreateTable
CREATE TABLE "public"."outbox_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."team_transfer_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromTeamId" TEXT NOT NULL,
    "toTeamId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_transfer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outbox_events_type_idx" ON "public"."outbox_events"("type");

-- CreateIndex
CREATE INDEX "outbox_events_processed_idx" ON "public"."outbox_events"("processed");

-- CreateIndex
CREATE INDEX "team_transfer_requests_userId_idx" ON "public"."team_transfer_requests"("userId");

-- CreateIndex
CREATE INDEX "team_transfer_requests_fromTeamId_idx" ON "public"."team_transfer_requests"("fromTeamId");

-- CreateIndex
CREATE INDEX "team_transfer_requests_toTeamId_idx" ON "public"."team_transfer_requests"("toTeamId");

-- CreateIndex
CREATE INDEX "team_transfer_requests_status_idx" ON "public"."team_transfer_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_idemKey_key" ON "public"."notifications"("idemKey");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "public"."notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "public"."notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "public"."notifications"("status");

-- AddForeignKey
ALTER TABLE "public"."team_transfer_requests" ADD CONSTRAINT "team_transfer_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."team_transfer_requests" ADD CONSTRAINT "team_transfer_requests_fromTeamId_fkey" FOREIGN KEY ("fromTeamId") REFERENCES "public"."teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."team_transfer_requests" ADD CONSTRAINT "team_transfer_requests_toTeamId_fkey" FOREIGN KEY ("toTeamId") REFERENCES "public"."teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."team_transfer_requests" ADD CONSTRAINT "team_transfer_requests_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."team_transfer_requests" ADD CONSTRAINT "team_transfer_requests_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
