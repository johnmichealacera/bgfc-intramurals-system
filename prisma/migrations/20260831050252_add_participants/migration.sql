-- CreateEnum
CREATE TYPE "ParticipantGender" AS ENUM ('MALE', 'FEMALE');

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "course" TEXT NOT NULL,
    "yearLevel" TEXT,
    "gender" "ParticipantGender",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "participants_teamId_idx" ON "participants"("teamId");

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
