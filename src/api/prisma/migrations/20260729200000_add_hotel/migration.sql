-- CreateTable
CREATE TABLE "Hotel" (
    "id" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "nightlyRate" DECIMAL(12,2),
    "nights" INTEGER,
    "notes" TEXT,
    "bookingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hotel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Hotel_stopId_idx" ON "Hotel"("stopId");

-- AddForeignKey
ALTER TABLE "Hotel" ADD CONSTRAINT "Hotel_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "Stop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
