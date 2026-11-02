/*
  Warnings:

  - Made the column `originName` on table `rides` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "RideCompliment" AS ENUM ('SMOOTH_DRIVING', 'PUNCTUAL', 'LUGGAGE_HELP');

-- AlterTable
ALTER TABLE "rides" ALTER COLUMN "originName" SET NOT NULL;

-- CreateTable
CREATE TABLE "ride_ratings" (
    "offerId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "compliments" "RideCompliment"[],
    "ratedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ride_ratings_pkey" PRIMARY KEY ("offerId")
);

-- AddForeignKey
ALTER TABLE "ride_ratings" ADD CONSTRAINT "ride_ratings_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ride_completions"("offerId") ON DELETE CASCADE ON UPDATE CASCADE;
