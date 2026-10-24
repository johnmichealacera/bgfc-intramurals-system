-- AlterTable
ALTER TABLE "matches" ADD COLUMN "postponeReason" TEXT,
ADD COLUMN "resumeRequestReason" TEXT;

-- AlterTable
ALTER TABLE "placement_points_rules" ADD COLUMN "eventType" "SportEventType" NOT NULL DEFAULT 'TEAM_VS_TEAM';

-- DropIndex
DROP INDEX IF EXISTS "placement_points_rules_seasonId_placement_key";

-- CreateIndex
CREATE UNIQUE INDEX "placement_points_rules_seasonId_eventType_placement_key" ON "placement_points_rules"("seasonId", "eventType", "placement");

-- CreateIndex
CREATE INDEX "placement_points_rules_seasonId_eventType_idx" ON "placement_points_rules"("seasonId", "eventType");

-- Copy existing group rules into solo rules
INSERT INTO "placement_points_rules" ("id", "seasonId", "eventType", "placement", "points", "createdAt", "updatedAt")
SELECT CONCAT('solo-', "id"), "seasonId", 'PLACEMENT', "placement", "points", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "placement_points_rules"
WHERE "eventType" = 'TEAM_VS_TEAM';

-- CreateTable
CREATE TABLE "event_bracket_games" (
    "id" TEXT NOT NULL,
    "sportEventId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "homeTeamId" TEXT,
    "awayTeamId" TEXT,
    "winnerTeamId" TEXT,
    "matchId" TEXT,
    "nextGameId" TEXT,
    "nextSlot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_bracket_games_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_bracket_games_matchId_key" ON "event_bracket_games"("matchId");

-- CreateIndex
CREATE INDEX "event_bracket_games_sportEventId_idx" ON "event_bracket_games"("sportEventId");

-- CreateIndex
CREATE INDEX "event_bracket_games_nextGameId_idx" ON "event_bracket_games"("nextGameId");

-- CreateIndex
CREATE UNIQUE INDEX "event_bracket_games_sportEventId_round_position_key" ON "event_bracket_games"("sportEventId", "round", "position");

-- AddForeignKey
ALTER TABLE "event_bracket_games" ADD CONSTRAINT "event_bracket_games_sportEventId_fkey" FOREIGN KEY ("sportEventId") REFERENCES "sport_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_bracket_games" ADD CONSTRAINT "event_bracket_games_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_bracket_games" ADD CONSTRAINT "event_bracket_games_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_bracket_games" ADD CONSTRAINT "event_bracket_games_winnerTeamId_fkey" FOREIGN KEY ("winnerTeamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_bracket_games" ADD CONSTRAINT "event_bracket_games_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_bracket_games" ADD CONSTRAINT "event_bracket_games_nextGameId_fkey" FOREIGN KEY ("nextGameId") REFERENCES "event_bracket_games"("id") ON DELETE SET NULL ON UPDATE CASCADE;
