-- AlterEnum
ALTER TYPE "RideOfferStatus" ADD VALUE 'WITHDRAWN';

-- CreateTable
CREATE TABLE "ride_cancellations" (
    "rideId" TEXT NOT NULL,
    "cancelledAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ride_cancellations_pkey" PRIMARY KEY ("rideId")
);

-- CreateTable
CREATE TABLE "ride_no_shows" (
    "offerId" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ride_no_shows_pkey" PRIMARY KEY ("offerId")
);

-- CreateTable
CREATE TABLE "ride_completions" (
    "offerId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "meterCents" INTEGER NOT NULL,

    CONSTRAINT "ride_completions_pkey" PRIMARY KEY ("offerId")
);

-- CreateTable
CREATE TABLE "ride_completion_supplements" (
    "offerId" TEXT NOT NULL,
    "supplementId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "ride_completion_supplements_pkey" PRIMARY KEY ("offerId","supplementId")
);

-- CreateTable
CREATE TABLE "ride_offer_withdrawals" (
    "offerId" TEXT NOT NULL,
    "withdrawnAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ride_offer_withdrawals_pkey" PRIMARY KEY ("offerId")
);

-- AddForeignKey
ALTER TABLE "ride_cancellations" ADD CONSTRAINT "ride_cancellations_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_no_shows" ADD CONSTRAINT "ride_no_shows_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ride_arrivals"("offerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_completions" ADD CONSTRAINT "ride_completions_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ride_starts"("offerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_completion_supplements" ADD CONSTRAINT "ride_completion_supplements_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ride_completions"("offerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_offer_withdrawals" ADD CONSTRAINT "ride_offer_withdrawals_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ride_offer_acceptances"("offerId") ON DELETE CASCADE ON UPDATE CASCADE;
