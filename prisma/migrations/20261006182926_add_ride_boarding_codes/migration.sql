/*
  Warnings:

  - You are about to drop the column `boardingCode` on the `ride_offer_acceptances` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ride_offer_acceptances" DROP COLUMN "boardingCode";

-- CreateTable
CREATE TABLE "ride_boarding_codes" (
    "rideId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,

    CONSTRAINT "ride_boarding_codes_pkey" PRIMARY KEY ("rideId")
);

-- AddForeignKey
ALTER TABLE "ride_boarding_codes" ADD CONSTRAINT "ride_boarding_codes_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;
