-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('SEARCHING_DRIVER', 'NO_DRIVER_FOUND', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PASSENGER_NO_SHOW');

-- CreateEnum
CREATE TYPE "RideOfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateTable
CREATE TABLE "rides" (
    "id" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,
    "status" "RideStatus" NOT NULL,
    "originName" TEXT,
    "originLatitude" DOUBLE PRECISION NOT NULL,
    "originLongitude" DOUBLE PRECISION NOT NULL,
    "destinationName" TEXT NOT NULL,
    "destinationLatitude" DOUBLE PRECISION NOT NULL,
    "destinationLongitude" DOUBLE PRECISION NOT NULL,
    "estimatedPriceMinCents" INTEGER NOT NULL,
    "estimatedPriceMaxCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_no_driver_found" (
    "rideId" TEXT NOT NULL,
    "stoppedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ride_no_driver_found_pkey" PRIMARY KEY ("rideId")
);

-- CreateTable
CREATE TABLE "ride_offers" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "status" "RideOfferStatus" NOT NULL,
    "offeredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ride_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_offer_acceptances" (
    "offerId" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL,
    "boardingCode" TEXT NOT NULL,

    CONSTRAINT "ride_offer_acceptances_pkey" PRIMARY KEY ("offerId")
);

-- CreateTable
CREATE TABLE "ride_offer_declines" (
    "offerId" TEXT NOT NULL,
    "declinedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ride_offer_declines_pkey" PRIMARY KEY ("offerId")
);

-- CreateTable
CREATE TABLE "ride_offer_expirations" (
    "offerId" TEXT NOT NULL,
    "expiredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ride_offer_expirations_pkey" PRIMARY KEY ("offerId")
);

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "passengers"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_no_driver_found" ADD CONSTRAINT "ride_no_driver_found_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_offers" ADD CONSTRAINT "ride_offers_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_offers" ADD CONSTRAINT "ride_offers_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_offer_acceptances" ADD CONSTRAINT "ride_offer_acceptances_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ride_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_offer_declines" ADD CONSTRAINT "ride_offer_declines_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ride_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_offer_expirations" ADD CONSTRAINT "ride_offer_expirations_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ride_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Written by hand: Prisma cannot express partial unique indexes.
-- A ride is proposed to one driver at a time.
CREATE UNIQUE INDEX "ride_offers_one_pending_per_ride" ON "ride_offers"("rideId") WHERE "status" = 'PENDING';

-- A driver gets one ride request at a time.
CREATE UNIQUE INDEX "ride_offers_one_pending_per_driver" ON "ride_offers"("driverId") WHERE "status" = 'PENDING';
