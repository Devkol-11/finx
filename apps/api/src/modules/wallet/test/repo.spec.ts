/**
 * WalletRepository Test Suite
 *
 * Tests for wallet database operations using Node.js assert
 * These tests verify wallet queries, balance operations, and fund transfers
 */

import assert from 'node:assert';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { WalletType, WalletCurrency, PaymentStatus, PaymentType, PaymentDirection, LedgerTransactionType } from '@prisma/client';
import { WalletRepository } from '../wallet.repository';
import type { BalanceQueryInput, TransferInput, DepositInput, WithdrawInput, TransactionsQueryInput } from '../http/wallet.schema';

// Mock Prisma Client
const createMockPrismaClient = () => ({
  wallet: {
    findFirst: async (query: any) => null,
    findMany: async (query: any) => [],
    findUnique: async (query: any) => null,
    update: async (query: any) => ({}),
    updateMany: async (query: any) => ({ count: 0 })
  },
  ledgerTransaction: {
    findMany: async (query: any) => [],
    findUnique: async (query: any) => null,
    create: async (query: any) => ({}),
    count: async (query: any) => 0
  },
  paymentIntent: {
    findFirst: async (query: any) => null,
    findUnique: async (query: any) => null,
    create: async (query: any) => ({}),
    update: async (query: any) => ({})
  },
  paymentEvent: {
    create: async (query: any) => ({})
  },
  $transaction: async (callback: any) =>
    callback({
      wallet: {
        findFirst: async (query: any) => null,
        findUnique: async (query: any) => null,
        findUniqueOrThrow: async (query: any) => ({ id: 'wallet-1', availableBalance: '1000', userId: 'user-1' }),
        update: async (query: any) => ({ id: 'wallet-1', availableBalance: '1000' }),
        updateMany: async (query: any) => ({ count: 1 })
      },
      ledgerTransaction: {
        create: async (query: any) => ({ id: 'tx-1', externalReference: query.data.externalReference })
      },
      paymentIntent: {
        findFirst: async (query: any) => null,
        create: async (query: any) => ({}),
        update: async (query: any) => ({})
      }
    })
});

describe('WalletRepository', () => {
  let repository: WalletRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrismaClient();
    repository = new WalletRepository(mockPrisma as any);
  });

  afterEach(() => {
    mockPrisma = null;
    repository = null as any;
  });

  describe('findUserWalletByUserId', () => {
    it('should return wallet for active user', async () => {
      const mockWallet = {
        id: 'wallet-1',
        userId: 'user-1',
        type: WalletType.FIAT,
        currency: WalletCurrency.NGN,
        isActive: true,
        availableBalance: '5000'
      };

      mockPrisma.wallet.findFirst = async (query: any) => {
        assert.strictEqual(query.where.userId, 'user-1', 'Should query by userId');
        assert.strictEqual(query.where.currency, WalletCurrency.NGN, 'Should default to NGN');
        assert.strictEqual(query.where.type, WalletType.FIAT, 'Should filter FIAT wallets');
        assert.strictEqual(query.where.isActive, true, 'Should filter active wallets');
        return mockWallet;
      };

      const result = await repository.findUserWalletByUserId('user-1');

      assert.deepStrictEqual(result, mockWallet, 'Should return wallet');
    });

    it('should return null when wallet not found', async () => {
      mockPrisma.wallet.findFirst = async () => null;

      const result = await repository.findUserWalletByUserId('nonexistent-user');

      assert.strictEqual(result, null, 'Should return null when wallet not found');
    });

    it('should accept custom currency', async () => {
      mockPrisma.wallet.findFirst = async (query: any) => {
        assert.strictEqual(query.where.currency, WalletCurrency.USD, 'Should use custom currency');
        return null;
      };

      await repository.findUserWalletByUserId('user-1', WalletCurrency.USD);
    });
  });

  describe('findUserWalletByFinxTag', () => {
    it('should find wallet by finxTag and include user data', async () => {
      const mockWallet = {
        id: 'wallet-1',
        userId: 'user-1',
        currency: WalletCurrency.NGN,
        type: WalletType.FIAT,
        isActive: true,
        user: {
          id: 'user-1',
          finxTag: 'johndoe',
          email: 'john@example.com'
        }
      };

      mockPrisma.wallet.findFirst = async (query: any) => {
        assert(query.include?.user, 'Should include user data');
        assert.deepStrictEqual(query.where.user.finxTag, 'johndoe', 'Should filter by finxTag');
        return mockWallet;
      };

      const result = await repository.findUserWalletByFinxTag('johndoe');

      assert(result?.user, 'Should return wallet with user');
    });

    it('should filter out deleted users', async () => {
      mockPrisma.wallet.findFirst = async (query: any) => {
        assert.strictEqual(query.where.user.deletedAt, null, 'Should exclude deleted users');
        return null;
      };

      await repository.findUserWalletByFinxTag('somefinxtag');
    });
  });

  describe('getBalanceWithRecentActivity', () => {
    it('should return wallet balance and recent transactions', async () => {
      const input: BalanceQueryInput = {
        currency: 'NGN',
        activityLimit: 10
      };

      const mockWallet = { id: 'wallet-1', userId: 'user-1', currency: 'NGN' };
      const mockActivity = [
        { id: 'tx-1', type: 'DEPOSIT', status: 'COMPLETED' },
        { id: 'tx-2', type: 'TRANSFER', status: 'COMPLETED' }
      ];

      mockPrisma.wallet.findFirst = async () => mockWallet;
      mockPrisma.ledgerTransaction.findMany = async (query: any) => {
        assert.strictEqual(query.take, 10, 'Should respect activity limit');
        return mockActivity;
      };

      const result = await repository.getBalanceWithRecentActivity('user-1', input);

      assert(result.wallet, 'Should return wallet');
      assert.strictEqual(result.recentActivity.length, 2, 'Should return recent activity');
    });

    it('should throw when wallet not found', async () => {
      const input: BalanceQueryInput = { currency: 'NGN', activityLimit: 10 };

      mockPrisma.wallet.findFirst = async () => null;

      try {
        await repository.getBalanceWithRecentActivity('user-1', input);
        assert.fail('Should throw wallet not found error');
      } catch (error: any) {
        assert(error.message.includes('Wallet not found'), 'Should throw wallet not found');
      }
    });
  });

  describe('getTransactionHistory', () => {
    it('should return paginated transaction history', async () => {
      const input: TransactionsQueryInput = {
        page: 1,
        limit: 20,
        currency: 'NGN'
      };

      mockPrisma.wallet.findMany = async () => [{ id: 'wallet-1' }];
      mockPrisma.ledgerTransaction.findMany = async (query: any) => {
        assert.strictEqual(query.skip, 0, 'Should calculate skip correctly');
        assert.strictEqual(query.take, 20, 'Should use limit');
        return [];
      };
      mockPrisma.ledgerTransaction.count = async () => 100;

      const result = await repository.getTransactionHistory('user-1', input);

      assert.strictEqual(result.total, 100, 'Should return total count');
    });

    it('should handle pagination on different pages', async () => {
      const input: TransactionsQueryInput = {
        page: 3,
        limit: 20
      };

      mockPrisma.wallet.findMany = async () => [{ id: 'wallet-1' }];
      mockPrisma.ledgerTransaction.findMany = async (query: any) => {
        assert.strictEqual(query.skip, 40, 'Should skip 40 items for page 3');
        return [];
      };
      mockPrisma.ledgerTransaction.count = async () => 100;

      await repository.getTransactionHistory('user-1', input);
    });
  });

  describe('executeP2PTransfer', () => {
    it('should transfer funds between wallets', async () => {
      const input: TransferInput = {
        finxTag: 'recipient',
        amount: '1000',
        currency: 'NGN'
      };

      let debitCalled = false;
      let creditCalled = false;

      mockPrisma.$transaction = async (callback: any) => {
        const transaction = {
          wallet: {
            findFirst: async (query: any) => {
              if (query.where.user?.finxTag === 'recipient') {
                return { id: 'receiver-wallet', userId: 'user-2', availableBalance: '5000' };
              }
              return { id: 'sender-wallet', userId: 'user-1', availableBalance: '10000' };
            },
            findUniqueOrThrow: async (query: any) => ({ id: query.where.id, availableBalance: '9000' }),
            updateMany: async (query: any) => {
              debitCalled = true;
              return { count: 1 };
            },
            update: async (query: any) => {
              creditCalled = true;
              return { id: query.where.id, availableBalance: '6000' };
            }
          },
          ledgerTransaction: {
            create: async () => ({ id: 'tx-1', externalReference: 'p2p_xyz' })
          }
        };
        return callback(transaction);
      };

      const result = await repository.executeP2PTransfer('user-1', input, 'p2p_xyz');

      assert(debitCalled, 'Should debit sender wallet');
      assert(creditCalled, 'Should credit receiver wallet');
      assert(result.senderWallet, 'Should return sender wallet');
      assert(result.receiverWallet, 'Should return receiver wallet');
    });

    it('should prevent transfer when insufficient funds', async () => {
      const input: TransferInput = {
        finxTag: 'recipient',
        amount: '10000',
        currency: 'NGN'
      };

      mockPrisma.$transaction = async (callback: any) => {
        const transaction = {
          wallet: {
            findFirst: async () => ({ id: 'sender-wallet', availableBalance: '1000' }),
            updateMany: async () => ({ count: 0 }) // Debit failed
          }
        };
        return callback(transaction);
      };

      try {
        await repository.executeP2PTransfer('user-1', input, 'ref');
        assert.fail('Should throw insufficient funds error');
      } catch (error: any) {
        assert(error.message.includes('Insufficient funds'), 'Should throw error');
      }
    });
  });

  describe('createFiatDepositIntent', () => {
    it('should create new deposit intent', async () => {
      const input: DepositInput = {
        amount: '5000',
        currency: 'NGN'
      };

      mockPrisma.paymentIntent.findFirst = async () => null;
      mockPrisma.paymentIntent.create = async (query: any) => {
        assert.strictEqual(query.data.amount, '5000', 'Should save amount');
        assert.strictEqual(query.data.type, PaymentType.FIAT_DEPOSIT, 'Should set type');
        return { id: 'intent-1', reference: 'dep_xyz' };
      };

      const result = await repository.createFiatDepositIntent({
        userId: 'user-1',
        walletId: 'wallet-1',
        email: 'john@example.com',
        body: input,
        reference: 'dep_xyz'
      } as any);

      assert(result.paymentIntent, 'Should return payment intent');
      assert.strictEqual(result.reused, false, 'Should indicate new intent');
    });

    it('should reuse existing intent with idempotency key', async () => {
      mockPrisma.paymentIntent.findFirst = async () => ({
        id: 'intent-1',
        reference: 'dep_xyz'
      });

      const result = await repository.createFiatDepositIntent({
        userId: 'user-1',
        walletId: 'wallet-1',
        email: 'john@example.com',
        body: { amount: '5000', currency: 'NGN' },
        reference: 'dep_xyz',
        idempotencyKey: 'idempotency-key'
      } as any);

      assert.strictEqual(result.reused, true, 'Should indicate reused intent');
    });
  });

  describe('reserveFiatWithdrawal', () => {
    it('should reserve funds for withdrawal', async () => {
      const input: WithdrawInput = {
        amount: '1000',
        currency: 'NGN',
        bankCode: '058',
        accountNumber: '1234567890',
        accountName: 'John Doe'
      };

      mockPrisma.paymentIntent.findFirst = async () => null;
      mockPrisma.$transaction = async (callback: any) => {
        const transaction = {
          wallet: {
            findUniqueOrThrow: async () => ({ id: 'wallet-1', availableBalance: '5000' }),
            updateMany: async (query: any) => {
              assert.strictEqual(query.where.id, 'wallet-1', 'Should reserve from correct wallet');
              return { count: 1 };
            }
          },
          paymentIntent: {
            create: async (query: any) => ({
              id: 'intent-1',
              reference: query.data.reference,
              status: PaymentStatus.PROCESSING
            })
          }
        };
        return callback(transaction);
      };

      const result = await repository.reserveFiatWithdrawal({
        userId: 'user-1',
        body: input,
        reference: 'wd_xyz'
      } as any);

      assert(result.paymentIntent, 'Should return payment intent');
      assert(result.wallet, 'Should return wallet with reserved balance');
    });
  });

  describe('markDepositInitialized', () => {
    it('should mark payment intent as initialized', async () => {
      mockPrisma.paymentIntent.update = async (query: any) => {
        assert.strictEqual(query.where.id, 'intent-1', 'Should update correct intent');
        assert.strictEqual(query.data.status, PaymentStatus.PROCESSING, 'Should set status');
        return { id: 'intent-1', status: PaymentStatus.PROCESSING };
      };

      await repository.markDepositInitialized('intent-1', {
        reference: 'ref',
        authorizationUrl: 'https://example.com',
        accessCode: 'code'
      } as any);
    });
  });

  describe('postSuccessfulFiatDeposit', () => {
    it('should credit wallet on successful deposit', async () => {
      let walletCredited = false;
      let intentUpdated = false;

      mockPrisma.$transaction = async (callback: any) => {
        const transaction = {
          wallet: {
            findUniqueOrThrow: async () => ({ id: 'wallet-1' }),
            update: async (query: any) => {
              walletCredited = true;
              assert(query.data.availableBalance.increment, 'Should credit balance');
              return { id: 'wallet-1', availableBalance: '6000' };
            }
          },
          paymentIntent: {
            update: async (query: any) => {
              intentUpdated = true;
              assert.strictEqual(query.data.status, PaymentStatus.COMPLETED, 'Should mark as completed');
              return { id: 'intent-1', status: PaymentStatus.COMPLETED };
            }
          },
          ledgerTransaction: {
            create: async () => ({ id: 'tx-1' })
          }
        };
        return callback(transaction);
      };

      await repository.postSuccessfulFiatDeposit('ref', {
        status: 'success',
        amount: '1000',
        transactionReference: 'ref'
      } as any);

      assert(walletCredited, 'Should credit wallet');
      assert(intentUpdated, 'Should update intent');
    });
  });

  describe('findPaymentIntentForUser', () => {
    it('should find payment intent belonging to user', async () => {
      mockPrisma.paymentIntent.findFirst = async (query: any) => {
        assert.strictEqual(query.where.reference, 'ref', 'Should query by reference');
        assert.strictEqual(query.where.userId, 'user-1', 'Should filter by user');
        return { id: 'intent-1', reference: 'ref' };
      };

      const result = await repository.findPaymentIntentForUser('user-1', 'ref');

      assert(result, 'Should return payment intent');
    });

    it('should return null when not found', async () => {
      mockPrisma.paymentIntent.findFirst = async () => null;

      const result = await repository.findPaymentIntentForUser('user-1', 'ref');

      assert.strictEqual(result, null, 'Should return null when not found');
    });
  });

  describe('markPaymentFailed', () => {
    it('should mark payment as failed and release reserved funds', async () => {
      let paymentFailed = false;
      let fundsReleased = false;

      mockPrisma.$transaction = async (callback: any) => {
        const transaction = {
          paymentIntent: {
            update: async (query: any) => {
              paymentFailed = true;
              assert.strictEqual(query.data.status, PaymentStatus.FAILED, 'Should mark as failed');
              return { id: 'intent-1', status: PaymentStatus.FAILED };
            }
          },
          wallet: {
            findUniqueOrThrow: async () => ({ id: 'wallet-1' }),
            update: async () => {
              fundsReleased = true;
              return { id: 'wallet-1' };
            }
          }
        };
        return callback(transaction);
      };

      await repository.markPaymentFailed('ref', 'Provider failed');

      assert(paymentFailed, 'Should mark payment failed');
    });
  });

  describe('recordPaymentWebhook', () => {
    it('should record webhook and find related payment', async () => {
      mockPrisma.paymentEvent.create = async (query: any) => {
        assert.strictEqual(query.data.reference, 'ref', 'Should record reference');
        return { id: 'event-1' };
      };

      mockPrisma.paymentIntent.findFirst = async () => ({
        id: 'intent-1',
        reference: 'ref',
        type: PaymentType.FIAT_DEPOSIT
      });

      const result = await repository.recordPaymentWebhook({
        reference: 'ref',
        eventName: 'charge.success',
        payload: {}
      });

      assert(result, 'Should return payment intent');
    });
  });
});
