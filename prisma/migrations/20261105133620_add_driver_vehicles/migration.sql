-- CreateEnum
CREATE TYPE "VehicleColor" AS ENUM ('BLACK', 'WHITE', 'GREY', 'SILVER', 'BLUE', 'RED', 'GREEN', 'BEIGE', 'BROWN', 'OTHER');

-- AlterEnum
ALTER TYPE "DriverRegistrationStep" ADD VALUE 'VEHICLE';

-- CreateTable
CREATE TABLE "driver_registration_vehicles" (
    "driverRegId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "color" "VehicleColor" NOT NULL,
    "plate" TEXT NOT NULL,
    "adsNumber" TEXT NOT NULL,
    "communeCode" TEXT NOT NULL,
    "communeName" TEXT NOT NULL,

    CONSTRAINT "driver_registration_vehicles_pkey" PRIMARY KEY ("driverRegId")
);

-- CreateTable
CREATE TABLE "driver_vehicles" (
    "driverId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "color" "VehicleColor" NOT NULL,
    "plate" TEXT NOT NULL,
    "adsNumber" TEXT NOT NULL,
    "communeCode" TEXT NOT NULL,
    "communeName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_vehicles_pkey" PRIMARY KEY ("driverId")
);

-- CreateIndex
CREATE UNIQUE INDEX "driver_vehicles_plate_key" ON "driver_vehicles"("plate");

-- CreateIndex
CREATE UNIQUE INDEX "driver_vehicles_communeCode_adsNumber_key" ON "driver_vehicles"("communeCode", "adsNumber");

-- AddForeignKey
ALTER TABLE "driver_registration_vehicles" ADD CONSTRAINT "driver_registration_vehicles_driverRegId_fkey" FOREIGN KEY ("driverRegId") REFERENCES "DriverRegistration"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_vehicles" ADD CONSTRAINT "driver_vehicles_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
