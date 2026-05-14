import {
  InvestmentPlanStatus,
  LedgerAccountType,
  LedgerEntryDirection,
  LedgerTransactionStatus,
  LedgerTransactionType,
  Prisma,
  PrismaClient,
  WalletCurrency,
  WalletType
} from '@prisma/client';
import { AppError } from '../../utils/ErrorHandler';
import type { IInvestmentStrategy } from './external/interface/IInvestmentStrategy';
import type { SubscribeInput } from './http/invest.schema';

type TransactionClient = Prisma.TransactionClient;

export class InvestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async createSubscription(userId: string, input: SubscribeInput, strategy: IInvestmentStrategy, reference: string) {
    const amount = new Prisma.Decimal(input.amount);
    const now = new Date();
    const maturityAt = strategy.getMaturityDate(now);
    const expectedReturnAmount = strategy.lockPeriodDays ? strategy.calculateInterest(amount, strategy.lockPeriodDays) : new Prisma.Decimal(0);

    return this.prisma.$transaction(async (transaction) => {
      const wallet = await this.getWalletForTransaction(transaction, userId, WalletCurrency.NGN);

      const debitResult = await transaction.wallet.updateMany({
        where: {
          id: wallet.id,
          availableBalance: {
            gte: amount
          },
          isActive: true
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
        where: {
          id: wallet.id
        }
      });

      const investment = await transaction.investmentPlan.create({
        data: {
          userId,
          walletId: wallet.id,
          type: strategy.planType,
          status: InvestmentPlanStatus.ACTIVE,
          principalAmount: amount,
          expectedReturnAmount,
          interestRate: strategy.apy,
          durationDays: strategy.lockPeriodDays,
          accrualStartAt: now,
          maturityAt,
          lastAccruedAt: now,
          metadata: {
            planKey: strategy.key,
            payoutFrequency: strategy.payoutFrequency
          }
        }
      });

      const ledgerTransaction = await transaction.ledgerTransaction.create({
        data: {
          externalReference: reference,
          type: LedgerTransactionType.INVESTMENT_FUNDING,
          status: LedgerTransactionStatus.POSTED,
          description: `Investment funding for ${strategy.name}`,
          currency: WalletCurrency.NGN,
          amount,
          initiatedByUserId: userId,
          postedAt: now,
          metadata: {
            investmentPlanId: investment.id,
            planKey: strategy.key
          },
          entries: {
            create: [
              {
                direction: LedgerEntryDirection.DEBIT,
                accountType: LedgerAccountType.LIABILITY,
                debitWalletId: wallet.id,
                amount,
                runningBalanceSnapshot: updatedWallet.availableBalance,
                narration: `Investment subscription for ${strategy.name}`
              },
              {
                direction: LedgerEntryDirection.CREDIT,
                accountType: LedgerAccountType.LIABILITY,
                amount,
                narration: `Investment pool credit for ${strategy.name}`,
                metadata: {
                  investmentPool: true,
                  planKey: strategy.key
                }
              }
            ]
          }
        },
        include: {
          entries: true
        }
      });

      return {
        investment,
        wallet: updatedWallet,
        ledgerTransaction
      };
    });
  }

  public async getUserPortfolio(userId: string, status?: InvestmentPlanStatus) {
    return this.prisma.investmentPlan.findMany({
      where: {
        userId,
        ...(status ? { status } : {})
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  public async findInvestmentByIdForUser(userId: string, investmentId: string) {
    return this.prisma.investmentPlan.findFirst({
      where: {
        id: investmentId,
        userId
      }
    });
  }

  public async withdrawInvestment(userId: string, investmentId: string, strategy: IInvestmentStrategy, reference: string) {
    return this.prisma.$transaction(async (transaction) => {
      const investment = await transaction.investmentPlan.findFirst({
        where: {
          id: investmentId,
          userId,
          status: InvestmentPlanStatus.ACTIVE
        }
      });

      if (!investment) {
        throw AppError.notFound('Investment not found.');
      }

      if (!investment.accrualStartAt || !strategy.canWithdraw(investment.accrualStartAt)) {
        throw AppError.forbidden('This investment cannot be withdrawn yet.');
      }

      const wallet = await this.getWalletForTransaction(transaction, userId, WalletCurrency.NGN);
      const now = new Date();
      const accruedInterest = this.calculateAccruedInterest(strategy, investment.principalAmount, investment.lastAccruedAt, now);
      const totalPayout = investment.principalAmount.plus(accruedInterest);

      const updatedWallet = await transaction.wallet.update({
        where: {
          id: wallet.id
        },
        data: {
          availableBalance: {
            increment: totalPayout
          },
          ledgerVersion: {
            increment: 1
          }
        }
      });

      const updatedInvestment = await transaction.investmentPlan.update({
        where: {
          id: investment.id
        },
        data: {
          status: InvestmentPlanStatus.MATURED,
          lastAccruedAt: now
        }
      });

      const ledgerTransaction = await transaction.ledgerTransaction.create({
        data: {
          externalReference: reference,
          type: LedgerTransactionType.INVESTMENT_PAYOUT,
          status: LedgerTransactionStatus.POSTED,
          description: `Investment withdrawal for ${strategy.name}`,
          currency: WalletCurrency.NGN,
          amount: totalPayout,
          initiatedByUserId: userId,
          postedAt: now,
          metadata: {
            investmentPlanId: investment.id,
            principalAmount: investment.principalAmount.toString(),
            interestAmount: accruedInterest.toString()
          },
          entries: {
            create: [
              {
                direction: LedgerEntryDirection.CREDIT,
                accountType: LedgerAccountType.LIABILITY,
                creditWalletId: wallet.id,
                amount: totalPayout,
                runningBalanceSnapshot: updatedWallet.availableBalance,
                narration: `Investment withdrawal credit for ${strategy.name}`
              },
              {
                direction: LedgerEntryDirection.DEBIT,
                accountType: LedgerAccountType.LIABILITY,
                amount: totalPayout,
                narration: `Investment pool debit for ${strategy.name}`,
                metadata: {
                  investmentPool: true,
                  planKey: strategy.key
                }
              }
            ]
          }
        }
      });

      return {
        investment: updatedInvestment,
        wallet: updatedWallet,
        ledgerTransaction,
        accruedInterest
      };
    });
  }

  public async getActiveInvestmentsForPayout() {
    return this.prisma.investmentPlan.findMany({
      where: {
        status: InvestmentPlanStatus.ACTIVE
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
  }

  public async creditInvestmentPayout(
    investmentId: string,
    strategy: IInvestmentStrategy,
    payoutAmount: Prisma.Decimal,
    reference: string,
    options?: {
      includePrincipal?: boolean;
      markMatured?: boolean;
    }
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const investment = await transaction.investmentPlan.findUnique({
        where: {
          id: investmentId
        }
      });

      if (!investment || investment.status !== InvestmentPlanStatus.ACTIVE) {
        throw AppError.notFound('Investment not found.');
      }

      const wallet = await this.getWalletForTransaction(transaction, investment.userId, WalletCurrency.NGN);
      const principalComponent = options?.includePrincipal ? investment.principalAmount : new Prisma.Decimal(0);
      const totalCredit = payoutAmount.plus(principalComponent);
      const now = new Date();

      const updatedWallet = await transaction.wallet.update({
        where: {
          id: wallet.id
        },
        data: {
          availableBalance: {
            increment: totalCredit
          },
          ledgerVersion: {
            increment: 1
          }
        }
      });

      const updatedInvestment = await transaction.investmentPlan.update({
        where: {
          id: investment.id
        },
        data: {
          lastAccruedAt: now,
          ...(options?.markMatured
            ? {
                status: InvestmentPlanStatus.MATURED
              }
            : {})
        }
      });

      const ledgerTransaction = await transaction.ledgerTransaction.create({
        data: {
          externalReference: reference,
          type: options?.includePrincipal ? LedgerTransactionType.INVESTMENT_PAYOUT : LedgerTransactionType.INVESTMENT_INTEREST,
          status: LedgerTransactionStatus.POSTED,
          description: options?.includePrincipal
            ? `Investment maturity payout for ${strategy.name}`
            : `Investment interest payout for ${strategy.name}`,
          currency: WalletCurrency.NGN,
          amount: totalCredit,
          initiatedByUserId: investment.userId,
          postedAt: now,
          metadata: {
            investmentPlanId: investment.id,
            interestAmount: payoutAmount.toString(),
            principalAmount: principalComponent.toString(),
            planKey: strategy.key
          },
          entries: {
            create: [
              {
                direction: LedgerEntryDirection.CREDIT,
                accountType: LedgerAccountType.LIABILITY,
                creditWalletId: wallet.id,
                amount: totalCredit,
                runningBalanceSnapshot: updatedWallet.availableBalance,
                narration: options?.includePrincipal ? `Maturity payout credit for ${strategy.name}` : `Interest payout credit for ${strategy.name}`
              },
              {
                direction: LedgerEntryDirection.DEBIT,
                accountType: LedgerAccountType.LIABILITY,
                amount: totalCredit,
                narration: options?.includePrincipal
                  ? `Investment pool maturity debit for ${strategy.name}`
                  : `Investment pool interest debit for ${strategy.name}`,
                metadata: {
                  investmentPool: true,
                  planKey: strategy.key
                }
              }
            ]
          }
        }
      });

      return {
        investment: updatedInvestment,
        wallet: updatedWallet,
        ledgerTransaction
      };
    });
  }

  private async getWalletForTransaction(transaction: TransactionClient, userId: string, currency: WalletCurrency) {
    const wallet = await transaction.wallet.findFirst({
      where: {
        userId,
        currency,
        type: WalletType.FIAT,
        isActive: true
      }
    });

    if (!wallet) {
      throw AppError.notFound('Wallet not found.');
    }

    return wallet;
  }

  private calculateAccruedInterest(
    strategy: IInvestmentStrategy,
    principalAmount: Prisma.Decimal,
    lastAccruedAt: Date | null,
    now: Date
  ): Prisma.Decimal {
    if (!lastAccruedAt) {
      return new Prisma.Decimal(0);
    }

    const elapsedDays = Math.max(0, Math.floor((now.getTime() - lastAccruedAt.getTime()) / (24 * 60 * 60 * 1000)));

    if (elapsedDays === 0) {
      return new Prisma.Decimal(0);
    }

    return strategy.calculateInterest(principalAmount, elapsedDays);
  }
}
