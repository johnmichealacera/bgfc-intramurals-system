-- AlterTable
ALTER TABLE "matches" ADD COLUMN "resumeRequestedAt" TIMESTAMP(3),
ADD COLUMN "resumeApprovedAt" TIMESTAMP(3),
ADD COLUMN "resumeRequestedByUserId" TEXT,
ADD COLUMN "resumeApprovedByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_resumeRequestedByUserId_fkey" FOREIGN KEY ("resumeRequestedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_resumeApprovedByUserId_fkey" FOREIGN KEY ("resumeApprovedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
