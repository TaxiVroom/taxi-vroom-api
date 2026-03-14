/*
  Warnings:

  - A unique constraint covering the columns `[driverRegId,documentTypeId]` on the table `registration_documents` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "registration_documents_driverRegId_documentTypeId_key" ON "registration_documents"("driverRegId", "documentTypeId");
