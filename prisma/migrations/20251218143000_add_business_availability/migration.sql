-- CreateTable
CREATE TABLE "BusinessAvailability" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "weekly" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessAvailability_businessId_key" ON "BusinessAvailability"("businessId");

-- AddForeignKey
ALTER TABLE "BusinessAvailability" ADD CONSTRAINT "BusinessAvailability_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
