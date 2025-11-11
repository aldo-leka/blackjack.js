-- CreateTable
CREATE TABLE "performancelog" (
    "id" TEXT NOT NULL,
    "userAgent" TEXT,
    "fps" INTEGER NOT NULL,
    "avgFrameTime" DOUBLE PRECISION NOT NULL,
    "longTasks" INTEGER NOT NULL,
    "memoryUsage" DOUBLE PRECISION,
    "url" VARCHAR(500) NOT NULL,
    "userNickname" VARCHAR(255),
    "deviceType" VARCHAR(50),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performancelog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "performancelog_fps_idx" ON "performancelog"("fps");

-- CreateIndex
CREATE INDEX "performancelog_timestamp_idx" ON "performancelog"("timestamp");
