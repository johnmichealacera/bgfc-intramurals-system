-- CreateTable
CREATE TABLE "event_schedules" (
    "id" TEXT NOT NULL,
    "sportEventId" TEXT NOT NULL,
    "title" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_schedules_sportEventId_idx" ON "event_schedules"("sportEventId");

-- CreateIndex
CREATE INDEX "event_schedules_scheduledAt_idx" ON "event_schedules"("scheduledAt");

-- AddForeignKey
ALTER TABLE "event_schedules" ADD CONSTRAINT "event_schedules_sportEventId_fkey" FOREIGN KEY ("sportEventId") REFERENCES "sport_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
