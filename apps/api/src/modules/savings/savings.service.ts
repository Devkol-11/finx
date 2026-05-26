import { CancelSavingsPlanInput, CreateSavingsPlanInput, FundSavingsPlanInput, WithdrawFromSavingsPlanInput } from './http/savings.schema';
import { SavingsRepository } from './savings.repository';
import { AppError } from '../../utils/ErrorHandler';
import { Prisma } from '@prisma/client';
import { logError } from '../../utils/logger';

export class SavingsService {
  constructor(private readonly savingsRepo: SavingsRepository) {}
  async createSavingsPlan(userId: string, data: CreateSavingsPlanInput) {
    const wallet = await this.savingsRepo.getUserWalletId(userId);
    if (!wallet) {
      throw AppError.badRequest('Wallet not found or active');
    }

    const base = {
      userId,
      walletId: wallet!.id,
      name: data.name,
      type: data.type,
      description: data.description ?? null,
      locked: Boolean(data.locked)
    };

    console.log('BASE', base);

    const plan = await this.savingsRepo.createPlan({
      ...base,

      ...(data.targetAmount
        ? {
            targetAmount: new Prisma.Decimal(data.targetAmount)
          }
        : {}),

      ...(data.unlockDate
        ? {
            unlockDate: new Date(data.unlockDate)
          }
        : {})
    });

    return {
      message: 'Savings plan created successfully',
      data: plan
    };
  }
  async fundSavingsPlan(userId: string, planId: string, data: FundSavingsPlanInput) {
    const plan = await this.savingsRepo.findPlanById(userId, planId);

    if (!plan) {
      throw AppError.badRequest('Savings plan not found');
    }

    if (plan.userId !== userId) {
      throw AppError.forbidden('Unauthorized access to savings plan');
    }

    const updatedPlan = await this.savingsRepo.depositIntoSavings({
      userId,
      walletId: plan.walletId,
      savingsPlanId: plan.id,
      amount: new Prisma.Decimal(data.amount)
    });

    return {
      message: 'Savings funded successfully',
      data: updatedPlan
    };
  }
  async withdrawFromSavingsPlan(userId: string, planId: string, data: WithdrawFromSavingsPlanInput) {
    const plan = await this.savingsRepo.findPlanById(userId, planId);

    if (!plan) {
      throw AppError.badRequest('Savings plan not found');
    }

    if (plan.userId !== userId) {
      throw AppError.forbidden('Unauthorized access to savings plan');
    }

    if (data.amount > String(plan.currentAmount)) {
      logError('Insufficient Savings plan balance');
      throw AppError.badRequest('Insufficient Savings plan balance');
    }

    const updatedPlan = await this.savingsRepo.withdrawFromSavings({
      userId,
      walletId: plan.walletId,
      savingsPlanId: plan.id,
      amount: new Prisma.Decimal(data.amount)
    });

    return {
      message: 'Savings withdrawal successful',
      data: updatedPlan
    };
  }
  async cancelSavingsPlan(userId: string, planId: string, data: CancelSavingsPlanInput) {
    const plan = await this.savingsRepo.findPlanById(userId, planId);

    if (!plan) {
      throw AppError.badRequest('Savings plan not found');
    }

    if (plan.userId !== userId) {
      throw AppError.forbidden('Unauthorized access to savings plan');
    }

    const cancelledPlan = await this.savingsRepo.cancelPlan(plan.id, data.reason);

    return {
      message: 'Savings plan cancelled successfully',
      data: cancelledPlan
    };
  }
  async getUserSavingsPlans(userId: string) {
    const plans = await this.savingsRepo.findUserPlans(userId);

    return {
      message: 'Savings plans fetched successfully',
      data: plans
    };
  }
  async getSavingsPlanById(userId: string, planId: string) {
    const plan = await this.savingsRepo.findPlanById(userId, planId);

    if (!plan) {
      throw AppError.badRequest('Savings plan not found');
    }

    if (plan.userId !== userId) {
      throw AppError.forbidden('Unauthorized access to savings plan');
    }

    return {
      message: 'Savings plan fetched successfully',
      data: plan
    };
  }
}
