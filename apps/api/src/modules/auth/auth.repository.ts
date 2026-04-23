import { Prisma, PrismaClient, UserStatus, WalletCurrency, WalletType } from "@prisma/client";
import type { ForgotInput, RegisterInput } from "./http/auth.schema";

type TransactionClient = Prisma.TransactionClient;

/**
 * Repository isolates Prisma persistence details from the Auth service.
 */
export class AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findUserByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    });
  }

  public async findUserByEmailWithWallets(email: string) {
    return this.prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
      include: {
        wallets: true,
      },
    });
  }

  public async findActiveUserByResetToken(tokenHash: string) {
    return this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });
  }

  public async existsByFinxTag(finxTag: string): Promise<boolean> {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        finxTag,
      },
      select: {
        id: true,
      },
    });

    return Boolean(existingUser);
  }

  public async registerUserWithWallet(
    input: RegisterInput,
    passwordHash: string,
    finxTag: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: {
          email: input.email,
          ...(input.phoneNumber
            ? {
                phoneNumber: input.phoneNumber,
              }
            : {}),
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          passwordHash,
          finxTag,
          status: UserStatus.ACTIVE,
        },
      });

      const createdWallet = await transaction.wallet.create({
        data: {
          userId: createdUser.id,
          type: WalletType.FIAT,
          currency: WalletCurrency.NGN,
        },
      });

      return {
        user: createdUser,
        wallet: createdWallet,
      };
    });
  }

  public async updateLastLoginAt(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }

  public async createPasswordResetToken(input: ForgotInput, tokenHash: string, expiresAt: Date) {
    const user = await this.findUserByEmail(input.email);

    if (!user) {
      return null;
    }

    await this.prisma.$transaction(async (transaction) => {
      await this.invalidateOutstandingPasswordResetTokens(transaction, user.id);

      await transaction.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
    });

    return user;
  }

  public async resetPassword(userId: string, resetTokenId: string, passwordHash: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: {
          id: userId,
        },
        data: {
          passwordHash,
        },
      });

      await transaction.passwordResetToken.update({
        where: {
          id: resetTokenId,
        },
        data: {
          usedAt: new Date(),
        },
      });

      await this.invalidateOutstandingPasswordResetTokens(transaction, userId, resetTokenId);
    });
  }

  private async invalidateOutstandingPasswordResetTokens(
    transaction: TransactionClient,
    userId: string,
    excludeTokenId?: string,
  ): Promise<void> {
    await transaction.passwordResetToken.updateMany({
      where: {
        userId,
        usedAt: null,
        ...(excludeTokenId
          ? {
              id: {
                not: excludeTokenId,
              },
            }
          : {}),
      },
      data: {
        usedAt: new Date(),
      },
    });
  }
}
