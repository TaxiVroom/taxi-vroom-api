/*
  The new columns are required, without a default in schema.prisma: the rows
  already there get their value once, here, then the default is dropped, so a
  later write that forgets the value fails instead of getting one in silence.
  Spec docs/specs/nombre-de-passagers.md.

  - passengerSeats: 4 for the registrations and the vehicles already saved.
  - passengerCount: 1 for the rides already saved.
  - extraPassengerCents: 400 for the tariffs already saved, the Bas-Rhin's
    (4 € per passenger from the fifth).
*/
-- AlterTable
ALTER TABLE "driver_registration_vehicles" ADD COLUMN     "passengerSeats" INTEGER NOT NULL DEFAULT 4;
ALTER TABLE "driver_registration_vehicles" ALTER COLUMN "passengerSeats" DROP DEFAULT;

-- AlterTable
ALTER TABLE "driver_vehicles" ADD COLUMN     "passengerSeats" INTEGER NOT NULL DEFAULT 4;
ALTER TABLE "driver_vehicles" ALTER COLUMN "passengerSeats" DROP DEFAULT;

-- AlterTable
ALTER TABLE "rides" ADD COLUMN     "passengerCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "rides" ALTER COLUMN "passengerCount" DROP DEFAULT;

-- AlterTable
ALTER TABLE "taxi_tariffs" ADD COLUMN     "extraPassengerCents" INTEGER NOT NULL DEFAULT 400;
ALTER TABLE "taxi_tariffs" ALTER COLUMN "extraPassengerCents" DROP DEFAULT;
