/*
  Warnings:

  - You are about to drop the column `status` on the `registration_documents` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DriverRegistrationStep" ADD VALUE 'PENDING_REVIEW';
ALTER TYPE "DriverRegistrationStep" ADD VALUE 'DOCUMENTS_CORRECTION';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'ADMIN';

-- AlterTable
ALTER TABLE "registration_documents" DROP COLUMN "status";

-- CreateTable
CREATE TABLE "admins" (
    "userId" TEXT NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "registration_document_validation_events" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_document_validation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_document_rejection_events" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "rejectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_document_rejection_events_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_document_validation_events" ADD CONSTRAINT "registration_document_validation_events_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "registration_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_document_validation_events" ADD CONSTRAINT "registration_document_validation_events_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_document_rejection_events" ADD CONSTRAINT "registration_document_rejection_events_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "registration_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_document_rejection_events" ADD CONSTRAINT "registration_document_rejection_events_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_suspension_events" ADD CONSTRAINT "driver_suspension_events_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
