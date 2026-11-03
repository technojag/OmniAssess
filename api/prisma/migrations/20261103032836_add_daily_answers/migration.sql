-- CreateTable
CREATE TABLE "daily_answers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_answers_userId_day_idx" ON "daily_answers"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "daily_answers_userId_day_questionId_key" ON "daily_answers"("userId", "day", "questionId");
