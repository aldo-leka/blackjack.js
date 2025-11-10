-- CreateTable
CREATE TABLE "log" (
    "id" TEXT NOT NULL,
    "level" VARCHAR(10) NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "log_level_idx" ON "log"("level");

-- CreateIndex
CREATE INDEX "log_timestamp_idx" ON "log"("timestamp");
