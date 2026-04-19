/*
  Warnings:

  - Added the required column `updatedAt` to the `registration_documents` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "registration_documents" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
