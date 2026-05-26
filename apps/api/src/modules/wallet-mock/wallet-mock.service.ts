import { randomUUID } from 'node:crypto';
import { AppError } from '../../utils/ErrorHandler';
import type { BalanceQueryInput, DepositInput, TransactionsQueryInput, TransferInput, WithdrawInput } from './http/wallet-mock.schema';
import { WalletMockRpository } from './wallet-mock.repository';
import { verifyUserKycProfile } from './wallet-mock.helpers';
import { queuePublishEmail } from '../pub-sub';
import { EMAIL_TEMPLATES } from '../../utils/emailTemplates';

export class WalletMockService {
  constructor(private readonly walletMockRepo: WalletMockRpository) {}

  public async getBalance(userId: string, input: BalanceQueryInput) {
    const { wallet, recentActivity } = await this.walletMockRepo.getBalanceWithRecentActivity(userId, input);

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

  public async transferP2P(senderUserId: string, senderEmail: string, input: TransferInput) {
    const isKycVerified = await verifyUserKycProfile(senderUserId);
    if (!isKycVerified.verified) {
      const err = new AppError('Unable to transfer , Kyc not verified', 200);
      console.log(['ERR : ', err]);
      throw err;
    }

    const receiverWallet = await this.walletMockRepo.findUserWalletByFinxTag(input.finxTag);

    if (!receiverWallet) {
      throw AppError.notFound('Receiver account not found.');
    }

    if (receiverWallet.userId === senderUserId) {
      throw new AppError('You cannot transfer funds to yourself.', 400, {
        code: 'SELF_TRANSFER_NOT_ALLOWED'
      });
    }

    const result = await this.walletMockRepo.executeP2PTransfer(senderUserId, input, `p2p_${randomUUID()}`);

    if (result.success) {
      const transferMailSubject = EMAIL_TEMPLATES.TRANSFER.subject(input.amount);
      const transferMailBody = EMAIL_TEMPLATES.TRANSFER.body(senderEmail, input.amount, receiverWallet.user.finxTag);
      const depositMailSubject = EMAIL_TEMPLATES.DEPOSIT.subject(input.amount);
      const depositMailBody = EMAIL_TEMPLATES.DEPOSIT.body(receiverWallet.user.email, input.amount);
      await queuePublishEmail({ to: senderEmail, subject: transferMailSubject, body: transferMailBody });
      await queuePublishEmail({ to: receiverWallet.user.email, subject: depositMailSubject, body: depositMailBody });
    }

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

  /**
   * MOCK: Creates a deposit intent and immediately funds the wallet.
   * No external provider, no authorization URL, no webhook needed.
   */
  public async initiateFiatDeposit(userId: string, email: string, input: DepositInput, idempotencyKey?: string | undefined) {
    const isKycVerified = await verifyUserKycProfile(userId);
    if (!isKycVerified.verified) {
      throw AppError.badRequest('Kyc not verified');
    }
    const wallet = await this.walletMockRepo.findUserWalletByUserId(userId);

    if (!wallet) {
      throw AppError.notFound('Wallet not found.');
    }

    const reference = `dep_${randomUUID()}`;

    const intentResult = await this.walletMockRepo.createFiatDepositIntent({
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
          provider: 'mock',
          reference: intentResult.paymentIntent.reference,
          status: intentResult.paymentIntent.status
        }
      };
    }

    const result = await this.walletMockRepo.postMockFiatDeposit(reference);

    const subject = EMAIL_TEMPLATES.DEPOSIT.subject(input.amount);
    const body = EMAIL_TEMPLATES.DEPOSIT.body(email, input.amount);
    await queuePublishEmail({ to: email, subject, body });

    return {
      message: 'Deposit completed successfully.',
      data: {
        provider: 'mock',
        reference: result.paymentIntent.reference,
        status: result.paymentIntent.status,
        amount: result.paymentIntent.amount.toString(),
        currency: result.paymentIntent.currency,
        walletBalance: result.wallet.availableBalance.toString(),
        ledgerTransactionId: result.paymentIntent.ledgerTransactionId
      }
    };
  }

  /**
   * MOCK: Reserves funds and immediately settles the withdrawal.
   * No external provider call, no bank transfer, no webhook needed.
   */
  public async withdrawFiat(userId: string, input: WithdrawInput, idempotencyKey?: string | undefined) {
    const isKycVerified = await verifyUserKycProfile(userId);
    if (!isKycVerified.verified) {
      throw AppError.badRequest(isKycVerified.message ?? 'Unable to process this request , please Verify Kyc and try again Later', 200);
    }
    const reference = `wd_${randomUUID()}`;

    const reservation = await this.walletMockRepo.reserveFiatWithdrawal({
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
          walletBalance: reservation.wallet!.availableBalance.toString(),
          reservedBalance: reservation.wallet!.reservedBalance.toString()
        }
      };
    }

    const result = await this.walletMockRepo.settleSuccessfulFiatWithdrawal(reference);

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

  public async getTransactions(userId: string, input: TransactionsQueryInput) {
    const result = await this.walletMockRepo.getTransactionHistory(userId, input);

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
}
