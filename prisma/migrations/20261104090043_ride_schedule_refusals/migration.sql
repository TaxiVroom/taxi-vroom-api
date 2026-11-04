-- CreateTable
CREATE TABLE "ride_schedule_refusals" (
    "rideId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "refusedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ride_schedule_refusals_pkey" PRIMARY KEY ("rideId","driverId")
);

-- AddForeignKey
ALTER TABLE "ride_schedule_refusals" ADD CONSTRAINT "ride_schedule_refusals_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "ride_schedules"("rideId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_schedule_refusals" ADD CONSTRAINT "ride_schedule_refusals_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
