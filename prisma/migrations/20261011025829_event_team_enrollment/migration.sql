-- CreateTable
CREATE TABLE "event_teams" (
    "id" TEXT NOT NULL,
    "sportEventId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_participants" (
    "id" TEXT NOT NULL,
    "eventTeamId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_teams_sportEventId_idx" ON "event_teams"("sportEventId");

-- CreateIndex
CREATE INDEX "event_teams_teamId_idx" ON "event_teams"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "event_teams_sportEventId_teamId_key" ON "event_teams"("sportEventId", "teamId");

-- CreateIndex
CREATE INDEX "event_participants_eventTeamId_idx" ON "event_participants"("eventTeamId");

-- CreateIndex
CREATE INDEX "event_participants_participantId_idx" ON "event_participants"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "event_participants_eventTeamId_participantId_key" ON "event_participants"("eventTeamId", "participantId");

-- AddForeignKey
ALTER TABLE "event_teams" ADD CONSTRAINT "event_teams_sportEventId_fkey" FOREIGN KEY ("sportEventId") REFERENCES "sport_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_teams" ADD CONSTRAINT "event_teams_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_eventTeamId_fkey" FOREIGN KEY ("eventTeamId") REFERENCES "event_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
