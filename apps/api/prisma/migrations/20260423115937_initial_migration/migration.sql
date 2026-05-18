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

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "phoneNumber" VARCHAR(32),
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
CREATE TABLE "InvestmentPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "InvestmentPlanType" NOT NULL,
    "status" "InvestmentPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "principalAmount" DECIMAL(30,8) NOT NULL,
    "expectedReturnAmount" DECIMAL(30,8) NOT NULL DEFAULT 0,
    "interestRate" DECIMAL(10,6) NOT NULL,
    "durationDays" INTEGER,
    "accrualStartAt" TIMESTAMP(3),
    "maturityAt" TIMESTAMP(3),
    "lastAccruedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentPlan_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "InvestmentPlan_userId_status_idx" ON "InvestmentPlan"("userId", "status");

-- CreateIndex
CREATE INDEX "InvestmentPlan_walletId_idx" ON "InvestmentPlan"("walletId");

-- CreateIndex
CREATE INDEX "InvestmentPlan_type_status_idx" ON "InvestmentPlan"("type", "status");

-- CreateIndex
CREATE INDEX "InvestmentPlan_maturityAt_idx" ON "InvestmentPlan"("maturityAt");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_initiatedByUserId_fkey" FOREIGN KEY ("initiatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "LedgerTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_debitWalletId_fkey" FOREIGN KEY ("debitWalletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_creditWalletId_fkey" FOREIGN KEY ("creditWalletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentPlan" ADD CONSTRAINT "InvestmentPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentPlan" ADD CONSTRAINT "InvestmentPlan_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
