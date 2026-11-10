/*
  Warnings:

  - A unique constraint covering the columns `[driverId,documentTypeId]` on the table `documents` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "document_types" ADD COLUMN     "expires" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiredFrom" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "registration_documents" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "driver_document_submissions" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "frontFilePath" TEXT NOT NULL,
    "backFilePath" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_document_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "driver_document_submissions_driverId_documentTypeId_key" ON "driver_document_submissions"("driverId", "documentTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "documents_driverId_documentTypeId_key" ON "documents"("driverId", "documentTypeId");

-- AddForeignKey
ALTER TABLE "driver_document_submissions" ADD CONSTRAINT "driver_document_submissions_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_document_submissions" ADD CONSTRAINT "driver_document_submissions_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
