-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('SUBMITTED', 'VALIDATED', 'REJECTED');

-- AlterTable
ALTER TABLE "registration_documents" ADD COLUMN     "status" "DocumentStatus" NOT NULL DEFAULT 'SUBMITTED';
