-- CreateTable
CREATE TABLE "chat" (
    "id" TEXT NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "nickname" VARCHAR(255) NOT NULL,
    "countryCode" VARCHAR(10) NOT NULL,
    "type" VARCHAR(10) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_timestamp_idx" ON "chat"("timestamp");
