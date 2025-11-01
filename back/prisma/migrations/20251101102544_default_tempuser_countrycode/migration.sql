/*
  Warnings:

  - Made the column `countryCode` on table `tempuser` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "tempuser" ALTER COLUMN "countryCode" SET NOT NULL,
ALTER COLUMN "countryCode" SET DEFAULT 'somewhere';
