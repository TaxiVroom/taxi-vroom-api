-- CreateEnum
CREATE TYPE "SavedPlaceKind" AS ENUM ('HOME', 'WORK');

-- CreateTable
CREATE TABLE "passenger_saved_places" (
    "passengerId" TEXT NOT NULL,
    "kind" "SavedPlaceKind" NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "passenger_saved_places_pkey" PRIMARY KEY ("passengerId","kind")
);

-- AddForeignKey
ALTER TABLE "passenger_saved_places" ADD CONSTRAINT "passenger_saved_places_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "passengers"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
