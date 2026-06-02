-- CreateEnum
CREATE TYPE "UserAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "account_status" "UserAccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "account_status_updated_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "users_account_status_idx" ON "users"("account_status");

-- CreateTable
CREATE TABLE "user_account_status_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "previous_status" "UserAccountStatus",
    "new_status" "UserAccountStatus" NOT NULL,
    "remarks" TEXT NOT NULL,
    "changed_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_account_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_account_status_history_user_id_idx" ON "user_account_status_history"("user_id");

-- CreateIndex
CREATE INDEX "user_account_status_history_changed_by_id_idx" ON "user_account_status_history"("changed_by_id");

-- CreateIndex
CREATE INDEX "user_account_status_history_created_at_idx" ON "user_account_status_history"("created_at");

-- AddForeignKey
ALTER TABLE "user_account_status_history" ADD CONSTRAINT "user_account_status_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_account_status_history" ADD CONSTRAINT "user_account_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
