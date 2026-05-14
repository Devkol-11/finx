import { InvestmentPlanStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { AppError } from '../../utils/ErrorHandler';
import { WalletRepository } from '../wallet/wallet.repository';
import type { IInvestmentStrategy, InvestmentPlanKey } from './external/interface/IInvestmentStrategy';
import type { PortfolioQueryInput, SubscribeInput, WithdrawParamsInput } from './http/invest.schema';
import { InvestRepository } from './invest.repository';

export class InvestService {
  private readonly strategies: Map<InvestmentPlanKey, IInvestmentStrategy>;

  constructor(
    private readonly investRepository: InvestRepository,
    private readonly walletRepository: WalletRepository,
    strategies: IInvestmentStrategy[]
  ) {
    this.strategies = new Map(strategies.map((strategy) => [strategy.key, strategy]));
  }

  public listPlans() {
    return {
      message: 'Investment plans retrieved successfully.',
      data: Array.from(this.strategies.values()).map((strategy) => ({
        key: strategy.key,
        name: strategy.name,
        description: strategy.description,
        apy: strategy.apy.toString(),
        payoutFrequency: strategy.payoutFrequency,
        lockPeriodDays: strategy.lockPeriodDays
      }))
    };
  }

  public async subscribe(userId: string, input: SubscribeInput) {
    const strategy = this.getStrategy(input.planKey);
    const wallet = await this.walletRepository.findUserWalletByUserId(userId);

    if (!wallet) {
      throw AppError.notFound('Wallet not found.');
    }

    const result = await this.investRepository.createSubscription(userId, input, strategy, `inv_sub_${randomUUID()}`);

    return {
      message: 'Investment subscription created successfully.',
      data: {
        id: result.investment.id,
        planKey: strategy.key,
        amount: result.investment.principalAmount.toString(),
        expectedReturnAmount: result.investment.expectedReturnAmount.toString(),
        walletBalance: result.wallet.availableBalance.toString(),
        maturityAt: result.investment.maturityAt
      }
    };
  }

  public async getPortfolio(userId: string, input: PortfolioQueryInput) {
    const investments = await this.investRepository.getUserPortfolio(userId, input.status as InvestmentPlanStatus | undefined);

    const portfolioItems = investments.map((investment) => {
      const planKey = this.extractPlanKey(investment.metadata);
      const strategy = this.getStrategy(planKey);
      const accruedInterest = this.calculateAccruedInterestForDisplay(investment.principalAmount, investment, strategy);

      return {
        id: investment.id,
        planKey,
        planName: strategy.name,
        status: investment.status,
        principalAmount: investment.principalAmount.toString(),
        expectedReturnAmount: investment.expectedReturnAmount.toString(),
        accruedInterest: accruedInterest.toString(),
        startDate: investment.accrualStartAt,
        maturityAt: investment.maturityAt,
        payoutFrequency: strategy.payoutFrequency
      };
    });

    const totalAccruedInterest = portfolioItems.reduce((total, item) => total.plus(item.accruedInterest), new Prisma.Decimal(0));

    return {
      message: 'Investment portfolio retrieved successfully.',
      data: {
        items: portfolioItems,
        totalAccruedInterest: totalAccruedInterest.toString()
      }
    };
  }

  public async withdraw(userId: string, params: WithdrawParamsInput) {
    const investment = await this.investRepository.findInvestmentByIdForUser(userId, params.id);

    if (!investment) {
      throw AppError.notFound('Investment not found.');
    }

    const strategy = this.getStrategy(this.extractPlanKey(investment.metadata));
    const result = await this.investRepository.withdrawInvestment(userId, params.id, strategy, `inv_wd_${randomUUID()}`);

    return {
      message: 'Investment withdrawn successfully.',
      data: {
        investmentId: result.investment.id,
        principalAmount: result.investment.principalAmount.toString(),
        interestAmount: result.accruedInterest.toString(),
        walletBalance: result.wallet.availableBalance.toString()
      }
    };
  }

  public async processDuePayouts(now = new Date()) {
    const investments = await this.investRepository.getActiveInvestmentsForPayout();
    const results: Array<{
      investmentId: string;
      payoutAmount: string;
      reference: string | null;
    }> = [];

    for (const investment of investments) {
      const planKey = this.extractPlanKey(investment.metadata);
      const strategy = this.getStrategy(planKey);

      if (!investment.accrualStartAt || !investment.lastAccruedAt) {
        continue;
      }

      const payoutWindowDays = this.getPayoutWindowDays(strategy, investment.lastAccruedAt, now);

      if (strategy.payoutFrequency === 'MATURITY') {
        if (investment.maturityAt && now >= investment.maturityAt) {
          const payoutAmount = strategy.calculateInterest(investment.principalAmount, investment.durationDays ?? 0);

          const result = await this.investRepository.creditInvestmentPayout(investment.id, strategy, payoutAmount, `inv_maturity_${randomUUID()}`, {
            includePrincipal: true,
            markMatured: true
          });

          results.push({
            investmentId: result.investment.id,
            payoutAmount: result.ledgerTransaction.amount.toString(),
            reference: result.ledgerTransaction.externalReference
          });
        }

        continue;
      }

      if (payoutWindowDays <= 0) {
        continue;
      }

      const payoutAmount = strategy.calculateInterest(investment.principalAmount, payoutWindowDays);

      if (payoutAmount.lessThanOrEqualTo(0)) {
        continue;
      }

      const shouldAlsoReturnPrincipal = Boolean(investment.maturityAt && now >= investment.maturityAt);

      const result = await this.investRepository.creditInvestmentPayout(investment.id, strategy, payoutAmount, `inv_interest_${randomUUID()}`, {
        includePrincipal: shouldAlsoReturnPrincipal,
        markMatured: shouldAlsoReturnPrincipal
      });

      results.push({
        investmentId: result.investment.id,
        payoutAmount: result.ledgerTransaction.amount.toString(),
        reference: result.ledgerTransaction.externalReference
      });
    }

    return {
      message: 'Investment payouts processed.',
      data: results
    };
  }

  private getStrategy(planKey: InvestmentPlanKey): IInvestmentStrategy {
    const strategy = this.strategies.get(planKey);

    if (!strategy) {
      throw AppError.badRequest(`Unsupported investment plan: ${planKey}`);
    }

    return strategy;
  }

  private extractPlanKey(metadata: Prisma.JsonValue | null): InvestmentPlanKey {
    const planKey = (metadata as { planKey?: InvestmentPlanKey } | null)?.planKey;

    if (!planKey) {
      throw AppError.internal('Investment metadata is missing its plan key.', {
        isOperational: true
      });
    }

    return planKey;
  }

  private calculateAccruedInterestForDisplay(
    principalAmount: Prisma.Decimal,
    investment: {
      accrualStartAt: Date | null;
      maturityAt: Date | null;
    },
    strategy: IInvestmentStrategy
  ): Prisma.Decimal {
    if (!investment.accrualStartAt) {
      return new Prisma.Decimal(0);
    }

    const endDate = investment.maturityAt && investment.maturityAt < new Date() ? investment.maturityAt : new Date();
    const elapsedDays = Math.max(0, Math.floor((endDate.getTime() - investment.accrualStartAt.getTime()) / (24 * 60 * 60 * 1000)));

    return strategy.calculateInterest(principalAmount, elapsedDays);
  }

  private getPayoutWindowDays(strategy: IInvestmentStrategy, lastAccruedAt: Date, now: Date): number {
    const elapsedDays = Math.max(0, Math.floor((now.getTime() - lastAccruedAt.getTime()) / (24 * 60 * 60 * 1000)));

    if (strategy.payoutFrequency === 'DAILY') {
      return elapsedDays;
    }

    if (strategy.payoutFrequency === 'MONTHLY') {
      const elapsedMonths = Math.floor(elapsedDays / 30);
      return elapsedMonths * 30;
    }

    return 0;
  }
}
