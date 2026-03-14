/*
  Warnings:

  - You are about to drop the `driver_registration_flows` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `passenger_registration_flows` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `registration_flows` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "DriverRegistrationStep" AS ENUM ('SOCIAL_LINK', 'EMAIL', 'NAME', 'DOCUMENTS', 'COMPLETE');

-- DropForeignKey
ALTER TABLE "driver_registration_flows" DROP CONSTRAINT "driver_registration_flows_userId_fkey";

-- DropForeignKey
ALTER TABLE "passenger_registration_flows" DROP CONSTRAINT "passenger_registration_flows_userId_fkey";

-- DropTable
DROP TABLE "driver_registration_flows";

-- DropTable
DROP TABLE "passenger_registration_flows";

-- DropTable
DROP TABLE "registration_flows";

-- CreateTable
CREATE TABLE "Registration" (
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "PassengerRegistration" (
    "userId" TEXT NOT NULL,
    "currentStep" "PassengerRegistrationStep" NOT NULL DEFAULT 'SOCIAL_LINK',

    CONSTRAINT "PassengerRegistration_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "DriverRegistration" (
    "userId" TEXT NOT NULL,
    "currentStep" "DriverRegistrationStep" NOT NULL DEFAULT 'SOCIAL_LINK',

    CONSTRAINT "DriverRegistration_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "PassengerRegistration" ADD CONSTRAINT "PassengerRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Registration"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverRegistration" ADD CONSTRAINT "DriverRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Registration"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
