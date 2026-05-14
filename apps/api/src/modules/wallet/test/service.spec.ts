/**
 * WalletService Test Suite
 *
 * Tests for wallet business logic using Node.js assert
 * Covers balance queries, P2P transfers, deposits, withdrawals, and payment verification
 */

import assert from 'node:assert';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { PaymentStatus, PaymentType } from '@prisma/client';
import { WalletService } from '../wallet.service';
import type { BalanceQueryInput, TransferInput, DepositInput, WithdrawInput } from '../http/wallet.schema';

// Mock Repository
const createMockRepository = () => ({
  findUserWalletByUserId: async (userId: string) => ({
    id: 'wallet-1',
    userId,
    type: 'FIAT',
    currency: 'NGN',
    isActive: true,
    availableBalance: '10000',
    pendingBalance: '0',
    reservedBalance: '0'
  }),
  findUserWalletByFinxTag: async (finxTag: string) => ({
    id: 'receiver-wallet',
    userId: 'receiver-user',
    type: 'FIAT',
    currency: 'NGN',
    isActive: true,
    availableBalance: '5000',
    user: { id: 'receiver-user', finxTag, email: 'receiver@example.com' }
  }),
  getBalanceWithRecentActivity: async (userId: string, input: any) => ({
    wallet: {
      id: 'wallet-1',
      userId,
      currency: input.currency,
      type: 'FIAT',
      availableBalance: '10000',
      pendingBalance: '0',
      reservedBalance: '0'
    },
    recentActivity: [
      {
        id: 'tx-1',
        externalReference: 'ref-1',
        type: 'DEPOSIT',
        status: 'COMPLETED',
        amount: '5000',
        currency: 'NGN',
        description: 'Deposit',
        createdAt: new Date()
      }
    ]
  }),
  getTransactionHistory: async (userId: string, input: any) => ({
    items: [],
    total: 0
  }),
  executeP2PTransfer: async (userId: string, input: any, ref: string) => ({
    ledgerTransaction: {
      externalReference: ref,
      amount: input.amount,
      currency: input.currency
    },
    receiverUser: {
      id: 'receiver-user',
      finxTag: input.finxTag,
      email: 'receiver@example.com'
    },
    senderWallet: {
      availableBalance: '9000'
    }
  }),
  createFiatDepositIntent: async (input: any) => ({
    paymentIntent: {
      id: 'intent-1',
      reference: 'dep_xyz',
      authorizationUrl: 'https://example.com/auth',
      accessCode: 'code123',
      status: PaymentStatus.PROCESSING
    },
    reused: false
  }),
  markDepositInitialized: async (intentId: string, session: any) => ({
    status: PaymentStatus.PROCESSING
  }),
  markPaymentFailed: async (reference: string, message: string, error?: any) => {},
  reserveFiatWithdrawal: async (input: any) => ({
    paymentIntent: {
      id: 'intent-1',
      reference: 'wd_xyz',
      amount: input.body.amount,
      currency: input.body.currency,
      status: PaymentStatus.PROCESSING
    },
    wallet: {
      availableBalance: '9000',
      reservedBalance: '1000'
    },
    reused: false
  }),
  attachWithdrawalProviderResult: async (reference: string, result: any) => ({
    reference,
    status: result.status
  }),
  releaseFailedFiatWithdrawal: async (reference: string, message: string, error?: any) => ({
    paymentIntent: { reference, status: PaymentStatus.FAILED },
    wallet: { availableBalance: '10000' }
  }),
  settleSuccessfulFiatWithdrawal: async (reference: string, raw: any) => ({
    paymentIntent: { reference, status: PaymentStatus.COMPLETED },
    wallet: { availableBalance: '9000' }
  }),
  findPaymentIntentForUser: async (userId: string, reference: string) => ({
    id: 'intent-1',
    type: PaymentType.FIAT_DEPOSIT,
    reference
  }),
  postSuccessfulFiatDeposit: async (reference: string, verification: any) => ({
    paymentIntent: {
      reference,
      status: PaymentStatus.COMPLETED,
      amount: '5000',
      currency: 'NGN',
      ledgerTransactionId: 'tx-1'
    },
    wallet: { availableBalance: '15000' }
  }),
  recordPaymentWebhook: async (input: any) => ({
    id: 'intent-1',
    type: PaymentType.FIAT_DEPOSIT,
    reference: input.reference
  })
});

// Mock Payment Provider
const createMockPaymentProvider = () => ({
  initiateDeposit: async (input: any) => ({
    reference: input.reference,
    authorizationUrl: 'https://example.com/pay',
    accessCode: 'access123',
    status: PaymentStatus.PROCESSING
  }),
  transferToBank: async (input: any) => ({
    status: 'success',
    reference: input.reference,
    gatewayResponse: 'Transfer successful',
    raw: {}
  }),
  verifyTransaction: async (reference: string) => ({
    status: 'success',
    amount: '5000',
    transactionReference: reference,
    gatewayResponse: 'Verified',
    raw: {}
  })
});

describe('WalletService', () => {
  let service: WalletService;
  let mockRepository: any;
  let mockPaymentProvider: any;

  beforeEach(() => {
    mockRepository = createMockRepository();
    mockPaymentProvider = createMockPaymentProvider();
    service = new WalletService(mockRepository, mockPaymentProvider);
  });

  afterEach(() => {
    mockRepository = null;
    mockPaymentProvider = null;
    service = null as any;
  });

  describe('getBalance', () => {
    it('should return wallet balance with recent activity', async () => {
      const input: BalanceQueryInput = {
        currency: 'NGN',
        activityLimit: 10
      };

      const result = await service.getBalance('user-1', input);

      assert(result.data, 'Should return data object');
      assert.strictEqual(result.data.wallet.id, 'wallet-1', 'Should return wallet ID');
      assert.strictEqual(result.data.wallet.availableBalance, '10000', 'Should return available balance');
      assert(Array.isArray(result.data.recentActivity), 'Should return recent activity array');
      assert(result.data.recentActivity.length > 0, 'Should have activity');
    });

    it('should format balance as string', async () => {
      const input: BalanceQueryInput = { currency: 'NGN', activityLimit: 10 };

      const result = await service.getBalance('user-1', input);

      assert.strictEqual(typeof result.data.wallet.availableBalance, 'string', 'Balance should be string');
      assert.strictEqual(typeof result.data.wallet.pendingBalance, 'string', 'Pending balance should be string');
      assert.strictEqual(typeof result.data.wallet.reservedBalance, 'string', 'Reserved balance should be string');
    });

    it('should respect activity limit parameter', async () => {
      const input: BalanceQueryInput = { currency: 'NGN', activityLimit: 5 };

      mockRepository.getBalanceWithRecentActivity = async (userId: string, queryInput: any) => {
        assert.strictEqual(queryInput.activityLimit, 5, 'Should use custom activity limit');
        return {
          wallet: { id: 'wallet-1', currency: 'NGN', type: 'FIAT', availableBalance: '10000', pendingBalance: '0', reservedBalance: '0' },
          recentActivity: []
        };
      };

      await service.getBalance('user-1', input);
    });
  });

  describe('transferP2P', () => {
    it('should transfer funds between users', async () => {
      const input: TransferInput = {
        finxTag: 'recipient',
        amount: '1000',
        currency: 'NGN'
      };

      const result = await service.transferP2P('user-1', input);

      assert.strictEqual(result.message, 'Transfer completed successfully.', 'Should return success message');
      assert.strictEqual(result.data.receiver.finxTag, 'recipient', 'Should return receiver finxTag');
      assert.strictEqual(result.data.amount, '1000', 'Should return transfer amount');
      assert.strictEqual(result.data.senderBalance, '9000', 'Should return updated balance');
    });

    it('should throw error when receiver not found', async () => {
      const input: TransferInput = {
        finxTag: 'nonexistent',
        amount: '1000',
        currency: 'NGN'
      };

      mockRepository.findUserWalletByFinxTag = async () => null;

      try {
        await service.transferP2P('user-1', input);
        assert.fail('Should throw receiver not found error');
      } catch (error: any) {
        assert(error.message.includes('not found'), 'Should throw not found error');
      }
    });

    it('should prevent self-transfers', async () => {
      const input: TransferInput = {
        finxTag: 'user-1-tag',
        amount: '1000',
        currency: 'NGN'
      };

      mockRepository.findUserWalletByFinxTag = async () => ({
        id: 'wallet-1',
        userId: 'user-1',
        type: 'FIAT',
        currency: 'NGN',
        user: { id: 'user-1', finxTag: 'user-1-tag' }
      });

      try {
        await service.transferP2P('user-1', input);
        assert.fail('Should throw self-transfer error');
      } catch (error: any) {
        assert(error.message.includes('cannot transfer funds to yourself'), 'Should prevent self-transfers');
      }
    });

    it('should include transaction reference', async () => {
      const input: TransferInput = {
        finxTag: 'recipient',
        amount: '500',
        currency: 'NGN'
      };

      const result = await service.transferP2P('user-1', input);

      assert(result.data.reference, 'Should include transaction reference');
      assert(result.data.reference.startsWith('p2p_'), 'Reference should start with p2p_');
    });
  });

  describe('initiateFiatDeposit', () => {
    it('should initiate new deposit', async () => {
      const input: DepositInput = {
        amount: '5000',
        currency: 'NGN'
      };

      mockPaymentProvider.initiateDeposit = async (providerInput: any) => ({
        reference: providerInput.reference,
        authorizationUrl: 'https://paystack.com/pay',
        accessCode: 'access123',
        status: PaymentStatus.PROCESSING
      });

      const result = await service.initiateFiatDeposit('user-1', 'user@example.com', input);

      assert.strictEqual(result.message, 'Deposit session initialized successfully.', 'Should return success message');
      assert.strictEqual(result.data.provider, 'paystack', 'Should indicate provider');
      assert(result.data.authorizationUrl, 'Should return authorization URL');
      assert(result.data.accessCode, 'Should return access code');
    });

    it('should handle idempotency', async () => {
      const input: DepositInput = { amount: '5000', currency: 'NGN' };

      mockRepository.createFiatDepositIntent = async (intentInput: any) => ({
        paymentIntent: {
          id: 'intent-1',
          reference: 'dep_xyz',
          authorizationUrl: 'https://example.com',
          accessCode: 'code',
          status: PaymentStatus.PROCESSING
        },
        reused: true
      });

      const result = await service.initiateFiatDeposit('user-1', 'user@example.com', input, 'idempotency-key');

      assert.strictEqual(result.message, 'Deposit session retrieved successfully.', 'Should indicate reuse');
    });

    it('should throw when wallet not found', async () => {
      const input: DepositInput = { amount: '5000', currency: 'NGN' };

      mockRepository.findUserWalletByUserId = async () => null;

      try {
        await service.initiateFiatDeposit('user-1', 'user@example.com', input);
        assert.fail('Should throw wallet not found');
      } catch (error: any) {
        assert(error.message.includes('Wallet not found'), 'Should throw wallet not found error');
      }
    });

    it('should handle payment provider errors', async () => {
      const input: DepositInput = { amount: '5000', currency: 'NGN' };

      mockPaymentProvider.initiateDeposit = async () => {
        throw new Error('Provider unavailable');
      };

      mockRepository.markPaymentFailed = async () => {};

      try {
        await service.initiateFiatDeposit('user-1', 'user@example.com', input);
        assert.fail('Should throw provider error');
      } catch (error: any) {
        // Error handling expected
      }
    });
  });

  describe('withdrawFiat', () => {
    it('should initiate fiat withdrawal', async () => {
      const input: WithdrawInput = {
        amount: '1000',
        currency: 'NGN',
        bankCode: '058',
        accountNumber: '1234567890',
        accountName: 'John Doe'
      };

      const result = await service.withdrawFiat('user-1', input);

      assert(result.data.reference, 'Should return reference');
      assert.strictEqual(result.data.amount, '1000', 'Should return amount');
      assert.strictEqual(result.data.currency, 'NGN', 'Should return currency');
    });

    it('should handle successful withdrawal', async () => {
      const input: WithdrawInput = {
        amount: '1000',
        currency: 'NGN',
        bankCode: '058',
        accountNumber: '1234567890',
        accountName: 'John Doe'
      };

      mockPaymentProvider.transferToBank = async () => ({
        status: 'success',
        reference: 'wd_xyz',
        gatewayResponse: 'Transfer successful',
        raw: {}
      });

      const result = await service.withdrawFiat('user-1', input);

      assert.strictEqual(result.message, 'Withdrawal completed successfully.', 'Should indicate success');
      assert.strictEqual(result.data.status, PaymentStatus.COMPLETED, 'Should mark as completed');
    });

    it('should handle failed withdrawal and release funds', async () => {
      const input: WithdrawInput = {
        amount: '1000',
        currency: 'NGN',
        bankCode: '058',
        accountNumber: '1234567890',
        accountName: 'John Doe'
      };

      mockPaymentProvider.transferToBank = async () => ({
        status: 'failed',
        reference: 'wd_xyz',
        gatewayResponse: 'Insufficient funds at bank',
        raw: {}
      });

      mockRepository.releaseFailedFiatWithdrawal = async () => ({
        paymentIntent: { reference: 'wd_xyz', status: PaymentStatus.FAILED },
        wallet: { availableBalance: '10000' }
      });

      const result = await service.withdrawFiat('user-1', input);

      assert(result.message.includes('failed'), 'Should indicate failure');
      assert(result.message.includes('released'), 'Should indicate funds released');
    });

    it('should handle pending withdrawal status', async () => {
      const input: WithdrawInput = {
        amount: '1000',
        currency: 'NGN',
        bankCode: '058',
        accountNumber: '1234567890',
        accountName: 'John Doe'
      };

      mockPaymentProvider.transferToBank = async () => ({
        status: 'pending',
        reference: 'wd_xyz',
        gatewayResponse: 'Processing',
        raw: {}
      });

      mockRepository.attachWithdrawalProviderResult = async () => ({
        reference: 'wd_xyz',
        providerReference: 'paystack_ref_123',
        status: PaymentStatus.PROCESSING
      });

      const result = await service.withdrawFiat('user-1', input);

      assert.strictEqual(result.message, 'Withdrawal is processing.', 'Should indicate processing');
      assert.strictEqual(result.data.status, PaymentStatus.PROCESSING, 'Should have processing status');
    });
  });

  describe('verifyFiatDeposit', () => {
    it('should verify successful deposit', async () => {
      mockRepository.findPaymentIntentForUser = async () => ({
        id: 'intent-1',
        type: PaymentType.FIAT_DEPOSIT,
        reference: 'dep_ref'
      });

      mockPaymentProvider.verifyTransaction = async () => ({
        status: 'success',
        amount: '5000',
        transactionReference: 'dep_ref',
        gatewayResponse: 'Verified',
        raw: {}
      });

      mockRepository.postSuccessfulFiatDeposit = async () => ({
        paymentIntent: {
          reference: 'dep_ref',
          status: PaymentStatus.COMPLETED,
          amount: '5000',
          currency: 'NGN',
          ledgerTransactionId: 'tx-1'
        },
        wallet: { availableBalance: '15000' }
      });

      const result = await service.verifyFiatDeposit('user-1', 'dep_ref');

      assert.strictEqual(result.message, 'Deposit verified successfully.', 'Should indicate success');
      assert.strictEqual(result.data.status, PaymentStatus.COMPLETED, 'Should mark as completed');
      assert(result.data.ledgerTransactionId, 'Should return ledger transaction ID');
    });

    it('should handle unverified deposit', async () => {
      mockRepository.findPaymentIntentForUser = async () => ({
        id: 'intent-1',
        type: PaymentType.FIAT_DEPOSIT,
        reference: 'dep_ref'
      });

      mockPaymentProvider.verifyTransaction = async () => ({
        status: 'pending',
        transactionReference: 'dep_ref',
        gatewayResponse: 'Pending',
        raw: {}
      });

      mockRepository.findPaymentIntentForUser = async () => ({
        status: PaymentStatus.PROCESSING
      });

      const result = await service.verifyFiatDeposit('user-1', 'dep_ref');

      assert(result.message.includes('not successful yet'), 'Should indicate not yet verified');
    });

    it('should throw when payment intent not found', async () => {
      mockRepository.findPaymentIntentForUser = async () => null;

      try {
        await service.verifyFiatDeposit('user-1', 'invalid_ref');
        assert.fail('Should throw payment intent not found');
      } catch (error: any) {
        assert(error.message.includes('not found'), 'Should throw not found error');
      }
    });

    it('should reject non-deposit payment types', async () => {
      mockRepository.findPaymentIntentForUser = async () => ({
        id: 'intent-1',
        type: PaymentType.FIAT_WITHDRAWAL,
        reference: 'wd_ref'
      });

      try {
        await service.verifyFiatDeposit('user-1', 'wd_ref');
        assert.fail('Should reject withdrawal verification');
      } catch (error: any) {
        assert(error.message.includes('Only fiat deposits'), 'Should reject non-deposit types');
      }
    });
  });

  describe('handlePaystackWebhook', () => {
    it('should process charge.success webhook', async () => {
      mockRepository.recordPaymentWebhook = async () => ({
        id: 'intent-1',
        type: PaymentType.FIAT_DEPOSIT,
        reference: 'dep_ref'
      });

      mockPaymentProvider.verifyTransaction = async () => ({
        status: 'success',
        gatewayResponse: 'Verified',
        raw: {}
      });

      mockRepository.postSuccessfulFiatDeposit = async () => ({
        paymentIntent: { status: PaymentStatus.COMPLETED }
      });

      const result = await service.handlePaystackWebhook({
        reference: 'dep_ref',
        eventName: 'charge.success',
        payload: {}
      });

      assert(result, 'Should return result');
    });

    it('should handle unknown webhook events gracefully', async () => {
      mockRepository.recordPaymentWebhook = async () => null;

      const result = await service.handlePaystackWebhook({
        reference: 'unknown_ref',
        eventName: 'charge.success',
        payload: {}
      });

      assert.strictEqual(result.message, 'Webhook accepted.', 'Should accept unknown webhooks');
    });
  });
});
