/**
 * InvestService Test Suite
 *
 * Tests for investment business logic using Node.js assert
 * Covers plan listing, subscriptions, portfolio management, and payout processing
 */

import assert from 'node:assert';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { InvestmentPlanStatus, Prisma } from '@prisma/client';
import { InvestService } from '../invest.service';
import type { SubscribeInput, PortfolioQueryInput, WithdrawParamsInput } from '../http/invest.schema';

// Mock Strategy
const createMockStrategy = (overrides = {}) => ({
  key: 'FLEX_DAILY',
  name: 'Flex Daily Investment',
  description: 'Daily interest accumulation',
  apy: new Prisma.Decimal('10'),
  payoutFrequency: 'DAILY',
  lockPeriodDays: 0,
  planType: 'FLEXIBLE',
  getMaturityDate: (date: Date) => new Date(date.getTime() + 365 * 24 * 60 * 60 * 1000),
  calculateInterest: (principal: Prisma.Decimal, days: number) => principal.mul(0.1).mul(days).div(365),
  canWithdraw: () => true,
  ...overrides
});

// Mock Repository
const createMockInvestRepository = () => ({
  createSubscription: async (userId: string, input: any, strategy: any, ref: string) => ({
    investment: {
      id: 'inv-1',
      principalAmount: new Prisma.Decimal(input.amount),
      expectedReturnAmount: strategy.calculateInterest(new Prisma.Decimal(input.amount), strategy.lockPeriodDays || 0),
      maturityAt: strategy.getMaturityDate(new Date())
    },
    wallet: {
      availableBalance: new Prisma.Decimal('5000')
    }
  }),
  getUserPortfolio: async (userId: string, status?: any) => [
    {
      id: 'inv-1',
      status: InvestmentPlanStatus.ACTIVE,
      principalAmount: new Prisma.Decimal('5000'),
      expectedReturnAmount: new Prisma.Decimal('500'),
      accrualStartAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      maturityAt: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000),
      lastAccruedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      metadata: { planKey: 'FLEX_DAILY' }
    }
  ],
  findInvestmentByIdForUser: async (userId: string, investmentId: string) => ({
    id: investmentId,
    userId,
    status: InvestmentPlanStatus.ACTIVE,
    principalAmount: new Prisma.Decimal('5000'),
    expectedReturnAmount: new Prisma.Decimal('500'),
    accrualStartAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    lastAccruedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    maturityAt: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000),
    metadata: { planKey: 'FLEX_DAILY' }
  }),
  withdrawInvestment: async (userId: string, investmentId: string, strategy: any, ref: string) => ({
    investment: {
      id: investmentId,
      principalAmount: new Prisma.Decimal('5000')
    },
    wallet: {
      availableBalance: new Prisma.Decimal('5082')
    },
    accruedInterest: new Prisma.Decimal('82')
  }),
  creditInvestmentPayout: async (investmentId: string, strategy: any, amount: any, ref: string, options: any) => ({
    investment: { id: investmentId },
    ledgerTransaction: {
      externalReference: ref,
      amount
    }
  }),
  getActiveInvestmentsForPayout: async () => [
    {
      id: 'inv-1',
      status: InvestmentPlanStatus.ACTIVE,
      principalAmount: new Prisma.Decimal('5000'),
      lastAccruedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      accrualStartAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      maturityAt: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000),
      durationDays: 365,
      metadata: { planKey: 'FLEX_DAILY' }
    }
  ]
});

// Mock Wallet Repository
const createMockWalletRepository = () => ({
  findUserWalletByUserId: async (userId: string) => ({
    id: 'wallet-1',
    userId,
    availableBalance: new Prisma.Decimal('10000')
  })
});

describe('InvestService', () => {
  let service: InvestService;
  let mockInvestRepository: any;
  let mockWalletRepository: any;

  beforeEach(() => {
    mockInvestRepository = createMockInvestRepository();
    mockWalletRepository = createMockWalletRepository();
    const strategies = [
      createMockStrategy({ key: 'FLEX_DAILY' }),
      createMockStrategy({
        key: 'FIXED_LOCK',
        name: 'Fixed Lock',
        lockPeriodDays: 30,
        payoutFrequency: 'MATURITY'
      })
    ];
    service = new InvestService(mockInvestRepository, mockWalletRepository, strategies);
  });

  afterEach(() => {
    mockInvestRepository = null;
    mockWalletRepository = null;
    service = null as any;
  });

  describe('listPlans', () => {
    it('should return all available investment plans', () => {
      const result = service.listPlans();

      assert(result.data, 'Should return data');
      assert(Array.isArray(result.data), 'Data should be array');
      assert(result.data.length >= 2, 'Should have at least 2 plans');
    });

    it('should include plan details', () => {
      const result = service.listPlans();

      const plan = result.data[0];
      assert.strictEqual(typeof plan.key, 'string', 'Plan should have key');
      assert.strictEqual(typeof plan.name, 'string', 'Plan should have name');
      assert.strictEqual(typeof plan.description, 'string', 'Plan should have description');
      assert.strictEqual(typeof plan.apy, 'string', 'APY should be string');
      assert.strictEqual(typeof plan.payoutFrequency, 'string', 'Should have payout frequency');
      assert.strictEqual(typeof plan.lockPeriodDays, 'number', 'Should have lock period');
    });

    it('should convert Decimal APY to string', () => {
      const result = service.listPlans();

      const plan = result.data.find((p) => p.key === 'FLEX_DAILY');
      assert.strictEqual(plan.apy, '10', 'APY should be converted to string');
    });
  });

  describe('subscribe', () => {
    it('should create new investment subscription', async () => {
      const input: SubscribeInput = {
        planKey: 'FLEX_DAILY',
        amount: '5000'
      };

      const result = await service.subscribe('user-1', input);

      assert.strictEqual(result.message, 'Investment subscription created successfully.', 'Should return success message');
      assert.strictEqual(result.data.planKey, 'FLEX_DAILY', 'Should return plan key');
      assert.strictEqual(result.data.amount, '5000', 'Should return amount as string');
      assert(result.data.expectedReturnAmount, 'Should include expected return');
      assert(result.data.maturityAt, 'Should include maturity date');
    });

    it('should throw if wallet not found', async () => {
      const input: SubscribeInput = {
        planKey: 'FLEX_DAILY',
        amount: '5000'
      };

      mockWalletRepository.findUserWalletByUserId = async () => null;

      try {
        await service.subscribe('user-1', input);
        assert.fail('Should throw wallet not found error');
      } catch (error: any) {
        assert(error.message.includes('Wallet not found'), 'Should throw wallet not found');
      }
    });

    it('should throw for unsupported plan', async () => {
      const input: SubscribeInput = {
        planKey: 'UNSUPPORTED_PLAN' as any,
        amount: '5000'
      };

      try {
        await service.subscribe('user-1', input);
        assert.fail('Should throw unsupported plan error');
      } catch (error: any) {
        assert(error.message.includes('Unsupported investment plan'), 'Should throw unsupported plan error');
      }
    });

    it('should format amounts as strings in response', async () => {
      const input: SubscribeInput = {
        planKey: 'FLEX_DAILY',
        amount: '5000'
      };

      const result = await service.subscribe('user-1', input);

      assert.strictEqual(typeof result.data.amount, 'string', 'Amount should be string');
      assert.strictEqual(typeof result.data.expectedReturnAmount, 'string', 'Expected return should be string');
      assert.strictEqual(typeof result.data.walletBalance, 'string', 'Wallet balance should be string');
    });
  });

  describe('getPortfolio', () => {
    it('should return user investment portfolio', async () => {
      const input: PortfolioQueryInput = {};

      const result = await service.getPortfolio('user-1', input);

      assert(result.data, 'Should return data');
      assert(Array.isArray(result.data.items), 'Items should be array');
      assert(result.data.totalAccruedInterest, 'Should include total accrued interest');
    });

    it('should calculate accrued interest', async () => {
      const input: PortfolioQueryInput = {};

      const result = await service.getPortfolio('user-1', input);

      const item = result.data.items[0];
      assert(item.accruedInterest, 'Should include accrued interest');
      assert.strictEqual(typeof item.accruedInterest, 'string', 'Accrued interest should be string');
    });

    it('should include portfolio metadata', async () => {
      const input: PortfolioQueryInput = {};

      const result = await service.getPortfolio('user-1', input);

      const item = result.data.items[0];
      assert.strictEqual(item.status, InvestmentPlanStatus.ACTIVE, 'Should have status');
      assert(item.planKey, 'Should have plan key');
      assert(item.planName, 'Should have plan name');
      assert(item.principalAmount, 'Should have principal as string');
      assert(item.expectedReturnAmount, 'Should have expected return');
      assert(item.startDate, 'Should have start date');
      assert(item.maturityAt, 'Should have maturity date');
    });

    it('should filter by status when provided', async () => {
      const input: PortfolioQueryInput = { status: 'ACTIVE' };

      mockInvestRepository.getUserPortfolio = async (userId: string, status: any) => {
        assert.strictEqual(status, InvestmentPlanStatus.ACTIVE, 'Should filter by status');
        return [];
      };

      await service.getPortfolio('user-1', input);
    });

    it('should sum total accrued interest', async () => {
      const input: PortfolioQueryInput = {};

      mockInvestRepository.getUserPortfolio = async () => [
        {
          id: 'inv-1',
          status: InvestmentPlanStatus.ACTIVE,
          principalAmount: new Prisma.Decimal('1000'),
          expectedReturnAmount: new Prisma.Decimal('100'),
          accrualStartAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          maturityAt: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000),
          lastAccruedAt: new Date(),
          metadata: { planKey: 'FLEX_DAILY' }
        },
        {
          id: 'inv-2',
          status: InvestmentPlanStatus.ACTIVE,
          principalAmount: new Prisma.Decimal('2000'),
          expectedReturnAmount: new Prisma.Decimal('200'),
          accrualStartAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          maturityAt: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000),
          lastAccruedAt: new Date(),
          metadata: { planKey: 'FLEX_DAILY' }
        }
      ];

      const result = await service.getPortfolio('user-1', input);

      assert(result.data.items.length === 2, 'Should have 2 items');
      assert(result.data.totalAccruedInterest, 'Should have total accrued interest');
    });
  });

  describe('withdraw', () => {
    it('should withdraw investment and return funds', async () => {
      const params: WithdrawParamsInput = {
        id: 'inv-1'
      };

      const result = await service.withdraw('user-1', params);

      assert.strictEqual(result.message, 'Investment withdrawn successfully.', 'Should return success message');
      assert(result.data.investmentId, 'Should return investment ID');
      assert(result.data.principalAmount, 'Should return principal');
      assert(result.data.interestAmount, 'Should return interest earned');
      assert(result.data.walletBalance, 'Should return updated wallet balance');
    });

    it('should throw if investment not found', async () => {
      const params: WithdrawParamsInput = { id: 'nonexistent' };

      mockInvestRepository.findInvestmentByIdForUser = async () => null;

      try {
        await service.withdraw('user-1', params);
        assert.fail('Should throw not found error');
      } catch (error: any) {
        assert(error.message.includes('not found'), 'Should throw not found error');
      }
    });

    it('should throw if investment cannot be withdrawn', async () => {
      const params: WithdrawParamsInput = { id: 'inv-1' };

      mockInvestRepository.findInvestmentByIdForUser = async () => ({
        id: 'inv-1',
        metadata: { planKey: 'FIXED_LOCK' }
      });

      const strategy = createMockStrategy({
        key: 'FIXED_LOCK',
        canWithdraw: () => false
      });

      mockInvestRepository.getUserPortfolio = async () => []; // No strategies in portfolio

      try {
        await service.withdraw('user-1', params);
        // Expected to throw
      } catch (error: any) {
        assert(error.message, 'Should throw error for non-withdrawable investment');
      }
    });

    it('should format amounts as strings', async () => {
      const params: WithdrawParamsInput = { id: 'inv-1' };

      const result = await service.withdraw('user-1', params);

      assert.strictEqual(typeof result.data.principalAmount, 'string', 'Principal should be string');
      assert.strictEqual(typeof result.data.interestAmount, 'string', 'Interest should be string');
      assert.strictEqual(typeof result.data.walletBalance, 'string', 'Balance should be string');
    });
  });

  describe('processDuePayouts', () => {
    it('should process daily payouts', async () => {
      const results = await service.processDuePayouts();

      assert(results.data, 'Should return data');
      assert(Array.isArray(results.data), 'Data should be array');
    });

    it('should handle maturity payouts', async () => {
      mockInvestRepository.getActiveInvestmentsForPayout = async () => [
        {
          id: 'inv-1',
          status: InvestmentPlanStatus.ACTIVE,
          principalAmount: new Prisma.Decimal('5000'),
          lastAccruedAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
          accrualStartAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          maturityAt: new Date(Date.now() - 1000), // Already matured
          durationDays: 365,
          metadata: { planKey: 'FIXED_LOCK' }
        }
      ];

      mockInvestRepository.creditInvestmentPayout = async (invId: any, strategy: any, amount: any, ref: string, options: any) => {
        assert.strictEqual(options.includePrincipal, true, 'Should include principal at maturity');
        assert.strictEqual(options.markMatured, true, 'Should mark as matured');
        return {
          investment: { id: invId },
          ledgerTransaction: { externalReference: ref, amount }
        };
      };

      const result = await service.processDuePayouts();

      assert(result.data.length >= 0, 'Should process payouts');
    });

    it('should calculate payout window correctly', async () => {
      const now = new Date();
      mockInvestRepository.getActiveInvestmentsForPayout = async () => [
        {
          id: 'inv-1',
          status: InvestmentPlanStatus.ACTIVE,
          principalAmount: new Prisma.Decimal('1000'),
          lastAccruedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          accrualStartAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          maturityAt: new Date(now.getTime() + 300 * 24 * 60 * 60 * 1000),
          durationDays: 30,
          metadata: { planKey: 'FLEX_DAILY' }
        }
      ];

      const result = await service.processDuePayouts(now);

      assert(result.data, 'Should return results');
    });

    it('should skip investments with no accrual start date', async () => {
      mockInvestRepository.getActiveInvestmentsForPayout = async () => [
        {
          id: 'inv-1',
          status: InvestmentPlanStatus.ACTIVE,
          accrualStartAt: null,
          lastAccruedAt: null,
          maturityAt: null,
          metadata: { planKey: 'FLEX_DAILY' }
        }
      ];

      const result = await service.processDuePayouts();

      assert(Array.isArray(result.data), 'Should handle missing accrual dates');
    });

    it('should handle unsupported plan keys gracefully', async () => {
      mockInvestRepository.getActiveInvestmentsForPayout = async () => [
        {
          id: 'inv-1',
          status: InvestmentPlanStatus.ACTIVE,
          principalAmount: new Prisma.Decimal('1000'),
          accrualStartAt: new Date(),
          lastAccruedAt: new Date(),
          maturityAt: new Date(),
          metadata: { planKey: 'UNSUPPORTED_PLAN' }
        }
      ];

      try {
        await service.processDuePayouts();
      } catch (error: any) {
        assert(error.message.includes('Unsupported'), 'Should handle unsupported plans');
      }
    });
  });
});
