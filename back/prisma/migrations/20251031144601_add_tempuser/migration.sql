-- CreateTable
CREATE TABLE "tempuser" (
    "id" TEXT NOT NULL,
    "nickname" VARCHAR(255) NOT NULL,
    "ip" VARCHAR(255) NOT NULL,
    "countryCode" VARCHAR(10),
    "cash" INTEGER NOT NULL DEFAULT 1000,
    "lastRefillAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tempuser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tempuser_lastRefillAt_idx" ON "tempuser"("lastRefillAt");

-- CreateIndex
CREATE UNIQUE INDEX "tempuser_nickname_ip_key" ON "tempuser"("nickname", "ip");
