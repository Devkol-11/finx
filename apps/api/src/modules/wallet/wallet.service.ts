import { randomUUID } from 'node:crypto';
import { PaymentStatus, PaymentType } from '@prisma/client';
import { PaymentProvider } from '@prisma/client';
import { AppError } from '../../utils/ErrorHandler';
import type { IPaymentProvider } from './external/interfaces/IPaymentProvider';
import type { BalanceQueryInput, DepositInput, TransactionsQueryInput, TransferInput, WithdrawInput } from './http/wallet.schema';
import { WalletRepository } from './wallet.repository';

export class WalletService {
  constructor(private readonly walletRepository: WalletRepository, private readonly paymentProvider: IPaymentProvider) {}

  public async getBalance(userId: string, input: BalanceQueryInput) {
    const { wallet, recentActivity } = await this.walletRepository.getBalanceWithRecentActivity(userId, input);

    return {
      message: 'Wallet balance retrieved successfully.',
      data: {
        wallet: {
          id: wallet.id,
          currency: wallet.currency,
          type: wallet.type,
          availableBalance: wallet.availableBalance.toString(),
          pendingBalance: wallet.pendingBalance.toString(),
          reservedBalance: wallet.reservedBalance.toString()
        },
        recentActivity: recentActivity.map((transaction) => ({
          id: transaction.id,
          reference: transaction.externalReference,
          type: transaction.type,
          status: transaction.status,
          amount: transaction.amount.toString(),
          currency: transaction.currency,
          description: transaction.description,
          createdAt: transaction.createdAt
        }))
      }
    };
  }

  public async transferP2P(senderUserId: string, input: TransferInput) {
    const receiverWallet = await this.walletRepository.findUserWalletByFinxTag(input.finxTag);

    if (!receiverWallet) {
      throw AppError.notFound('Receiver account not found.');
    }

    if (receiverWallet.userId === senderUserId) {
      throw new AppError('You cannot transfer funds to yourself.', 400, {
        code: 'SELF_TRANSFER_NOT_ALLOWED'
      });
    }

    const result = await this.walletRepository.executeP2PTransfer(senderUserId, input, `p2p_${randomUUID()}`);

    return {
      message: 'Transfer completed successfully.',
      data: {
        reference: result.ledgerTransaction.externalReference,
        amount: result.ledgerTransaction.amount.toString(),
        currency: result.ledgerTransaction.currency,
        receiver: {
          id: result.receiverUser.id,
          finxTag: result.receiverUser.finxTag,
          email: result.receiverUser.email
        },
        senderBalance: result.senderWallet.availableBalance.toString()
      }
    };
  }

  public async initiateFiatDeposit(userId: string, email: string, input: DepositInput, idempotencyKey?: string | undefined) {
    const wallet = await this.walletRepository.findUserWalletByUserId(userId);

    if (!wallet) {
      throw AppError.notFound('Wallet not found.');
    }

    const reference = `dep_${randomUUID()}`;
    const intentResult = await this.walletRepository.createFiatDepositIntent({
      userId,
      walletId: wallet.id,
      email,
      body: input,
      reference,
      idempotencyKey
    });

    if (intentResult.reused) {
      return {
        message: 'Deposit session retrieved successfully.',
        data: {
          provider: PaymentProvider.PAYSTACK,
          reference: intentResult.paymentIntent.reference,
          authorizationUrl: intentResult.paymentIntent.authorizationUrl,
          accessCode: intentResult.paymentIntent.accessCode,
          status: intentResult.paymentIntent.status
        }
      };
    }

    try {
      const session = await this.paymentProvider.initiateDeposit({
        amount: input.amount,
        currency: input.currency,
        email,
        ...(input.callbackUrl
          ? {
              callbackUrl: input.callbackUrl
            }
          : {}),
        reference,
        metadata: {
          paymentIntentId: intentResult.paymentIntent.id,
          userId,
          walletId: wallet.id,
          type: 'FIAT_DEPOSIT'
        }
      });
      const updatedIntent = await this.walletRepository.markDepositInitialized(intentResult.paymentIntent.id, session);

      return {
        message: 'Deposit session initialized successfully.',
        data: {
          ...session,
          status: updatedIntent.status
        }
      };
    } catch (error) {
      await this.walletRepository.markPaymentFailed(
        intentResult.paymentIntent.reference,
        'Payment provider failed to initialize the deposit.',
        error instanceof Error ? { message: error.message } : undefined
      );
      throw this.wrapProviderError(error);
    }
  }

  public async withdrawFiat(userId: string, input: WithdrawInput, idempotencyKey?: string | undefined) {
    const reference = `wd_${randomUUID()}`;
    const reservation = await this.walletRepository.reserveFiatWithdrawal({
      userId,
      body: input,
      reference,
      idempotencyKey
    });

    if (reservation.reused) {
      return {
        message: 'Withdrawal request retrieved successfully.',
        data: {
          reference: reservation.paymentIntent.reference,
          amount: reservation.paymentIntent.amount.toString(),
          currency: reservation.paymentIntent.currency,
          status: reservation.paymentIntent.status,
          walletBalance: reservation.wallet.availableBalance.toString(),
          reservedBalance: reservation.wallet.reservedBalance.toString()
        }
      };
    }

    try {
      const providerResult = await this.paymentProvider.transferToBank({
        amount: input.amount,
        currency: input.currency,
        bankCode: input.bankCode,
        accountNumber: input.accountNumber,
        accountName: input.accountName,
        ...(input.narration
          ? {
              narration: input.narration
            }
          : {}),
        reference,
        metadata: {
          paymentIntentId: reservation.paymentIntent.id,
          userId,
          type: 'FIAT_WITHDRAWAL'
        }
      });
      const providerIntent = await this.walletRepository.attachWithdrawalProviderResult(reservation.paymentIntent.reference, providerResult);

      if (providerResult.status === 'failed') {
        const released = await this.walletRepository.releaseFailedFiatWithdrawal(
          reservation.paymentIntent.reference,
          providerResult.gatewayResponse ?? 'Paystack transfer failed.',
          providerResult.raw
        );

        return {
          message: 'Withdrawal failed and reserved funds were released.',
          data: {
            reference: released.paymentIntent.reference,
            amount: released.paymentIntent.amount.toString(),
            currency: released.paymentIntent.currency,
            status: released.paymentIntent.status,
            walletBalance: released.wallet.availableBalance.toString()
          }
        };
      }

      if (providerResult.status === 'success') {
        const result = await this.walletRepository.settleSuccessfulFiatWithdrawal(reservation.paymentIntent.reference, providerResult.raw);

        return {
          message: 'Withdrawal completed successfully.',
          data: {
            reference: result.paymentIntent.reference,
            amount: result.paymentIntent.amount.toString(),
            currency: result.paymentIntent.currency,
            status: result.paymentIntent.status,
            walletBalance: result.wallet.availableBalance.toString(),
            reservedBalance: result.wallet.reservedBalance.toString()
          }
        };
      }

      return {
        message: 'Withdrawal is processing.',
        data: {
          reference: providerIntent.reference,
          providerReference: providerIntent.providerReference,
          amount: providerIntent.amount.toString(),
          currency: providerIntent.currency,
          status: providerIntent.status,
          walletBalance: reservation.wallet.availableBalance.toString(),
          reservedBalance: reservation.wallet.reservedBalance.toString()
        }
      };
    } catch (error) {
      await this.walletRepository.releaseFailedFiatWithdrawal(
        reservation.paymentIntent.reference,
        error instanceof Error ? error.message : 'Payment provider failed to process withdrawal.',
        error instanceof Error ? { message: error.message } : undefined
      );
      throw this.wrapProviderError(error);
    }
  }

  public async verifyFiatDeposit(userId: string, reference: string) {
    const paymentIntent = await this.walletRepository.findPaymentIntentForUser(userId, reference);

    if (!paymentIntent) {
      throw AppError.notFound('Payment intent not found.');
    }

    if (paymentIntent.type !== PaymentType.FIAT_DEPOSIT) {
      throw AppError.badRequest('Only fiat deposits can be verified through this endpoint.');
    }

    const verification = await this.paymentProvider.verifyTransaction(reference);

    if (verification.status === 'success') {
      const result = await this.walletRepository.postSuccessfulFiatDeposit(reference, verification);

      return {
        message: 'Deposit verified successfully.',
        data: {
          reference: result.paymentIntent.reference,
          status: result.paymentIntent.status,
          amount: result.paymentIntent.amount.toString(),
          currency: result.paymentIntent.currency,
          walletBalance: result.wallet.availableBalance.toString(),
          ledgerTransactionId: result.paymentIntent.ledgerTransactionId
        }
      };
    }

    if (verification.status === 'failed' || verification.status === 'abandoned') {
      await this.walletRepository.markPaymentFailed(
        reference,
        verification.gatewayResponse ?? `Paystack marked transaction as ${verification.status}.`,
        verification.raw
      );
    }

    const refreshedIntent = await this.walletRepository.findPaymentIntentForUser(userId, reference);

    return {
      message: 'Deposit is not successful yet.',
      data: {
        reference,
        status: refreshedIntent?.status ?? PaymentStatus.PROCESSING,
        providerStatus: verification.status
      }
    };
  }

  public async handlePaystackWebhook(input: { reference: string; eventName: string; payload: unknown }) {
    const paymentIntent = await this.walletRepository.recordPaymentWebhook(input);

    if (!paymentIntent) {
      return {
        message: 'Webhook accepted.'
      };
    }

    if (paymentIntent.type === PaymentType.FIAT_DEPOSIT && input.eventName === 'charge.success') {
      const verification = await this.paymentProvider.verifyTransaction(paymentIntent.reference);

      if (verification.status === 'success') {
        await this.walletRepository.postSuccessfulFiatDeposit(paymentIntent.reference, verification);
      }
    }

    if (paymentIntent.type === PaymentType.FIAT_WITHDRAWAL) {
      if (input.eventName === 'transfer.success') {
        await this.walletRepository.settleSuccessfulFiatWithdrawal(paymentIntent.reference, input.payload);
      }

      if (input.eventName === 'transfer.failed' || input.eventName === 'transfer.reversed') {
        await this.walletRepository.releaseFailedFiatWithdrawal(
          paymentIntent.reference,
          `Paystack webhook reported ${input.eventName}.`,
          input.payload
        );
      }
    }

    return {
      message: 'Webhook processed.'
    };
  }

  public async getTransactions(userId: string, input: TransactionsQueryInput) {
    const result = await this.walletRepository.getTransactionHistory(userId, input);

    return {
      message: 'Transactions retrieved successfully.',
      data: {
        items: result.items.map((transaction) => ({
          id: transaction.id,
          reference: transaction.externalReference,
          type: transaction.type,
          status: transaction.status,
          amount: transaction.amount.toString(),
          currency: transaction.currency,
          description: transaction.description,
          createdAt: transaction.createdAt
        })),
        pagination: {
          page: input.page,
          limit: input.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / input.limit)
        }
      }
    };
  }

  private wrapProviderError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    return new AppError('Payment provider is unavailable.', 503, {
      code: 'PROVIDER_UNAVAILABLE',
      cause: error
    });
  }
}
