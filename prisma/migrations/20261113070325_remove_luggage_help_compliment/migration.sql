/*
  Warnings:

  - The values [LUGGAGE_HELP] on the enum `RideCompliment` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RideCompliment_new" AS ENUM ('SMOOTH_DRIVING', 'PUNCTUAL');
ALTER TABLE "ride_ratings" ALTER COLUMN "compliments" TYPE "RideCompliment_new"[] USING ("compliments"::text::"RideCompliment_new"[]);
ALTER TYPE "RideCompliment" RENAME TO "RideCompliment_old";
ALTER TYPE "RideCompliment_new" RENAME TO "RideCompliment";
DROP TYPE "public"."RideCompliment_old";
COMMIT;
