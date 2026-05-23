import {
  LedgerAccountType,
  LedgerEntryDirection,
  LedgerTransactionStatus,
  LedgerTransactionType,
  PaymentDirection,
  PaymentEventType,
  PaymentProvider,
  PaymentStatus,
  PaymentType,
  Prisma,
  PrismaClient,
  WalletCurrency,
  WalletType
} from '@prisma/client';
import { AppError } from '../../utils/ErrorHandler';
import type { BalanceQueryInput, DepositInput, TransactionsQueryInput, TransferInput, WithdrawInput } from './http/wallet-mock.schema';

type TransactionClient = Prisma.TransactionClient;

export class WalletMockRpository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findUserWalletByUserId(userId: string, currency: WalletCurrency = WalletCurrency.NGN) {
    return this.prisma.wallet.findFirst({
      where: {
        userId,
        currency,
        type: WalletType.FIAT,
        isActive: true
      }
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
          deletedAt: null
        }
      },
      include: {
        user: true
      }
    });
  }

  public async getBalanceWithRecentActivity(userId: string, input: BalanceQueryInput) {
    const wallet = await this.findUserWalletByUserId(userId, input.currency as WalletCurrency);

    if (!wallet) {
      throw AppError.notFound('Wallet not found.');
    }

    const recentActivity = await this.prisma.ledgerTransaction.findMany({
      where: {
        currency: input.currency as WalletCurrency,
        entries: {
          some: {
            OR: [{ debitWalletId: wallet.id }, { creditWalletId: wallet.id }]
          }
        }
      },
      include: {
        entries: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: input.activityLimit
    });

    return {
      wallet,
      recentActivity
    };
  }

  public async getTransactionHistory(userId: string, input: TransactionsQueryInput) {
    const wallets = await this.prisma.wallet.findMany({
      where: {
        userId,
        isActive: true
      },
      select: {
        id: true
      }
    });

    const walletIds = wallets.map((wallet) => wallet.id);

    const where: Prisma.LedgerTransactionWhereInput = {
      ...(input.currency
        ? {
            currency: input.currency as WalletCurrency
          }
        : {}),
      entries: {
        some: {
          OR: [{ debitWalletId: { in: walletIds } }, { creditWalletId: { in: walletIds } }]
        }
      }
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.ledgerTransaction.findMany({
        where,
        include: {
          entries: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (input.page - 1) * input.limit,
        take: input.limit
      }),
      this.prisma.ledgerTransaction.count({ where })
    ]);

    return {
      items,
      total
    };
  }

  public async executeP2PTransfer(senderUserId: string, input: TransferInput, reference: string) {
    const amount = new Prisma.Decimal(input.amount);

    return this.prisma.$transaction(async (transaction) => {
      const senderWallet = await this.getWalletForTransaction(transaction, {
        userId: senderUserId,
        currency: input.currency as WalletCurrency
      });

      const receiverWallet = await transaction.wallet.findFirst({
        where: {
          currency: input.currency as WalletCurrency,
          type: WalletType.FIAT,
          isActive: true,
          user: {
            finxTag: input.finxTag,
            deletedAt: null
          }
        },
        include: {
          user: true
        }
      });

      if (!receiverWallet) {
        throw AppError.notFound('Receiver wallet not found.');
      }

      const debitResult = await transaction.wallet.updateMany({
        where: {
          id: senderWallet.id,
          isActive: true,
          availableBalance: {
            gte: amount
          }
        },
        data: {
          availableBalance: {
            decrement: amount
          },
          ledgerVersion: {
            increment: 1
          }
        }
      });

      if (debitResult.count !== 1) {
        throw new AppError('Insufficient funds.', 409, {
          code: 'INSUFFICIENT_FUNDS'
        });
      }

      await transaction.wallet.update({
        where: {
          id: receiverWallet.id
        },
        data: {
          availableBalance: {
            increment: amount
          },
          ledgerVersion: {
            increment: 1
          }
        }
      });

      const [updatedSenderWallet, updatedReceiverWallet] = await Promise.all([
        transaction.wallet.findUniqueOrThrow({
          where: { id: senderWallet.id }
        }),
        transaction.wallet.findUniqueOrThrow({
          where: { id: receiverWallet.id }
        })
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
                narration: input.narration ?? `Debit for transfer to @${input.finxTag}`
              },
              {
                direction: LedgerEntryDirection.CREDIT,
                accountType: LedgerAccountType.LIABILITY,
                creditWalletId: receiverWallet.id,
                amount,
                runningBalanceSnapshot: updatedReceiverWallet.availableBalance,
                narration: input.narration ?? `Credit from @${senderWallet.userId}`
              }
            ]
          }
        },
        include: {
          entries: true
        }
      });

      return {
        senderWallet: updatedSenderWallet,
        receiverWallet: updatedReceiverWallet,
        ledgerTransaction,
        receiverUser: receiverWallet.user
      };
    });
  }

  /**
   * MOCK: Creates a deposit payment intent and immediately funds the wallet.
   * No external provider is called. Money is created from thin air for testing.
   */
  public async createFiatDepositIntent(input: {
    userId: string;
    walletId: string;
    email: string;
    body: DepositInput;
    reference: string;
    idempotencyKey?: string | undefined;
  }) {
    return this.prisma.$transaction(async (transaction) => {
      if (input.idempotencyKey) {
        const existingIntent = await transaction.paymentIntent.findUnique({
          where: {
            idempotencyKey: input.idempotencyKey
          }
        });

        if (existingIntent) {
          return {
            paymentIntent: existingIntent,
            reused: true
          };
        }
      }

      const paymentIntent = await transaction.paymentIntent.create({
        data: {
          userId: input.userId,
          walletId: input.walletId,
          provider: PaymentProvider.MOCK,
          direction: PaymentDirection.INBOUND,
          type: PaymentType.FIAT_DEPOSIT,
          status: PaymentStatus.INITIATED,
          reference: input.reference,
          idempotencyKey: input.idempotencyKey ?? null,
          amount: new Prisma.Decimal(input.body.amount),
          currency: input.body.currency as WalletCurrency,
          email: input.email,
          callbackUrl: null,
          metadata: {
            userId: input.userId,
            walletId: input.walletId
          },
          events: {
            create: {
              eventType: PaymentEventType.CREATED,
              toStatus: PaymentStatus.INITIATED,
              idempotencyKey: input.idempotencyKey ?? null
            }
          }
        }
      });

      return {
        paymentIntent,
        reused: false
      };
    });
  }

  /**
   * MOCK: Instantly posts a successful deposit directly — no provider verification needed.
   * Funds the wallet immediately upon calling.
   */
  public async postMockFiatDeposit(reference: string) {
    return this.prisma.$transaction(async (transaction) => {
      const paymentIntent = await this.lockPaymentIntent(transaction, reference);

      if (!paymentIntent) {
        throw AppError.notFound('Payment intent not found.');
      }

      if (paymentIntent.status === PaymentStatus.SUCCEEDED) {
        const existingPaymentIntent = await transaction.paymentIntent.findUniqueOrThrow({
          where: { id: paymentIntent.id },
          include: { ledgerTransaction: true }
        });
        const existingWallet = await transaction.wallet.findUniqueOrThrow({
          where: { id: paymentIntent.walletId }
        });

        return {
          paymentIntent: existingPaymentIntent,
          wallet: existingWallet,
          ledgerTransaction: existingPaymentIntent.ledgerTransaction
        };
      }

      //   assertPaymentTransition(paymentIntent.status, PaymentStatus.SUCCEEDED);
      await this.lockWallet(transaction, paymentIntent.walletId);

      const creditResult = await transaction.wallet.updateMany({
        where: {
          id: paymentIntent.walletId,
          isActive: true
        },
        data: {
          availableBalance: {
            increment: paymentIntent.amount
          },
          ledgerVersion: {
            increment: 1
          }
        }
      });

      if (creditResult.count !== 1) {
        throw AppError.notFound('Wallet not found.');
      }

      const updatedWallet = await transaction.wallet.findUniqueOrThrow({
        where: { id: paymentIntent.walletId }
      });

      const ledgerTransaction = await transaction.ledgerTransaction.create({
        data: {
          externalReference: paymentIntent.reference,
          idempotencyKey: paymentIntent.idempotencyKey,
          type: LedgerTransactionType.DEPOSIT,
          status: LedgerTransactionStatus.POSTED,
          description: `Mock deposit ${paymentIntent.reference}`,
          currency: paymentIntent.currency,
          amount: paymentIntent.amount,
          initiatedByUserId: paymentIntent.userId,
          postedAt: new Date(),
          metadata: this.toJson({
            provider: 'mock',
            note: 'Simulated deposit — no real provider involved'
          }),
          entries: {
            create: [
              {
                direction: LedgerEntryDirection.DEBIT,
                accountType: LedgerAccountType.ASSET,
                amount: paymentIntent.amount,
                narration: `Mock settlement receivable for ${paymentIntent.reference}`
              },
              {
                direction: LedgerEntryDirection.CREDIT,
                accountType: LedgerAccountType.LIABILITY,
                creditWalletId: paymentIntent.walletId,
                amount: paymentIntent.amount,
                runningBalanceSnapshot: updatedWallet.availableBalance,
                narration: `Wallet funded via mock deposit`
              }
            ]
          }
        }
      });

      const updatedPaymentIntent = await transaction.paymentIntent.update({
        where: { id: paymentIntent.id },
        data: {
          status: PaymentStatus.SUCCEEDED,
          ledgerTransactionId: ledgerTransaction.id,
          providerTransactionId: null,
          providerStatus: 'success',
          gatewayResponse: 'Approved',
          processedAt: new Date(),
          providerPayload: this.toJson({ mock: true, reference: paymentIntent.reference }),
          version: { increment: 1 },
          events: {
            create: [
              {
                eventType: PaymentEventType.PROVIDER_VERIFIED,
                fromStatus: paymentIntent.status,
                toStatus: PaymentStatus.SUCCEEDED,
                providerReference: paymentIntent.reference,
                payload: this.toJson({ mock: true })
              },
              {
                eventType: PaymentEventType.LEDGER_POSTED,
                toStatus: PaymentStatus.SUCCEEDED,
                providerReference: paymentIntent.reference,
                payload: { ledgerTransactionId: ledgerTransaction.id }
              },
              {
                eventType: PaymentEventType.STATE_TRANSITION,
                fromStatus: paymentIntent.status,
                toStatus: PaymentStatus.SUCCEEDED
              }
            ]
          }
        }
      });

      return {
        paymentIntent: updatedPaymentIntent,
        wallet: updatedWallet,
        ledgerTransaction
      };
    });
  }

  public async markPaymentFailed(reference: string, reason: string, payload?: unknown) {
    return this.prisma.$transaction(async (transaction) => {
      const paymentIntent = await transaction.paymentIntent.findUnique({
        where: { reference }
      });

      if (!paymentIntent || paymentIntent.status === PaymentStatus.FAILED) {
        return paymentIntent;
      }

      //   assertPaymentTransition(paymentIntent.status, PaymentStatus.FAILED);

      return transaction.paymentIntent.update({
        where: { id: paymentIntent.id },
        data: {
          status: PaymentStatus.FAILED,
          failedAt: new Date(),
          failureReason: reason,
          providerPayload: payload === undefined ? Prisma.JsonNull : this.toJson(payload),
          version: { increment: 1 },
          events: {
            create: [
              {
                eventType: PaymentEventType.PROVIDER_FAILED,
                fromStatus: paymentIntent.status,
                toStatus: PaymentStatus.FAILED,
                payload: payload === undefined ? Prisma.JsonNull : this.toJson(payload)
              },
              {
                eventType: PaymentEventType.STATE_TRANSITION,
                fromStatus: paymentIntent.status,
                toStatus: PaymentStatus.FAILED
              }
            ]
          }
        }
      });
    });
  }

  public async findPaymentIntentForUser(userId: string, reference: string) {
    return this.prisma.paymentIntent.findFirst({
      where: {
        userId,
        reference
      },
      include: {
        ledgerTransaction: true
      }
    });
  }

  public async findPaymentIntentByReference(reference: string) {
    return this.prisma.paymentIntent.findFirst({
      where: {
        OR: [{ reference }, { providerReference: reference }]
      }
    });
  }

  public async recordFiatWithdrawal(userId: string, input: WithdrawInput, reference: string, providerName: string) {
    const amount = new Prisma.Decimal(input.amount);

    return this.prisma.$transaction(async (transaction) => {
      const wallet = await this.getWalletForTransaction(transaction, {
        userId,
        currency: input.currency as WalletCurrency
      });

      const debitResult = await transaction.wallet.updateMany({
        where: {
          id: wallet.id,
          isActive: true,
          availableBalance: {
            gte: amount
          }
        },
        data: {
          availableBalance: {
            decrement: amount
          },
          ledgerVersion: {
            increment: 1
          }
        }
      });

      if (debitResult.count !== 1) {
        throw new AppError('Insufficient funds.', 409, {
          code: 'INSUFFICIENT_FUNDS'
        });
      }

      const updatedWallet = await transaction.wallet.findUniqueOrThrow({
        where: { id: wallet.id }
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
            accountName: input.accountName
          },
          entries: {
            create: [
              {
                direction: LedgerEntryDirection.DEBIT,
                accountType: LedgerAccountType.LIABILITY,
                debitWalletId: wallet.id,
                amount,
                runningBalanceSnapshot: updatedWallet.availableBalance,
                narration: input.narration ?? `Withdrawal to ${input.accountNumber}`
              }
            ]
          }
        },
        include: {
          entries: true
        }
      });

      return {
        wallet: updatedWallet,
        ledgerTransaction
      };
    });
  }

  public async reserveFiatWithdrawal(input: { userId: string; body: WithdrawInput; reference: string; idempotencyKey?: string | undefined }) {
    const amount = new Prisma.Decimal(input.body.amount);

    return this.prisma.$transaction(async (transaction) => {
      if (input.idempotencyKey) {
        const existingIntent = await transaction.paymentIntent.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          include: { wallet: true }
        });

        if (existingIntent) {
          return {
            paymentIntent: existingIntent,
            wallet: existingIntent.wallet,
            reused: true
          };
        }
      }

      const wallet = await this.getWalletForTransaction(transaction, {
        userId: input.userId,
        currency: input.body.currency as WalletCurrency
      });

      await this.lockWallet(transaction, wallet.id);

      const reserveResult = await transaction.wallet.updateMany({
        where: {
          id: wallet.id,
          isActive: true,
          availableBalance: {
            gte: amount
          }
        },
        data: {
          availableBalance: {
            decrement: amount
          },
          reservedBalance: {
            increment: amount
          },
          ledgerVersion: {
            increment: 1
          }
        }
      });

      if (reserveResult.count !== 1) {
        throw new AppError('Insufficient funds.', 409, {
          code: 'INSUFFICIENT_FUNDS'
        });
      }

      const updatedWallet = await transaction.wallet.findUniqueOrThrow({
        where: { id: wallet.id }
      });

      const paymentIntent = await transaction.paymentIntent.create({
        data: {
          userId: input.userId,
          walletId: wallet.id,
          provider: 'MOCK' as any,
          direction: PaymentDirection.OUTBOUND,
          type: PaymentType.FIAT_WITHDRAWAL,
          status: PaymentStatus.PROCESSING,
          reference: input.reference,
          idempotencyKey: input.idempotencyKey ?? null,
          amount,
          currency: input.body.currency as WalletCurrency,
          metadata: this.toJson({
            bankCode: input.body.bankCode,
            accountNumber: input.body.accountNumber,
            accountName: input.body.accountName,
            narration: input.body.narration
          }),
          events: {
            create: [
              {
                eventType: PaymentEventType.CREATED,
                toStatus: PaymentStatus.PROCESSING,
                idempotencyKey: input.idempotencyKey ?? null
              },
              {
                eventType: PaymentEventType.STATE_TRANSITION,
                fromStatus: PaymentStatus.INITIATED,
                toStatus: PaymentStatus.PROCESSING
              }
            ]
          }
        }
      });

      return {
        paymentIntent,
        wallet: updatedWallet,
        reused: false
      };
    });
  }

  public async settleSuccessfulFiatWithdrawal(reference: string, payload?: unknown) {
    return this.prisma.$transaction(async (transaction) => {
      const paymentIntent = await this.lockPaymentIntent(transaction, reference);

      if (!paymentIntent) {
        throw AppError.notFound('Payment intent not found.');
      }

      if (paymentIntent.status === PaymentStatus.SUCCEEDED) {
        const existingPaymentIntent = await transaction.paymentIntent.findUniqueOrThrow({
          where: { id: paymentIntent.id },
          include: { ledgerTransaction: true }
        });
        const existingWallet = await transaction.wallet.findUniqueOrThrow({
          where: { id: paymentIntent.walletId }
        });

        return {
          paymentIntent: existingPaymentIntent,
          wallet: existingWallet,
          ledgerTransaction: existingPaymentIntent.ledgerTransaction
        };
      }

      //   assertPaymentTransition(paymentIntent.status, PaymentStatus.SUCCEEDED);
      await this.lockWallet(transaction, paymentIntent.walletId);

      const settleResult = await transaction.wallet.updateMany({
        where: {
          id: paymentIntent.walletId,
          reservedBalance: {
            gte: paymentIntent.amount
          }
        },
        data: {
          reservedBalance: {
            decrement: paymentIntent.amount
          },
          ledgerVersion: {
            increment: 1
          }
        }
      });

      if (settleResult.count !== 1) {
        throw new AppError('Reserved funds are not available for settlement.', 409, {
          code: 'RESERVED_FUNDS_NOT_AVAILABLE'
        });
      }

      const updatedWallet = await transaction.wallet.findUniqueOrThrow({
        where: { id: paymentIntent.walletId }
      });

      const ledgerTransaction = await transaction.ledgerTransaction.create({
        data: {
          externalReference: paymentIntent.reference,
          idempotencyKey: paymentIntent.idempotencyKey,
          type: LedgerTransactionType.WITHDRAWAL,
          status: LedgerTransactionStatus.POSTED,
          description: `Mock withdrawal ${paymentIntent.reference}`,
          currency: paymentIntent.currency,
          amount: paymentIntent.amount,
          initiatedByUserId: paymentIntent.userId,
          postedAt: new Date(),
          metadata: this.toJson({
            provider: 'mock',
            providerReference: paymentIntent.providerReference,
            bank: paymentIntent.metadata
          }),
          entries: {
            create: [
              {
                direction: LedgerEntryDirection.DEBIT,
                accountType: LedgerAccountType.LIABILITY,
                debitWalletId: paymentIntent.walletId,
                amount: paymentIntent.amount,
                runningBalanceSnapshot: updatedWallet.availableBalance,
                narration: `Wallet withdrawal via mock`
              },
              {
                direction: LedgerEntryDirection.CREDIT,
                accountType: LedgerAccountType.ASSET,
                amount: paymentIntent.amount,
                narration: `Mock payout for ${paymentIntent.reference}`
              }
            ]
          }
        }
      });

      const updatedPaymentIntent = await transaction.paymentIntent.update({
        where: { id: paymentIntent.id },
        data: {
          status: PaymentStatus.SUCCEEDED,
          ledgerTransactionId: ledgerTransaction.id,
          processedAt: new Date(),
          providerPayload: payload === undefined ? Prisma.JsonNull : this.toJson(payload),
          version: { increment: 1 },
          events: {
            create: [
              {
                eventType: PaymentEventType.LEDGER_POSTED,
                fromStatus: paymentIntent.status,
                toStatus: PaymentStatus.SUCCEEDED,
                providerReference: paymentIntent.providerReference,
                payload: { ledgerTransactionId: ledgerTransaction.id }
              },
              {
                eventType: PaymentEventType.STATE_TRANSITION,
                fromStatus: paymentIntent.status,
                toStatus: PaymentStatus.SUCCEEDED
              }
            ]
          }
        }
      });

      return {
        paymentIntent: updatedPaymentIntent,
        wallet: updatedWallet,
        ledgerTransaction
      };
    });
  }

  public async releaseFailedFiatWithdrawal(reference: string, reason: string, payload?: unknown) {
    return this.prisma.$transaction(async (transaction) => {
      const paymentIntent = await this.lockPaymentIntent(transaction, reference);

      if (!paymentIntent) {
        throw AppError.notFound('Payment intent not found.');
      }

      if (paymentIntent.status === PaymentStatus.FAILED) {
        const existingPaymentIntent = await transaction.paymentIntent.findUniqueOrThrow({
          where: { id: paymentIntent.id }
        });
        const existingWallet = await transaction.wallet.findUniqueOrThrow({
          where: { id: paymentIntent.walletId }
        });

        return {
          paymentIntent: existingPaymentIntent,
          wallet: existingWallet
        };
      }

      //   assertPaymentTransition(paymentIntent.status, PaymentStatus.FAILED);
      await this.lockWallet(transaction, paymentIntent.walletId);

      await transaction.wallet.update({
        where: { id: paymentIntent.walletId },
        data: {
          availableBalance: {
            increment: paymentIntent.amount
          },
          reservedBalance: {
            decrement: paymentIntent.amount
          },
          ledgerVersion: {
            increment: 1
          }
        }
      });

      const updatedPaymentIntent = await transaction.paymentIntent.update({
        where: { id: paymentIntent.id },
        data: {
          status: PaymentStatus.FAILED,
          failedAt: new Date(),
          failureReason: reason,
          providerPayload: payload === undefined ? Prisma.JsonNull : this.toJson(payload),
          version: { increment: 1 },
          events: {
            create: [
              {
                eventType: PaymentEventType.PROVIDER_FAILED,
                fromStatus: paymentIntent.status,
                toStatus: PaymentStatus.FAILED,
                providerReference: paymentIntent.providerReference,
                payload: payload === undefined ? Prisma.JsonNull : this.toJson(payload)
              },
              {
                eventType: PaymentEventType.STATE_TRANSITION,
                fromStatus: paymentIntent.status,
                toStatus: PaymentStatus.FAILED
              }
            ]
          }
        }
      });

      const updatedWallet = await transaction.wallet.findUniqueOrThrow({
        where: { id: paymentIntent.walletId }
      });

      return {
        paymentIntent: updatedPaymentIntent,
        wallet: updatedWallet
      };
    });
  }

  private async getWalletForTransaction(
    transaction: TransactionClient,
    options: {
      userId: string;
      currency: WalletCurrency;
    }
  ) {
    const wallet = await transaction.wallet.findFirst({
      where: {
        userId: options.userId,
        currency: options.currency,
        type: WalletType.FIAT,
        isActive: true
      }
    });

    if (!wallet) {
      throw AppError.notFound('Wallet not found.');
    }

    return wallet;
  }

  private async lockPaymentIntent(transaction: TransactionClient, reference: string) {
    await transaction.$queryRaw<{ id: string }[]>`
      SELECT id FROM "PaymentIntent" WHERE reference = ${reference} FOR UPDATE
    `;

    return transaction.paymentIntent.findUnique({
      where: { reference }
    });
  }

  private async lockWallet(transaction: TransactionClient, walletId: string): Promise<void> {
    await transaction.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Wallet" WHERE id = ${walletId} FOR UPDATE
    `;
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(
      JSON.stringify(value, (_key, nestedValue: unknown) => (typeof nestedValue === 'bigint' ? nestedValue.toString() : nestedValue))
    ) as Prisma.InputJsonValue;
  }
}
