-- CreateEnum
CREATE TYPE "MatchPhase" AS ENUM ('ROUND_ROBIN', 'ELIMINATION');

-- AlterTable
ALTER TABLE "matches" ADD COLUMN "phase" "MatchPhase" NOT NULL DEFAULT 'ROUND_ROBIN';

-- Existing knockout games stay marked as elimination
UPDATE "matches"
SET "phase" = 'ELIMINATION'
WHERE "id" IN (SELECT "matchId" FROM "event_bracket_games" WHERE "matchId" IS NOT NULL);

-- CreateIndex
CREATE INDEX "matches_sportEventId_phase_idx" ON "matches"("sportEventId", "phase");
