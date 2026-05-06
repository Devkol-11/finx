-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "KycVerificationType" AS ENUM ('BVN', 'NIN', 'PASSPORT', 'DRIVERS_LICENSE', 'FACE');

-- CreateEnum
CREATE TYPE "KycVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "KycTier" AS ENUM ('TIER_0', 'TIER_1', 'TIER_2', 'TIER_3');

-- CreateTable
CREATE TABLE "KycProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "KycTier" NOT NULL DEFAULT 'TIER_0',
    "status" "KycStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kycProfileId" TEXT NOT NULL,
    "type" "KycVerificationType" NOT NULL,
    "status" "KycVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "provider" VARCHAR(64) NOT NULL,
    "providerRef" VARCHAR(128),
    "submittedData" JSONB NOT NULL,
    "providerResponse" JSONB,
    "failureReason" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "KycVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KycProfile_userId_key" ON "KycProfile"("userId");

-- CreateIndex
CREATE INDEX "KycProfile_tier_idx" ON "KycProfile"("tier");

-- CreateIndex
CREATE INDEX "KycProfile_status_idx" ON "KycProfile"("status");

-- CreateIndex
CREATE INDEX "KycVerification_userId_type_idx" ON "KycVerification"("userId", "type");

-- CreateIndex
CREATE INDEX "KycVerification_status_createdAt_idx" ON "KycVerification"("status", "createdAt");

-- CreateIndex
CREATE INDEX "KycVerification_kycProfileId_idx" ON "KycVerification"("kycProfileId");

-- AddForeignKey
ALTER TABLE "KycProfile" ADD CONSTRAINT "KycProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycVerification" ADD CONSTRAINT "KycVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycVerification" ADD CONSTRAINT "KycVerification_kycProfileId_fkey" FOREIGN KEY ("kycProfileId") REFERENCES "KycProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
