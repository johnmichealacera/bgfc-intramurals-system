CREATE TABLE "points_systems" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "suggestedType" "SportEventType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "points_systems_pkey" PRIMARY KEY ("id")
);

INSERT INTO "points_systems" ("id", "seasonId", "name", "suggestedType", "createdAt", "updatedAt")
SELECT md5(s.id || 'TEAM_VS_TEAM'), s.id, 'Group', 'TEAM_VS_TEAM', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "seasons" s;

INSERT INTO "points_systems" ("id", "seasonId", "name", "suggestedType", "createdAt", "updatedAt")
SELECT md5(s.id || 'PLACEMENT'), s.id, 'Solo', 'PLACEMENT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "seasons" s;

ALTER TABLE "placement_points_rules" ADD COLUMN "pointsSystemId" TEXT;

UPDATE "placement_points_rules" r
SET "pointsSystemId" = s.id
FROM "points_systems" s
WHERE s."seasonId" = r."seasonId"
  AND s."suggestedType" = r."eventType";

DELETE FROM "placement_points_rules" WHERE "pointsSystemId" IS NULL;

ALTER TABLE "placement_points_rules" ALTER COLUMN "pointsSystemId" SET NOT NULL;

ALTER TABLE "placement_points_rules" DROP CONSTRAINT "placement_points_rules_seasonId_fkey";
DROP INDEX "placement_points_rules_seasonId_eventType_placement_key";
DROP INDEX "placement_points_rules_seasonId_eventType_idx";
ALTER TABLE "placement_points_rules" DROP COLUMN "seasonId";
ALTER TABLE "placement_points_rules" DROP COLUMN "eventType";

CREATE UNIQUE INDEX "placement_points_rules_pointsSystemId_placement_key" ON "placement_points_rules"("pointsSystemId", "placement");
CREATE INDEX "placement_points_rules_pointsSystemId_idx" ON "placement_points_rules"("pointsSystemId");

ALTER TABLE "placement_points_rules" ADD CONSTRAINT "placement_points_rules_pointsSystemId_fkey" FOREIGN KEY ("pointsSystemId") REFERENCES "points_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "points_systems" ADD CONSTRAINT "points_systems_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "points_systems_seasonId_name_key" ON "points_systems"("seasonId", "name");
CREATE INDEX "points_systems_seasonId_idx" ON "points_systems"("seasonId");

ALTER TABLE "sport_events" ADD COLUMN "pointsSystemId" TEXT;

UPDATE "sport_events" e
SET "pointsSystemId" = s.id
FROM "points_systems" s
WHERE s."seasonId" = e."seasonId"
  AND s."suggestedType" = e.type;

ALTER TABLE "sport_events" ADD CONSTRAINT "sport_events_pointsSystemId_fkey" FOREIGN KEY ("pointsSystemId") REFERENCES "points_systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "sport_events_pointsSystemId_idx" ON "sport_events"("pointsSystemId");
