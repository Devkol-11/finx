-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('PAYSTACK');

-- CreateEnum
CREATE TYPE "PaymentDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('FIAT_DEPOSIT', 'FIAT_WITHDRAWAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'AWAITING_CUSTOMER', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'ABANDONED', 'CANCELLED', 'REVERSED');

-- CreateEnum
CREATE TYPE "PaymentEventType" AS ENUM ('CREATED', 'PROVIDER_INITIALIZED', 'PROVIDER_TRANSFER_CREATED', 'PROVIDER_VERIFIED', 'WEBHOOK_RECEIVED', 'STATE_TRANSITION', 'LEDGER_POSTED', 'PROVIDER_FAILED');

-- CreateTable
CREATE TABLE "PaymentIntent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "ledgerTransactionId" TEXT,
    "provider" "PaymentProvider" NOT NULL,
    "direction" "PaymentDirection" NOT NULL,
    "type" "PaymentType" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "reference" VARCHAR(128) NOT NULL,
    "idempotencyKey" VARCHAR(128),
    "providerReference" VARCHAR(128),
    "providerTransactionId" BIGINT,
    "amount" DECIMAL(30,8) NOT NULL,
    "currency" "WalletCurrency" NOT NULL,
    "email" VARCHAR(320),
    "callbackUrl" VARCHAR(2048),
    "authorizationUrl" VARCHAR(2048),
    "accessCode" VARCHAR(128),
    "recipientCode" VARCHAR(128),
    "providerStatus" VARCHAR(64),
    "gatewayResponse" VARCHAR(255),
    "fees" DECIMAL(30,8),
    "paidAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" VARCHAR(255),
    "metadata" JSONB,
    "providerPayload" JSONB,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "paymentIntentId" TEXT NOT NULL,
    "eventType" "PaymentEventType" NOT NULL,
    "fromStatus" "PaymentStatus",
    "toStatus" "PaymentStatus",
    "idempotencyKey" VARCHAR(128),
    "requestId" VARCHAR(128),
    "providerReference" VARCHAR(128),
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_ledgerTransactionId_key" ON "PaymentIntent"("ledgerTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_reference_key" ON "PaymentIntent"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_idempotencyKey_key" ON "PaymentIntent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentIntent_userId_status_createdAt_idx" ON "PaymentIntent"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentIntent_walletId_status_createdAt_idx" ON "PaymentIntent"("walletId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentIntent_provider_providerReference_idx" ON "PaymentIntent"("provider", "providerReference");

-- CreateIndex
CREATE INDEX "PaymentIntent_providerTransactionId_idx" ON "PaymentIntent"("providerTransactionId");

-- CreateIndex
CREATE INDEX "PaymentIntent_status_createdAt_idx" ON "PaymentIntent"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentEvent_paymentIntentId_createdAt_idx" ON "PaymentEvent"("paymentIntentId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentEvent_eventType_createdAt_idx" ON "PaymentEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentEvent_providerReference_idx" ON "PaymentEvent"("providerReference");

-- AddForeignKey
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_ledgerTransactionId_fkey" FOREIGN KEY ("ledgerTransactionId") REFERENCES "LedgerTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
