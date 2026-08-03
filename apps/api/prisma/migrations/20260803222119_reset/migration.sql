-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'LOCKED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('FIAT', 'CRYPTO');

-- CreateEnum
CREATE TYPE "WalletCurrency" AS ENUM ('NGN', 'USD', 'USDT', 'USDC', 'ETH', 'BTC');

-- CreateEnum
CREATE TYPE "LedgerTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'P2P_TRANSFER', 'INVESTMENT_FUNDING', 'INVESTMENT_PAYOUT', 'INVESTMENT_INTEREST', 'FEE', 'REVERSAL', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "LedgerTransactionStatus" AS ENUM ('PENDING', 'POSTED', 'REVERSED', 'FAILED');

-- CreateEnum
CREATE TYPE "LedgerEntryDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "LedgerAccountType" AS ENUM ('ASSET', 'LIABILITY', 'REVENUE', 'EXPENSE', 'EQUITY');

-- CreateEnum
CREATE TYPE "InvestmentPlanType" AS ENUM ('FIXED_TERM', 'FLEXIBLE_DAILY');

-- CreateEnum
CREATE TYPE "InvestmentPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'MATURED', 'CANCELLED', 'DEFAULTED');

-- CreateEnum
CREATE TYPE "SessionRevocationReason" AS ENUM ('ROTATED', 'LOGGED_OUT', 'PASSWORD_RESET', 'TOKEN_REUSE_DETECTED', 'SECURITY_REVOKED');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "KycProvider" AS ENUM ('PAYSTACK', 'SMILE');

-- CreateEnum
CREATE TYPE "KycVerificationType" AS ENUM ('BVN', 'NIN', 'PASSPORT', 'DRIVERS_LICENSE', 'FACE');

-- CreateEnum
CREATE TYPE "KycVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('PAYSTACK', 'MOCK');

-- CreateEnum
CREATE TYPE "PaymentDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('FIAT_DEPOSIT', 'FIAT_WITHDRAWAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'AWAITING_CUSTOMER', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'ABANDONED', 'CANCELLED', 'REVERSED');

-- CreateEnum
CREATE TYPE "PaymentEventType" AS ENUM ('CREATED', 'PROVIDER_INITIALIZED', 'PROVIDER_TRANSFER_CREATED', 'PROVIDER_VERIFIED', 'WEBHOOK_RECEIVED', 'LEDGER_POSTED', 'PROVIDER_FAILED', 'STATE_TRANSITION');

-- CreateEnum
CREATE TYPE "VirtualAccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'FAILED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "SavingsType" AS ENUM ('FLEXIBLE', 'LOCKED', 'TARGET');

-- CreateEnum
CREATE TYPE "SavingsTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "SavingsStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "phoneNumber" VARCHAR(32) NOT NULL,
    "finxTag" VARCHAR(32) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" VARCHAR(128) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" VARCHAR(512),
    "ipAddress" VARCHAR(64),
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revocationReason" "SessionRevocationReason",
    "replacedBySessionId" TEXT,
    "reuseDetectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" VARCHAR(128) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "WalletType" NOT NULL,
    "currency" "WalletCurrency" NOT NULL,
    "availableBalance" DECIMAL(30,8) NOT NULL DEFAULT 0,
    "pendingBalance" DECIMAL(30,8) NOT NULL DEFAULT 0,
    "reservedBalance" DECIMAL(30,8) NOT NULL DEFAULT 0,
    "ledgerVersion" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VirtualAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerCustomerCode" TEXT,
    "providerReference" TEXT,
    "accountNumber" TEXT,
    "accountName" TEXT,
    "bankName" TEXT,
    "bankCode" TEXT,
    "status" "VirtualAccountStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VirtualAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerTransaction" (
    "id" TEXT NOT NULL,
    "externalReference" VARCHAR(128),
    "idempotencyKey" VARCHAR(128),
    "type" "LedgerTransactionType" NOT NULL,
    "status" "LedgerTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "description" VARCHAR(255) NOT NULL,
    "currency" "WalletCurrency" NOT NULL,
    "amount" DECIMAL(30,8) NOT NULL,
    "metadata" JSONB,
    "initiatedByUserId" TEXT,
    "postedAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "direction" "LedgerEntryDirection" NOT NULL,
    "accountType" "LedgerAccountType" NOT NULL,
    "debitWalletId" TEXT,
    "creditWalletId" TEXT,
    "amount" DECIMAL(30,8) NOT NULL,
    "runningBalanceSnapshot" DECIMAL(30,8),
    "narration" VARCHAR(255),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerEventId" TEXT,
    "providerReference" TEXT,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookEventStatus" NOT NULL,
    "processedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
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

-- CreateTable
CREATE TABLE "SavingsPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "SavingsType" NOT NULL,
    "status" "SavingsStatus" NOT NULL,
    "targetAmount" DECIMAL(30,8),
    "currentAmount" DECIMAL(30,8) NOT NULL DEFAULT 0,
    "cancelReason" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "unlockDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavingsPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsTransaction" (
    "id" TEXT NOT NULL,
    "savingsPlanId" TEXT NOT NULL,
    "type" "SavingsTransactionType" NOT NULL,
    "amount" DECIMAL(30,8) NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavingsTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_finxTag_key" ON "User"("finxTag");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshTokenHash_key" ON "Session"("refreshTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Session_replacedBySessionId_key" ON "Session"("replacedBySessionId");

-- CreateIndex
CREATE INDEX "Session_userId_revokedAt_idx" ON "Session"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "Session_expiresAt_revokedAt_idx" ON "Session"("expiresAt", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_usedAt_idx" ON "PasswordResetToken"("expiresAt", "usedAt");

-- CreateIndex
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "Wallet_currency_type_idx" ON "Wallet"("currency", "type");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_user_currency_type_unique" ON "Wallet"("userId", "currency", "type");

-- CreateIndex
CREATE INDEX "VirtualAccount_userId_idx" ON "VirtualAccount"("userId");

-- CreateIndex
CREATE INDEX "VirtualAccount_providerCustomerCode_idx" ON "VirtualAccount"("providerCustomerCode");

-- CreateIndex
CREATE UNIQUE INDEX "VirtualAccount_provider_accountNumber_key" ON "VirtualAccount"("provider", "accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "VirtualAccount_userId_provider_key" ON "VirtualAccount"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerTransaction_externalReference_key" ON "LedgerTransaction"("externalReference");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerTransaction_idempotencyKey_key" ON "LedgerTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "LedgerTransaction_status_createdAt_idx" ON "LedgerTransaction"("status", "createdAt");

-- CreateIndex
CREATE INDEX "LedgerTransaction_type_createdAt_idx" ON "LedgerTransaction"("type", "createdAt");

-- CreateIndex
CREATE INDEX "LedgerTransaction_initiatedByUserId_idx" ON "LedgerTransaction"("initiatedByUserId");

-- CreateIndex
CREATE INDEX "LedgerTransaction_currency_createdAt_idx" ON "LedgerTransaction"("currency", "createdAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_transactionId_idx" ON "LedgerEntry"("transactionId");

-- CreateIndex
CREATE INDEX "LedgerEntry_debitWalletId_idx" ON "LedgerEntry"("debitWalletId");

-- CreateIndex
CREATE INDEX "LedgerEntry_creditWalletId_idx" ON "LedgerEntry"("creditWalletId");

-- CreateIndex
CREATE INDEX "LedgerEntry_direction_createdAt_idx" ON "LedgerEntry"("direction", "createdAt");

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

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_providerEventId_key" ON "WebhookEvent"("providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "KycProfile_userId_key" ON "KycProfile"("userId");

-- CreateIndex
CREATE INDEX "KycProfile_status_idx" ON "KycProfile"("status");

-- CreateIndex
CREATE INDEX "KycVerification_userId_type_idx" ON "KycVerification"("userId", "type");

-- CreateIndex
CREATE INDEX "KycVerification_status_createdAt_idx" ON "KycVerification"("status", "createdAt");

-- CreateIndex
CREATE INDEX "KycVerification_kycProfileId_idx" ON "KycVerification"("kycProfileId");

-- CreateIndex
CREATE INDEX "SavingsPlan_userId_id_idx" ON "SavingsPlan"("userId", "id");

-- CreateIndex
CREATE INDEX "SavingsPlan_walletId_idx" ON "SavingsPlan"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "SavingsPlan_userId_id_key" ON "SavingsPlan"("userId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "SavingsTransaction_reference_key" ON "SavingsTransaction"("reference");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_replacedBySessionId_fkey" FOREIGN KEY ("replacedBySessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VirtualAccount" ADD CONSTRAINT "VirtualAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_initiatedByUserId_fkey" FOREIGN KEY ("initiatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "LedgerTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_debitWalletId_fkey" FOREIGN KEY ("debitWalletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_creditWalletId_fkey" FOREIGN KEY ("creditWalletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_ledgerTransactionId_fkey" FOREIGN KEY ("ledgerTransactionId") REFERENCES "LedgerTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycProfile" ADD CONSTRAINT "KycProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycVerification" ADD CONSTRAINT "KycVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycVerification" ADD CONSTRAINT "KycVerification_kycProfileId_fkey" FOREIGN KEY ("kycProfileId") REFERENCES "KycProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsPlan" ADD CONSTRAINT "SavingsPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsPlan" ADD CONSTRAINT "SavingsPlan_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsTransaction" ADD CONSTRAINT "SavingsTransaction_savingsPlanId_fkey" FOREIGN KEY ("savingsPlanId") REFERENCES "SavingsPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
