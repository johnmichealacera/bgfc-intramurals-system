-- AlterTable
ALTER TABLE "matches" ADD COLUMN "scoreCorrectedAt" TIMESTAMP(3),
ADD COLUMN "scoreCorrectedByUserId" TEXT,
ADD COLUMN "scoreCorrectionReason" TEXT;

-- AlterTable
ALTER TABLE "event_schedules" ADD COLUMN "scoreCorrectedAt" TIMESTAMP(3),
ADD COLUMN "scoreCorrectedByUserId" TEXT,
ADD COLUMN "scoreCorrectionReason" TEXT;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_scoreCorrectedByUserId_fkey" FOREIGN KEY ("scoreCorrectedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_schedules" ADD CONSTRAINT "event_schedules_scoreCorrectedByUserId_fkey" FOREIGN KEY ("scoreCorrectedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
