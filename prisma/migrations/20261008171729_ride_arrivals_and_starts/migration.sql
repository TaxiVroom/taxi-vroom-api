/*
  Warnings:

  - The primary key for the `ride_boarding_codes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `codeHash` on the `ride_boarding_codes` table. All the data in the column will be lost.
  - You are about to drop the column `rideId` on the `ride_boarding_codes` table. All the data in the column will be lost.
  - Added the required column `code` to the `ride_boarding_codes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `offerId` to the `ride_boarding_codes` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ride_boarding_codes" DROP CONSTRAINT "ride_boarding_codes_rideId_fkey";

-- AlterTable
ALTER TABLE "ride_boarding_codes" DROP CONSTRAINT "ride_boarding_codes_pkey",
DROP COLUMN "codeHash",
DROP COLUMN "rideId",
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "failedAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "offerId" TEXT NOT NULL,
ADD CONSTRAINT "ride_boarding_codes_pkey" PRIMARY KEY ("offerId");

-- CreateTable
CREATE TABLE "ride_arrivals" (
    "offerId" TEXT NOT NULL,
    "arrivedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ride_arrivals_pkey" PRIMARY KEY ("offerId")
);

-- CreateTable
CREATE TABLE "ride_starts" (
    "offerId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ride_starts_pkey" PRIMARY KEY ("offerId")
);

-- AddForeignKey
ALTER TABLE "ride_boarding_codes" ADD CONSTRAINT "ride_boarding_codes_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ride_offer_acceptances"("offerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_arrivals" ADD CONSTRAINT "ride_arrivals_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ride_offer_acceptances"("offerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_starts" ADD CONSTRAINT "ride_starts_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ride_arrivals"("offerId") ON DELETE CASCADE ON UPDATE CASCADE;
