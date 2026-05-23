import {
  SavingsType,
  SavingsTransactionType,
  SavingsStatus,
  Prisma,
  LedgerTransactionType,
  LedgerTransactionStatus,
  LedgerEntryDirection,
  LedgerAccountType
} from '@prisma/client';

import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/ErrorHandler';

interface CreateSavingsPlanInput {
  userId: string;
  walletId: string;
  name: string;
  type: SavingsType;
  description: string | null;
  targetAmount?: Prisma.Decimal;
  locked?: boolean;
  unlockDate?: Date;
}

export class SavingsRepository {
  async createPlan(input: CreateSavingsPlanInput) {
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: input.walletId,
        userId: input.userId
      }
    });

    if (!wallet) {
      throw AppError.badRequest('Wallet not found');
    }
    return prisma.savingsPlan.create({
      data: {
        userId: input.userId,
        walletId: input.walletId,
        name: input.name,
        description: input.description,
        type: input.type,
        locked: input.locked ?? false,
        status: SavingsStatus.ACTIVE,

        ...(input.targetAmount
          ? {
              targetAmount: input.targetAmount
            }
          : {}),

        ...(input.unlockDate
          ? {
              unlockDate: input.unlockDate
            }
          : {})
      }
    });
  }

  async findPlanById(userId : string , planId: string) {
    return prisma.savingsPlan.findUnique({
      where: {
        userId_id : {
          userId,
          id : planId
        }
      },

      include: {
        transactions: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
  }

  async getUserWalletId(userId: string) {
    return await prisma.wallet.findFirst({
      where: { userId },
      select: {
        id: true
      }
    });
  }

  async findUserPlans(userId: string) {
    return prisma.savingsPlan.findMany({
      where: {
        userId
      },

      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async depositIntoSavings(input: { userId: string; walletId: string; savingsPlanId: string; amount: Prisma.Decimal }) {
    return prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: {
          id: input.walletId
        }
      });

      if (!wallet) {
        throw AppError.badRequest('Wallet not found');
      }

      if (wallet.availableBalance.lessThan(input.amount)) {
        throw AppError.badRequest('Insufficient wallet balance');
      }

      const plan = await tx.savingsPlan.findUnique({
        where: {
          id: input.savingsPlanId
        }
      });

      if (!plan) {
        throw AppError.badRequest('Savings plan not found');
      }

      await tx.wallet.update({
        where: {
          id: input.walletId
        },

        data: {
          availableBalance: {
            decrement: input.amount
          }
        }
      });

      const updatedPlan = await tx.savingsPlan.update({
        where: {
          id: input.savingsPlanId
        },

        data: {
          currentAmount: {
            increment: input.amount
          }
        }
      });

      const ledgerTransaction = await tx.ledgerTransaction.create({
        data: {
          type: LedgerTransactionType.DEPOSIT,

          status: LedgerTransactionStatus.POSTED,

          description: `Savings funding for ${plan.name}`,

          currency: wallet.currency,

          amount: input.amount,

          initiatedByUserId: input.userId,

          postedAt: new Date(),

          metadata: {
            savingsPlanId: input.savingsPlanId
          }
        }
      });

      await tx.ledgerEntry.create({
        data: {
          transactionId: ledgerTransaction.id,

          direction: LedgerEntryDirection.DEBIT,

          accountType: LedgerAccountType.ASSET,

          debitWalletId: wallet.id,

          amount: input.amount,

          narration: 'Savings deposit',

          runningBalanceSnapshot: wallet.availableBalance.minus(input.amount),

          metadata: {
            savingsPlanId: input.savingsPlanId
          }
        }
      });

      await tx.savingsTransaction.create({
        data: {
          savingsPlanId: input.savingsPlanId,

          type: SavingsTransactionType.DEPOSIT,

          amount: input.amount,

          reference: `save_${crypto.randomUUID()}`,

          description: 'Savings deposit'
        }
      });

      return updatedPlan;
    });
  }

  async withdrawFromSavings(input: { userId: string; walletId: string; savingsPlanId: string; amount: Prisma.Decimal }) {
    return prisma.$transaction(async (tx) => {
      const plan = await tx.savingsPlan.findUnique({
        where: {
          id: input.savingsPlanId
        }
      });

      if (!plan) {
        throw AppError.badRequest('Savings plan not found');
      }

      if (plan.currentAmount.lessThan(input.amount)) {
        throw AppError.badRequest('Insufficient savings balance');
      }

      if (plan.locked && plan.unlockDate && plan.unlockDate > new Date()) {
        throw AppError.badRequest('Savings still locked');
      }

      const wallet = await tx.wallet.findUnique({
        where: {
          id: input.walletId
        }
      });

      if (!wallet) {
        throw AppError.badRequest('Wallet not found');
      }

      await tx.wallet.update({
        where: {
          id: input.walletId
        },

        data: {
          availableBalance: {
            increment: input.amount
          }
        }
      });

      const updatedPlan = await tx.savingsPlan.update({
        where: {
          id: input.savingsPlanId
        },

        data: {
          currentAmount: {
            decrement: input.amount
          }
        }
      });

      const ledgerTransaction = await tx.ledgerTransaction.create({
        data: {
          type: LedgerTransactionType.WITHDRAWAL,

          status: LedgerTransactionStatus.POSTED,

          description: `Savings withdrawal from ${plan.name}`,

          currency: wallet.currency,

          amount: input.amount,

          initiatedByUserId: input.userId,

          postedAt: new Date(),

          metadata: {
            savingsPlanId: input.savingsPlanId
          }
        }
      });

      await tx.ledgerEntry.create({
        data: {
          transactionId: ledgerTransaction.id,

          direction: LedgerEntryDirection.CREDIT,

          accountType: LedgerAccountType.ASSET,

          creditWalletId: wallet.id,

          amount: input.amount,

          narration: 'Savings withdrawal',

          runningBalanceSnapshot: wallet.availableBalance.plus(input.amount),

          metadata: {
            savingsPlanId: input.savingsPlanId
          }
        }
      });

      await tx.savingsTransaction.create({
        data: {
          savingsPlanId: input.savingsPlanId,

          type: SavingsTransactionType.WITHDRAWAL,

          amount: input.amount,

          reference: `save_${crypto.randomUUID()}`,

          description: 'Savings withdrawal'
        }
      });

      return updatedPlan;
    });
  }

  async getSavingsTransactions(planId: string) {
    return prisma.savingsTransaction.findMany({
      where: {
        savingsPlanId: planId
      },

      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async markPlanCompleted(planId: string) {
    return prisma.savingsPlan.update({
      where: {
        id: planId
      },

      data: {
        status: SavingsStatus.COMPLETED
      }
    });
  }

  async cancelPlan(planId: string, reason?: string) {
    return prisma.savingsPlan.update({
      where: {
        id: planId
      },

      data: {
        status: SavingsStatus.CANCELLED,
        cancelReason: reason ?? null
      }
    });
  }
}
