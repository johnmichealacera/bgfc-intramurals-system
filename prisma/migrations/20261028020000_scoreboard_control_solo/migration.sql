-- AlterTable
ALTER TABLE "matches" ADD COLUMN "controlRequestedAt" TIMESTAMP(3),
ADD COLUMN "controlApprovedAt" TIMESTAMP(3),
ADD COLUMN "controlRequestedByUserId" TEXT,
ADD COLUMN "controlApprovedByUserId" TEXT,
ADD COLUMN "controlRequestReason" TEXT;

-- AlterTable
ALTER TABLE "event_schedules" ADD COLUMN "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
ADD COLUMN "postponeReason" TEXT,
ADD COLUMN "resumeRequestedAt" TIMESTAMP(3),
ADD COLUMN "resumeApprovedAt" TIMESTAMP(3),
ADD COLUMN "resumeRequestedByUserId" TEXT,
ADD COLUMN "resumeApprovedByUserId" TEXT,
ADD COLUMN "resumeRequestReason" TEXT,
ADD COLUMN "controlRequestedAt" TIMESTAMP(3),
ADD COLUMN "controlApprovedAt" TIMESTAMP(3),
ADD COLUMN "controlRequestedByUserId" TEXT,
ADD COLUMN "controlApprovedByUserId" TEXT,
ADD COLUMN "controlRequestReason" TEXT,
ADD COLUMN "updatedByUserId" TEXT;

-- CreateTable
CREATE TABLE "event_schedule_scores" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_schedule_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_schedule_scores_scheduleId_teamId_key" ON "event_schedule_scores"("scheduleId", "teamId");

-- CreateIndex
CREATE INDEX "event_schedule_scores_scheduleId_idx" ON "event_schedule_scores"("scheduleId");

-- CreateIndex
CREATE INDEX "event_schedule_scores_teamId_idx" ON "event_schedule_scores"("teamId");

-- CreateIndex
CREATE INDEX "event_schedules_status_idx" ON "event_schedules"("status");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_controlRequestedByUserId_fkey" FOREIGN KEY ("controlRequestedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_controlApprovedByUserId_fkey" FOREIGN KEY ("controlApprovedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_schedules" ADD CONSTRAINT "event_schedules_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_schedules" ADD CONSTRAINT "event_schedules_resumeRequestedByUserId_fkey" FOREIGN KEY ("resumeRequestedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_schedules" ADD CONSTRAINT "event_schedules_resumeApprovedByUserId_fkey" FOREIGN KEY ("resumeApprovedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_schedules" ADD CONSTRAINT "event_schedules_controlRequestedByUserId_fkey" FOREIGN KEY ("controlRequestedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_schedules" ADD CONSTRAINT "event_schedules_controlApprovedByUserId_fkey" FOREIGN KEY ("controlApprovedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_schedule_scores" ADD CONSTRAINT "event_schedule_scores_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "event_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_schedule_scores" ADD CONSTRAINT "event_schedule_scores_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
