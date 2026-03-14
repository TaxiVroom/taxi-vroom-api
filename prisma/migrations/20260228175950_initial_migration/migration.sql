-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PASSENGER', 'DRIVER');

-- CreateEnum
CREATE TYPE "PassengerRegistrationStep" AS ENUM ('SOCIAL_LINK', 'EMAIL', 'NAME', 'NOTIFICATIONS', 'COMPLETE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passengers" (
    "userId" TEXT NOT NULL,

    CONSTRAINT "passengers_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "drivers" (
    "userId" TEXT NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "registration_flows" (
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_flows_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "passenger_registration_flows" (
    "userId" TEXT NOT NULL,
    "currentStep" "PassengerRegistrationStep" NOT NULL DEFAULT 'SOCIAL_LINK',

    CONSTRAINT "passenger_registration_flows_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "driver_registration_flows" (
    "userId" TEXT NOT NULL,

    CONSTRAINT "driver_registration_flows_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_key" ON "wallets"("userId");

-- AddForeignKey
ALTER TABLE "passengers" ADD CONSTRAINT "passengers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passenger_registration_flows" ADD CONSTRAINT "passenger_registration_flows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "registration_flows"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_registration_flows" ADD CONSTRAINT "driver_registration_flows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "registration_flows"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
