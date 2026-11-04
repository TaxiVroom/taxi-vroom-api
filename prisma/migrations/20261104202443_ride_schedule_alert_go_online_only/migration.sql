/*
  Warnings:

  - The values [LEAVE_NOW,LATE_FIRST,LATE_SECOND] on the enum `RideScheduleAlertKind` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RideScheduleAlertKind_new" AS ENUM ('GO_ONLINE');
ALTER TABLE "ride_schedule_alerts" ALTER COLUMN "kind" TYPE "RideScheduleAlertKind_new" USING ("kind"::text::"RideScheduleAlertKind_new");
ALTER TYPE "RideScheduleAlertKind" RENAME TO "RideScheduleAlertKind_old";
ALTER TYPE "RideScheduleAlertKind_new" RENAME TO "RideScheduleAlertKind";
DROP TYPE "public"."RideScheduleAlertKind_old";
COMMIT;
