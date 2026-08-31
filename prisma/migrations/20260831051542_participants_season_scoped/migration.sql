/*
  Warnings:

  - Added the required column `seasonId` to the `participants` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "participants" DROP CONSTRAINT "participants_teamId_fkey";

-- AlterTable
ALTER TABLE "participants" ADD COLUMN     "seasonId" TEXT NOT NULL,
ALTER COLUMN "teamId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "participants_seasonId_idx" ON "participants"("seasonId");

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
