import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { AppError } from "../../utils/ErrorHandler";
import type { IBlockchainProvider } from "./external/interfaces/IBlockchainProvider";
import type { IPaymentProvider } from "./external/interfaces/IPaymentProvider";
import type {
  BalanceQueryInput,
  DepositInput,
  TransactionsQueryInput,
  TransferInput,
  WithdrawInput,
} from "./http/wallet.schema";
import { WalletRepository } from "./wallet.repository";

export class WalletService {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly paymentProvider: IPaymentProvider,
    private readonly blockchainProvider: IBlockchainProvider,
  ) {}

  public async getBalance(userId: string, input: BalanceQueryInput) {
    const { wallet, recentActivity } = await this.walletRepository.getBalanceWithRecentActivity(userId, input);

    return {
      message: "Wallet balance retrieved successfully.",
      data: {
        wallet: {
          id: wallet.id,
          currency: wallet.currency,
          type: wallet.type,
          availableBalance: wallet.availableBalance.toString(),
          pendingBalance: wallet.pendingBalance.toString(),
          reservedBalance: wallet.reservedBalance.toString(),
        },
        recentActivity: recentActivity.map((transaction) => ({
          id: transaction.id,
          reference: transaction.externalReference,
          type: transaction.type,
          status: transaction.status,
          amount: transaction.amount.toString(),
          currency: transaction.currency,
          description: transaction.description,
          createdAt: transaction.createdAt,
        })),
      },
    };
  }

  public async transferP2P(senderUserId: string, input: TransferInput) {
    const receiverWallet = await this.walletRepository.findUserWalletByFinxTag(input.finxTag);

    if (!receiverWallet) {
      throw AppError.notFound("Receiver account not found.");
    }

    if (receiverWallet.userId === senderUserId) {
      throw new AppError("You cannot transfer funds to yourself.", 400, {
        code: "SELF_TRANSFER_NOT_ALLOWED",
      });
    }

    const result = await this.walletRepository.executeP2PTransfer(
      senderUserId,
      input,
      `p2p_${randomUUID()}`,
    );

    return {
      message: "Transfer completed successfully.",
      data: {
        reference: result.ledgerTransaction.externalReference,
        amount: result.ledgerTransaction.amount.toString(),
        currency: result.ledgerTransaction.currency,
        receiver: {
          id: result.receiverUser.id,
          finxTag: result.receiverUser.finxTag,
          email: result.receiverUser.email,
        },
        senderBalance: result.senderWallet.availableBalance.toString(),
      },
    };
  }

  public async initiateFiatDeposit(userId: string, email: string, input: DepositInput) {
    const wallet = await this.walletRepository.findUserWalletByUserId(userId);

    if (!wallet) {
      throw AppError.notFound("Wallet not found.");
    }

    try {
      const reference = `dep_${randomUUID()}`;
      const session = await this.paymentProvider.initiateDeposit({
        amount: input.amount,
        currency: input.currency,
        email,
        ...(input.callbackUrl
          ? {
              callbackUrl: input.callbackUrl,
            }
          : {}),
        reference,
      });

      return {
        message: "Deposit session initialized successfully.",
        data: session,
      };
    } catch (error) {
      throw this.wrapProviderError(error);
    }
  }

  public async withdrawFiat(userId: string, input: WithdrawInput) {
    const wallet = await this.walletRepository.findUserWalletByUserId(userId);

    if (!wallet) {
      throw AppError.notFound("Wallet not found.");
    }

    const amount = new Prisma.Decimal(input.amount);

    if (wallet.availableBalance.lessThan(amount)) {
      throw new AppError("Insufficient funds.", 409, {
        code: "INSUFFICIENT_FUNDS",
      });
    }

    const reference = `wd_${randomUUID()}`;

    try {
      const providerResult = await this.paymentProvider.transferToBank({
        amount: input.amount,
        currency: input.currency,
        bankCode: input.bankCode,
        accountNumber: input.accountNumber,
        accountName: input.accountName,
        ...(input.narration
          ? {
              narration: input.narration,
            }
          : {}),
        reference,
      });

      if (providerResult.status === "failed") {
        throw new AppError("Payment provider is unavailable.", 503, {
          code: "PROVIDER_UNAVAILABLE",
        });
      }

      const result = await this.walletRepository.recordFiatWithdrawal(
        userId,
        input,
        providerResult.reference,
        providerResult.provider,
      );

      return {
        message: "Withdrawal completed successfully.",
        data: {
          reference: result.ledgerTransaction.externalReference,
          amount: result.ledgerTransaction.amount.toString(),
          currency: result.ledgerTransaction.currency,
          walletBalance: result.wallet.availableBalance.toString(),
        },
      };
    } catch (error) {
      throw this.wrapProviderError(error);
    }
  }

  public async getTransactions(userId: string, input: TransactionsQueryInput) {
    const result = await this.walletRepository.getTransactionHistory(userId, input);

    return {
      message: "Transactions retrieved successfully.",
      data: {
        items: result.items.map((transaction) => ({
          id: transaction.id,
          reference: transaction.externalReference,
          type: transaction.type,
          status: transaction.status,
          amount: transaction.amount.toString(),
          currency: transaction.currency,
          description: transaction.description,
          createdAt: transaction.createdAt,
        })),
        pagination: {
          page: input.page,
          limit: input.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / input.limit),
        },
      },
    };
  }

  private wrapProviderError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    return new AppError("Payment provider is unavailable.", 503, {
      code: "PROVIDER_UNAVAILABLE",
      cause: error,
    });
  }
}
