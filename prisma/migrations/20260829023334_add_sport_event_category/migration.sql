-- CreateEnum
CREATE TYPE "SportEventCategory" AS ENUM ('MEN', 'WOMEN', 'MIXED');

-- AlterTable
ALTER TABLE "sport_events" ADD COLUMN     "category" "SportEventCategory";
