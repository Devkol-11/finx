import {
  LedgerAccountType,
  LedgerEntryDirection,
  LedgerTransactionStatus,
  LedgerTransactionType,
  Prisma,
  PrismaClient,
  WalletCurrency,
  WalletType,
} from "@prisma/client";
import { AppError } from "../../utils/ErrorHandler";
import type {
  BalanceQueryInput,
  TransactionsQueryInput,
  TransferInput,
  WithdrawInput,
} from "./http/wallet.schema";

type TransactionClient = Prisma.TransactionClient;

export class WalletRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findUserWalletByUserId(userId: string, currency: WalletCurrency = WalletCurrency.NGN) {
    return this.prisma.wallet.findFirst({
      where: {
        userId,
        currency,
        type: WalletType.FIAT,
        isActive: true,
      },
    });
  }

  public async findUserWalletByFinxTag(finxTag: string, currency: WalletCurrency = WalletCurrency.NGN) {
    return this.prisma.wallet.findFirst({
      where: {
        currency,
        type: WalletType.FIAT,
        isActive: true,
        user: {
          finxTag,
          deletedAt: null,
        },
      },
      include: {
        user: true,
      },
    });
  }

  public async getBalanceWithRecentActivity(userId: string, input: BalanceQueryInput) {
    const wallet = await this.findUserWalletByUserId(userId, input.currency as WalletCurrency);

    if (!wallet) {
      throw AppError.notFound("Wallet not found.");
    }

    const recentActivity = await this.prisma.ledgerTransaction.findMany({
      where: {
        currency: input.currency as WalletCurrency,
        entries: {
          some: {
            OR: [
              { debitWalletId: wallet.id },
              { creditWalletId: wallet.id },
            ],
          },
        },
      },
      include: {
        entries: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: input.activityLimit,
    });

    return {
      wallet,
      recentActivity,
    };
  }

  public async getTransactionHistory(userId: string, input: TransactionsQueryInput) {
    const wallets = await this.prisma.wallet.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    const walletIds = wallets.map((wallet) => wallet.id);

    const where: Prisma.LedgerTransactionWhereInput = {
      ...(input.currency
        ? {
            currency: input.currency as WalletCurrency,
          }
        : {}),
      entries: {
        some: {
          OR: [
            { debitWalletId: { in: walletIds } },
            { creditWalletId: { in: walletIds } },
          ],
        },
      },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.ledgerTransaction.findMany({
        where,
        include: {
          entries: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      }),
      this.prisma.ledgerTransaction.count({ where }),
    ]);

    return {
      items,
      total,
    };
  }

  public async executeP2PTransfer(senderUserId: string, input: TransferInput, reference: string) {
    const amount = new Prisma.Decimal(input.amount);

    return this.prisma.$transaction(async (transaction) => {
      const senderWallet = await this.getWalletForTransaction(transaction, {
        userId: senderUserId,
        currency: input.currency as WalletCurrency,
      });

      const receiverWallet = await transaction.wallet.findFirst({
        where: {
          currency: input.currency as WalletCurrency,
          type: WalletType.FIAT,
          isActive: true,
          user: {
            finxTag: input.finxTag,
            deletedAt: null,
          },
        },
        include: {
          user: true,
        },
      });

      if (!receiverWallet) {
        throw AppError.notFound("Receiver wallet not found.");
      }

      const debitResult = await transaction.wallet.updateMany({
        where: {
          id: senderWallet.id,
          isActive: true,
          availableBalance: {
            gte: amount,
          },
        },
        data: {
          availableBalance: {
            decrement: amount,
          },
          ledgerVersion: {
            increment: 1,
          },
        },
      });

      if (debitResult.count !== 1) {
        throw new AppError("Insufficient funds.", 409, {
          code: "INSUFFICIENT_FUNDS",
        });
      }

      await transaction.wallet.update({
        where: {
          id: receiverWallet.id,
        },
        data: {
          availableBalance: {
            increment: amount,
          },
          ledgerVersion: {
            increment: 1,
          },
        },
      });

      const [updatedSenderWallet, updatedReceiverWallet] = await Promise.all([
        transaction.wallet.findUniqueOrThrow({
          where: { id: senderWallet.id },
        }),
        transaction.wallet.findUniqueOrThrow({
          where: { id: receiverWallet.id },
        }),
      ]);

      const ledgerTransaction = await transaction.ledgerTransaction.create({
        data: {
          externalReference: reference,
          type: LedgerTransactionType.P2P_TRANSFER,
          status: LedgerTransactionStatus.POSTED,
          description: input.narration ?? `P2P transfer to @${input.finxTag}`,
          currency: input.currency as WalletCurrency,
          amount,
          initiatedByUserId: senderUserId,
          postedAt: new Date(),
          entries: {
            create: [
              {
                direction: LedgerEntryDirection.DEBIT,
                accountType: LedgerAccountType.LIABILITY,
                debitWalletId: senderWallet.id,
                amount,
                runningBalanceSnapshot: updatedSenderWallet.availableBalance,
                narration: input.narration ?? `Debit for transfer to @${input.finxTag}`,
              },
              {
                direction: LedgerEntryDirection.CREDIT,
                accountType: LedgerAccountType.LIABILITY,
                creditWalletId: receiverWallet.id,
                amount,
                runningBalanceSnapshot: updatedReceiverWallet.availableBalance,
                narration: input.narration ?? `Credit from @${senderWallet.userId}`,
              },
            ],
          },
        },
        include: {
          entries: true,
        },
      });

      return {
        senderWallet: updatedSenderWallet,
        receiverWallet: updatedReceiverWallet,
        ledgerTransaction,
        receiverUser: receiverWallet.user,
      };
    });
  }

  public async recordFiatWithdrawal(
    userId: string,
    input: WithdrawInput,
    reference: string,
    providerName: string,
  ) {
    const amount = new Prisma.Decimal(input.amount);

    return this.prisma.$transaction(async (transaction) => {
      const wallet = await this.getWalletForTransaction(transaction, {
        userId,
        currency: input.currency as WalletCurrency,
      });

      const debitResult = await transaction.wallet.updateMany({
        where: {
          id: wallet.id,
          isActive: true,
          availableBalance: {
            gte: amount,
          },
        },
        data: {
          availableBalance: {
            decrement: amount,
          },
          ledgerVersion: {
            increment: 1,
          },
        },
      });

      if (debitResult.count !== 1) {
        throw new AppError("Insufficient funds.", 409, {
          code: "INSUFFICIENT_FUNDS",
        });
      }

      const updatedWallet = await transaction.wallet.findUniqueOrThrow({
        where: {
          id: wallet.id,
        },
      });

      const ledgerTransaction = await transaction.ledgerTransaction.create({
        data: {
          externalReference: reference,
          type: LedgerTransactionType.WITHDRAWAL,
          status: LedgerTransactionStatus.POSTED,
          description: `${providerName} withdrawal to ${input.accountNumber}`,
          currency: input.currency as WalletCurrency,
          amount,
          initiatedByUserId: userId,
          postedAt: new Date(),
          metadata: {
            provider: providerName,
            bankCode: input.bankCode,
            accountNumber: input.accountNumber,
            accountName: input.accountName,
          },
          entries: {
            create: [
              {
                direction: LedgerEntryDirection.DEBIT,
                accountType: LedgerAccountType.LIABILITY,
                debitWalletId: wallet.id,
                amount,
                runningBalanceSnapshot: updatedWallet.availableBalance,
                narration: input.narration ?? `Withdrawal to ${input.accountNumber}`,
              },
            ],
          },
        },
        include: {
          entries: true,
        },
      });

      return {
        wallet: updatedWallet,
        ledgerTransaction,
      };
    });
  }

  private async getWalletForTransaction(
    transaction: TransactionClient,
    options: {
      userId: string;
      currency: WalletCurrency;
    },
  ) {
    const wallet = await transaction.wallet.findFirst({
      where: {
        userId: options.userId,
        currency: options.currency,
        type: WalletType.FIAT,
        isActive: true,
      },
    });

    if (!wallet) {
      throw AppError.notFound("Wallet not found.");
    }

    return wallet;
  }
}
