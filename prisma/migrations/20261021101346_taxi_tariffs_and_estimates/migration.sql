/*
  Warnings:

  - Added the required column `tariffId` to the `rides` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "HolidayZone" AS ENUM ('METROPOLE', 'ALSACE_MOSELLE');

-- AlterEnum
ALTER TYPE "RideStatus" ADD VALUE 'ESTIMATED';

-- AlterTable
ALTER TABLE "rides" ADD COLUMN     "tariffId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "taxi_tariffs" (
    "id" TEXT NOT NULL,
    "departmentCode" TEXT NOT NULL,
    "validFrom" DATE NOT NULL,
    "decree" TEXT NOT NULL,
    "pickupCents" INTEGER NOT NULL,
    "kmCentsA" INTEGER NOT NULL,
    "kmCentsB" INTEGER NOT NULL,
    "kmCentsC" INTEGER NOT NULL,
    "kmCentsD" INTEGER NOT NULL,
    "hourlyCents" INTEGER NOT NULL,
    "minimumFareCents" INTEGER NOT NULL,
    "nightStartMinute" INTEGER NOT NULL,
    "nightEndMinute" INTEGER NOT NULL,
    "holidayZone" "HolidayZone" NOT NULL,

    CONSTRAINT "taxi_tariffs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "taxi_tariffs_departmentCode_validFrom_key" ON "taxi_tariffs"("departmentCode", "validFrom");

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "taxi_tariffs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
