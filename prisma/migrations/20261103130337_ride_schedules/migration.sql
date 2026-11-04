/*
  Warnings:

  - Added the required column `kind` to the `rides` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RideKind" AS ENUM ('IMMEDIATE', 'SCHEDULED');

-- AlterEnum
ALTER TYPE "RideStatus" ADD VALUE 'BOOKED';

-- AlterTable
ALTER TABLE "rides" ADD COLUMN     "kind" "RideKind" NOT NULL;

-- CreateTable
CREATE TABLE "ride_schedules" (
    "rideId" TEXT NOT NULL,
    "pickupAt" TIMESTAMP(3) NOT NULL,
    "tripMeters" INTEGER NOT NULL,

    CONSTRAINT "ride_schedules_pkey" PRIMARY KEY ("rideId")
);

-- CreateTable
CREATE TABLE "ride_schedule_drivers" (
    "rideId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ride_schedule_drivers_pkey" PRIMARY KEY ("rideId")
);

-- CreateTable
CREATE TABLE "ride_schedule_withdrawals" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL,
    "withdrawnAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ride_schedule_withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ride_schedules_pickupAt_idx" ON "ride_schedules"("pickupAt");

-- CreateIndex
CREATE INDEX "ride_schedule_drivers_driverId_idx" ON "ride_schedule_drivers"("driverId");

-- AddForeignKey
ALTER TABLE "ride_schedules" ADD CONSTRAINT "ride_schedules_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_schedule_drivers" ADD CONSTRAINT "ride_schedule_drivers_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "ride_schedules"("rideId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_schedule_drivers" ADD CONSTRAINT "ride_schedule_drivers_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_schedule_withdrawals" ADD CONSTRAINT "ride_schedule_withdrawals_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "ride_schedules"("rideId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_schedule_withdrawals" ADD CONSTRAINT "ride_schedule_withdrawals_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
