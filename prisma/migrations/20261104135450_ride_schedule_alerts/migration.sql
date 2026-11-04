-- CreateEnum
CREATE TYPE "RideScheduleAlertKind" AS ENUM ('GO_ONLINE', 'LEAVE_NOW', 'LATE_FIRST', 'LATE_SECOND');

-- AlterEnum
ALTER TYPE "RideStatus" ADD VALUE 'DRIVER_ASSIGNED';

-- CreateTable
CREATE TABLE "ride_schedule_alerts" (
    "rideId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "kind" "RideScheduleAlertKind" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ride_schedule_alerts_pkey" PRIMARY KEY ("rideId","driverId","kind")
);

-- AddForeignKey
ALTER TABLE "ride_schedule_alerts" ADD CONSTRAINT "ride_schedule_alerts_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "ride_schedules"("rideId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_schedule_alerts" ADD CONSTRAINT "ride_schedule_alerts_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
