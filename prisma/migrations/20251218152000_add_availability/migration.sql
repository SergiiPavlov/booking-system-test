-- CreateTable
CREATE TABLE "BusinessWorkingHour" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMin" INTEGER NOT NULL,
    "endMin" INTEGER NOT NULL,

    CONSTRAINT "BusinessWorkingHour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessBreak" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMin" INTEGER NOT NULL,
    "endMin" INTEGER NOT NULL,

    CONSTRAINT "BusinessBreak_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessWorkingHour_businessId_dayOfWeek_key" ON "BusinessWorkingHour"("businessId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "BusinessBreak_businessId_dayOfWeek_idx" ON "BusinessBreak"("businessId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "BusinessWorkingHour" ADD CONSTRAINT "BusinessWorkingHour_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessBreak" ADD CONSTRAINT "BusinessBreak_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
