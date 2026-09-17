-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL,
    "maxScore" INTEGER NOT NULL DEFAULT 8,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);
