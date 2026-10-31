ALTER TABLE "matches" ADD COLUMN "tabulatorUserId" TEXT;
ALTER TABLE "event_schedules" ADD COLUMN "tabulatorUserId" TEXT;

UPDATE "matches" AS m
SET "tabulatorUserId" = (
  SELECT et."userId" FROM "event_tabulators" et
  WHERE et."sportEventId" = m."sportEventId"
  ORDER BY et."createdAt"
  LIMIT 1
);

UPDATE "event_schedules" AS s
SET "tabulatorUserId" = (
  SELECT et."userId" FROM "event_tabulators" et
  WHERE et."sportEventId" = s."sportEventId"
  ORDER BY et."createdAt"
  LIMIT 1
);

WITH ranked_matches AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY "tabulatorUserId", "scheduledAt"
    ORDER BY "createdAt"
  ) AS rn
  FROM "matches"
  WHERE "tabulatorUserId" IS NOT NULL
    AND status IN ('SCHEDULED', 'LIVE')
)
UPDATE "matches" m
SET "tabulatorUserId" = NULL
FROM ranked_matches r
WHERE m.id = r.id AND r.rn > 1;

WITH ranked_sessions AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY "tabulatorUserId", "scheduledAt"
    ORDER BY "createdAt"
  ) AS rn
  FROM "event_schedules"
  WHERE "tabulatorUserId" IS NOT NULL
    AND status IN ('SCHEDULED', 'LIVE')
)
UPDATE "event_schedules" s
SET "tabulatorUserId" = NULL
FROM ranked_sessions r
WHERE s.id = r.id AND r.rn > 1;

UPDATE "event_schedules" s
SET "tabulatorUserId" = NULL
WHERE s."tabulatorUserId" IS NOT NULL
  AND s.status IN ('SCHEDULED', 'LIVE')
  AND EXISTS (
    SELECT 1 FROM "matches" m
    WHERE m."tabulatorUserId" = s."tabulatorUserId"
      AND m."scheduledAt" = s."scheduledAt"
      AND m.status IN ('SCHEDULED', 'LIVE')
  );

ALTER TABLE "matches" ADD CONSTRAINT "matches_tabulatorUserId_fkey" FOREIGN KEY ("tabulatorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "event_schedules" ADD CONSTRAINT "event_schedules_tabulatorUserId_fkey" FOREIGN KEY ("tabulatorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "matches_tabulatorUserId_idx" ON "matches"("tabulatorUserId");
CREATE INDEX "event_schedules_tabulatorUserId_idx" ON "event_schedules"("tabulatorUserId");

DROP TABLE "event_tabulators";
