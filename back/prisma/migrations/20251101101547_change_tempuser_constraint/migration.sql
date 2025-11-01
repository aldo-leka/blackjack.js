/*
  Warnings:

  - A unique constraint covering the columns `[nickname,countryCode]` on the table `tempuser` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."tempuser_nickname_ip_key";

-- CreateIndex
CREATE UNIQUE INDEX "tempuser_nickname_countryCode_key" ON "tempuser"("nickname", "countryCode");
