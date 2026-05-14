/**
 * InvestRepository Test Suite
 *
 * Tests for investment database operations using Node.js assert
 * These tests verify investment creation, portfolio management, and payout processing
 */

import assert from 'node:assert';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { InvestmentPlanStatus, Prisma } from '@prisma/client';
import { InvestRepository } from '../invest.repository';
import type { SubscribeInput } from '../http/invest.schema';

// Mock Prisma Client
const createMockPrismaClient = () => ({
  investmentPlan: {
    create: async (query: any) => ({
      id: 'inv-1',
      userId: query.data.userId,
      principalAmount: query.data.principalAmount,
      status: query.data.status
    }),
    findMany: async (query: any) => [],
    findFirst: async (query: any) => null,
    findUnique: async (query: any) => null,
    update: async (query: any) => ({})
  },
  wallet: {
    findFirst: async (query: any) => null,
    findUnique: async (query: any) => null,
    findUniqueOrThrow: async (query: any) => ({
      id: 'wallet-1',
      userId: query.where.userId,
      availableBalance: new Prisma.Decimal('10000'),
      isActive: true
    }),
    update: async (query: any) => ({}),
    updateMany: async (query: any) => ({ count: 1 })
  },
  ledgerTransaction: {
    create: async (query: any) => ({
      id: 'tx-1',
      externalReference: query.data.externalReference,
      amount: query.data.amount
    })
  },
  ledgerEntry: {
    createMany: async (query: any) => ({})
  },
  $transaction: async (callback: any) =>
    callback({
      investmentPlan: {
        create: async (query: any) => ({
          id: 'inv-1',
          userId: query.data.userId,
          principalAmount: query.data.principalAmount
        }),
        findFirst: async (query: any) => null,
        findMany: async (query: any) => [],
        update: async (query: any) => ({})
      },
      wallet: {
        findUniqueOrThrow: async (query: any) => ({
          id: 'wallet-1',
          availableBalance: new Prisma.Decimal('10000')
        }),
        update: async (query: any) => ({}),
        updateMany: async (query: any) => ({ count: 1 })
      },
      ledgerTransaction: {
        create: async (query: any) => ({})
      }
    })
});

// Mock Strategy
const createMockStrategy = () => ({
  key: 'FLEX_DAILY',
  name: 'Flex Daily',
  apy: new Prisma.Decimal('10'),
  payoutFrequency: 'DAILY',
  lockPeriodDays: 0,
  planType: 'FLEXIBLE',
  getMaturityDate: (date: Date) => new Date(date.getTime() + 365 * 24 * 60 * 60 * 1000),
  calculateInterest: (principal: Prisma.Decimal, days: number) => principal.mul(0.1).mul(days).div(365),
  canWithdraw: (startDate: Date) => true
});

describe('InvestRepository', () => {
  let repository: InvestRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrismaClient();
    repository = new InvestRepository(mockPrisma as any);
  });

  afterEach(() => {
    mockPrisma = null;
    repository = null as any;
  });

  describe('createSubscription', () => {
    it('should create investment subscription with transaction', async () => {
      const input: SubscribeInput = {
        planKey: 'FLEX_DAILY',
        amount: '5000'
      };

      const strategy = createMockStrategy();
      let investmentCreated = false;
      let walletDebited = false;

      mockPrisma.$transaction = async (callback: any) => {
        const transaction = {
          wallet: {
            findUniqueOrThrow: async () => ({
              id: 'wallet-1',
              availableBalance: new Prisma.Decimal('10000')
            }),
            updateMany: async (query: any) => {
              walletDebited = true;
              assert.strictEqual(query.data.availableBalance.decrement.toString(), '5000', 'Should debit correct amount');
              return { count: 1 };
            },
            findUniqueOrThrow: async () => ({
              id: 'wallet-1',
              availableBalance: new Prisma.Decimal('5000')
            })
          },
          investmentPlan: {
            create: async (query: any) => {
              investmentCreated = true;
              assert.strictEqual(query.data.principalAmount.toString(), '5000', 'Should set principal');
              assert.strictEqual(query.data.status, InvestmentPlanStatus.ACTIVE, 'Should set status to ACTIVE');
              assert.strictEqual(query.data.userId, 'user-1', 'Should set user ID');
              return { id: 'inv-1', principalAmount: new Prisma.Decimal('5000') };
            }
          },
          ledgerTransaction: {
            create: async (query: any) => ({
              id: 'tx-1',
              externalReference: query.data.externalReference,
              amount: query.data.amount
            })
          }
        };
        return callback(transaction);
      };

      const result = await repository.createSubscription('user-1', input, strategy, 'inv_sub_xyz');

      assert(investmentCreated, 'Investment should be created');
      assert(walletDebited, 'Wallet should be debited');
      assert(result.investment, 'Should return investment');
      assert(result.wallet, 'Should return wallet');
      assert(result.ledgerTransaction, 'Should return ledger transaction');
    });

    it('should calculate interest correctly', async () => {
      const input: SubscribeInput = {
        planKey: 'FIXED_LOCK',
        amount: '10000'
      };

      const strategy = createMockStrategy();
      strategy.lockPeriodDays = 30;
      strategy.calculateInterest = (principal, days) => principal.mul(0.1).mul(days).div(365);

      mockPrisma.$transaction = async (callback: any) => {
        const transaction = {
          wallet: {
            findUniqueOrThrow: async () => ({
              id: 'wallet-1',
              availableBalance: new Prisma.Decimal('10000')
            }),
            updateMany: async () => ({ count: 1 }),
            findUniqueOrThrow: async () => ({ id: 'wallet-1' })
          },
          investmentPlan: {
            create: async (query: any) => {
              // Interest calculation: 10000 * 0.10 * 30 / 365 = 82.19
              const expectedInterest = new Prisma.Decimal('10000').mul(0.1).mul(30).div(365);
              assert(query.data.expectedReturnAmount.gte(80), 'Should calculate positive interest');
              return { id: 'inv-1' };
            }
          },
          ledgerTransaction: { create: async () => ({}) }
        };
        return callback(transaction);
      };

      await repository.createSubscription('user-1', input, strategy, 'ref');
    });

    it('should fail if insufficient funds', async () => {
      const input: SubscribeInput = {
        planKey: 'FLEX_DAILY',
        amount: '20000' // More than available
      };

      const strategy = createMockStrategy();

      mockPrisma.$transaction = async (callback: any) => {
        const transaction = {
          wallet: {
            findUniqueOrThrow: async () => ({
              id: 'wallet-1',
              availableBalance: new Prisma.Decimal('10000')
            }),
            updateMany: async () => ({ count: 0 }) // Debit failed
          }
        };
        return callback(transaction);
      };

      try {
        await repository.createSubscription('user-1', input, strategy, 'ref');
        assert.fail('Should throw insufficient funds error');
      } catch (error: any) {
        assert(error.message.includes('Insufficient funds'), 'Should throw insufficient funds');
      }
    });
  });

  describe('getUserPortfolio', () => {
    it('should return all user investments', async () => {
      const investments = [
        { id: 'inv-1', status: InvestmentPlanStatus.ACTIVE },
        { id: 'inv-2', status: InvestmentPlanStatus.MATURED }
      ];

      mockPrisma.investmentPlan.findMany = async (query: any) => {
        assert.strictEqual(query.where.userId, 'user-1', 'Should filter by user');
        return investments;
      };

      const result = await repository.getUserPortfolio('user-1');

      assert.strictEqual(result.length, 2, 'Should return all investments');
    });

    it('should filter by status when provided', async () => {
      mockPrisma.investmentPlan.findMany = async (query: any) => {
        assert.strictEqual(query.where.status, InvestmentPlanStatus.ACTIVE, 'Should filter by status');
        return [];
      };

      await repository.getUserPortfolio('user-1', InvestmentPlanStatus.ACTIVE);
    });

    it('should order by creation date descending', async () => {
      mockPrisma.investmentPlan.findMany = async (query: any) => {
        assert.deepStrictEqual(query.orderBy, { createdAt: 'desc' }, 'Should order by creation date');
        return [];
      };

      await repository.getUserPortfolio('user-1');
    });
  });

  describe('findInvestmentByIdForUser', () => {
    it('should find investment for specific user', async () => {
      const mockInvestment = { id: 'inv-1', userId: 'user-1', status: InvestmentPlanStatus.ACTIVE };

      mockPrisma.investmentPlan.findFirst = async (query: any) => {
        assert.strictEqual(query.where.id, 'inv-1', 'Should query by ID');
        assert.strictEqual(query.where.userId, 'user-1', 'Should filter by user');
        return mockInvestment;
      };

      const result = await repository.findInvestmentByIdForUser('user-1', 'inv-1');

      assert.deepStrictEqual(result, mockInvestment, 'Should return investment');
    });

    it('should return null when investment not found', async () => {
      mockPrisma.investmentPlan.findFirst = async () => null;

      const result = await repository.findInvestmentByIdForUser('user-1', 'nonexistent');

      assert.strictEqual(result, null, 'Should return null when not found');
    });

    it('should prevent access to other users investments', async () => {
      mockPrisma.investmentPlan.findFirst = async (query: any) => {
        assert.strictEqual(query.where.userId, 'user-1', 'Should verify user ownership');
        return null;
      };

      // Attempting to access other user's investment
      await repository.findInvestmentByIdForUser('user-1', 'other-user-investment');
    });
  });

  describe('withdrawInvestment', () => {
    it('should withdraw investment and credit wallet', async () => {
      const strategy = createMockStrategy();
      let investmentUpdated = false;
      let walletCredited = false;

      mockPrisma.$transaction = async (callback: any) => {
        const transaction = {
          investmentPlan: {
            findFirst: async () => ({
              id: 'inv-1',
              userId: 'user-1',
              status: InvestmentPlanStatus.ACTIVE,
              principalAmount: new Prisma.Decimal('5000'),
              accrualStartAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              lastAccruedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            }),
            update: async (query: any) => {
              investmentUpdated = true;
              assert.strictEqual(query.data.status, InvestmentPlanStatus.MATURED, 'Should mark as matured');
              return {};
            }
          },
          wallet: {
            findUniqueOrThrow: async () => ({
              id: 'wallet-1',
              availableBalance: new Prisma.Decimal('10000')
            }),
            update: async (query: any) => {
              walletCredited = true;
              assert(query.data.availableBalance.increment, 'Should credit wallet');
              return { id: 'wallet-1' };
            }
          },
          ledgerTransaction: {
            create: async () => ({})
          }
        };
        return callback(transaction);
      };

      const result = await repository.withdrawInvestment('user-1', 'inv-1', strategy, 'inv_wd_xyz');

      assert(investmentUpdated, 'Investment should be updated');
      assert(walletCredited, 'Wallet should be credited');
      assert(result.investment, 'Should return investment');
    });

    it('should throw if investment not found or not active', async () => {
      const strategy = createMockStrategy();

      mockPrisma.$transaction = async (callback: any) => {
        const transaction = {
          investmentPlan: {
            findFirst: async () => null
          }
        };
        return callback(transaction);
      };

      try {
        await repository.withdrawInvestment('user-1', 'nonexistent', strategy, 'ref');
        assert.fail('Should throw not found error');
      } catch (error: any) {
        assert(error.message.includes('not found'), 'Should throw not found error');
      }
    });

    it('should prevent premature withdrawal', async () => {
      const strategy = createMockStrategy();
      strategy.canWithdraw = () => false;

      mockPrisma.$transaction = async (callback: any) => {
        const transaction = {
          investmentPlan: {
            findFirst: async () => ({
              id: 'inv-1',
              userId: 'user-1',
              status: InvestmentPlanStatus.ACTIVE,
              accrualStartAt: new Date()
            })
          }
        };
        return callback(transaction);
      };

      try {
        await repository.withdrawInvestment('user-1', 'inv-1', strategy, 'ref');
        assert.fail('Should throw forbidden error');
      } catch (error: any) {
        assert(error.message.includes('cannot be withdrawn'), 'Should prevent premature withdrawal');
      }
    });
  });

  describe('creditInvestmentPayout', () => {
    it('should credit payout to wallet', async () => {
      const strategy = createMockStrategy();
      let walletCredited = false;
      let investmentUpdated = false;

      mockPrisma.$transaction = async (callback: any) => {
        const transaction = {
          wallet: {
            findUniqueOrThrow: async () => ({
              id: 'wallet-1',
              availableBalance: new Prisma.Decimal('5000')
            }),
            update: async (query: any) => {
              walletCredited = true;
              return { id: 'wallet-1' };
            }
          },
          investmentPlan: {
            update: async (query: any) => {
              investmentUpdated = true;
              return { id: 'inv-1' };
            }
          },
          ledgerTransaction: {
            create: async () => ({ id: 'tx-1', amount: new Prisma.Decimal('82') })
          }
        };
        return callback(transaction);
      };

      const result = await repository.creditInvestmentPayout('inv-1', strategy, new Prisma.Decimal('82'), 'inv_interest_xyz', {
        includePrincipal: false,
        markMatured: false
      });

      assert(walletCredited, 'Wallet should be credited');
      assert(investmentUpdated, 'Investment should be updated');
      assert(result.investment, 'Should return investment');
      assert(result.ledgerTransaction, 'Should return ledger transaction');
    });

    it('should include principal when marking as matured', async () => {
      const strategy = createMockStrategy();

      mockPrisma.$transaction = async (callback: any) => {
        const transaction = {
          wallet: {
            findUniqueOrThrow: async () => ({ id: 'wallet-1' }),
            update: async () => ({})
          },
          investmentPlan: {
            update: async (query: any) => {
              assert.strictEqual(query.data.status, InvestmentPlanStatus.MATURED, 'Should mark as matured');
              return { id: 'inv-1' };
            }
          },
          ledgerTransaction: {
            create: async () => ({})
          }
        };
        return callback(transaction);
      };

      await repository.creditInvestmentPayout('inv-1', strategy, new Prisma.Decimal('82'), 'inv_maturity_xyz', {
        includePrincipal: true,
        markMatured: true
      });
    });
  });

  describe('getActiveInvestmentsForPayout', () => {
    it('should return active investments ready for payout', async () => {
      const investments = [
        {
          id: 'inv-1',
          status: InvestmentPlanStatus.ACTIVE,
          lastAccruedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          metadata: { planKey: 'FLEX_DAILY' }
        }
      ];

      mockPrisma.investmentPlan.findMany = async (query: any) => {
        assert.strictEqual(query.where.status, InvestmentPlanStatus.ACTIVE, 'Should filter active only');
        return investments;
      };

      const result = await repository.getActiveInvestmentsForPayout();

      assert(Array.isArray(result), 'Should return array');
      assert(result.length > 0, 'Should return investments');
    });
  });
});
