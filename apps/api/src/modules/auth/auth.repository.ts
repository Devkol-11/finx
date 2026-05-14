import { Prisma, PrismaClient, SessionRevocationReason, UserStatus, WalletCurrency, WalletType } from '@prisma/client';
import type { ForgotInput, RegisterInput } from './http/auth.schema';

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
        deletedAt: null
      }
    });
  }

  public async findActiveUserById(userId: string) {
    return this.prisma.user.findFirst({
      where: {
        id: userId,
        status: UserStatus.ACTIVE,
        deletedAt: null
      }
    });
  }

  public async findUserByEmailWithWallets(email: string) {
    return this.prisma.user.findFirst({
      where: {
        email,
        deletedAt: null
      },
      include: {
        wallets: true
      }
    });
  }

  public async findActiveUserByResetToken(tokenHash: string) {
    return this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        user: true
      }
    });
  }

  public async existsByFinxTag(finxTag: string): Promise<boolean> {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        finxTag
      },
      select: {
        id: true
      }
    });

    return Boolean(existingUser);
  }

  public async existsByEmail(email: string): Promise<boolean> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email,
        status: UserStatus.ACTIVE,
        deletedAt: null
      },
      select: {
        id: true
      }
    });

    return Boolean(existingUser);
  }

  public async registerUserWithWallet(input: RegisterInput, passwordHash: string, finxTag: string) {
    return this.prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: {
          email: input.email,
          phoneNumber: input.phoneNumber,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          passwordHash,
          finxTag,
          status: UserStatus.ACTIVE
        }
      });

      const createdWallet = await transaction.wallet.create({
        data: {
          userId: createdUser.id,
          type: WalletType.FIAT,
          currency: WalletCurrency.NGN
        }
      });

      await transaction.kycProfile.create({
        data: {
          userId: createdUser.id
        }
      });

      return {
        user: createdUser,
        wallet: createdWallet
      };
    });
  }

  public async updateLastLoginAt(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: {
        id: userId
      },
      data: {
        lastLoginAt: new Date()
      }
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
          expiresAt
        }
      });
    });

    return user;
  }

  public async resetPassword(userId: string, resetTokenId: string, passwordHash: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: {
          id: userId
        },
        data: {
          passwordHash
        }
      });

      await transaction.passwordResetToken.update({
        where: {
          id: resetTokenId
        },
        data: {
          usedAt: new Date()
        }
      });

      await this.invalidateOutstandingPasswordResetTokens(transaction, userId, resetTokenId);

      await this.revokeAllSessionsForUser(userId, SessionRevocationReason.PASSWORD_RESET, transaction);
    });
  }

  public async createSession(input: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string | undefined;
    ipAddress?: string | undefined;
  }) {
    return this.prisma.session.create({
      data: {
        id: input.id,
        userId: input.userId,
        refreshTokenHash: input.refreshTokenHash,
        expiresAt: input.expiresAt,
        userAgent: input.userAgent ?? null,
        ipAddress: input.ipAddress ?? null
      }
    });
  }

  public async findSessionByRefreshTokenHash(refreshTokenHash: string) {
    return this.prisma.session.findUnique({
      where: {
        refreshTokenHash
      },
      include: {
        user: true
      }
    });
  }

  public async rotateSessionForUser(input: {
    currentSessionId: string;
    newSessionId: string;
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string | undefined;
    ipAddress?: string | undefined;
  }) {
    return this.prisma.$transaction(async (transaction) => {
      const newSession = await transaction.session.create({
        data: {
          id: input.newSessionId,
          userId: input.userId,
          refreshTokenHash: input.refreshTokenHash,
          expiresAt: input.expiresAt,
          userAgent: input.userAgent ?? null,
          ipAddress: input.ipAddress ?? null,
          lastUsedAt: new Date()
        }
      });

      await transaction.session.update({
        where: {
          id: input.currentSessionId
        },
        data: {
          revokedAt: new Date(),
          revocationReason: SessionRevocationReason.ROTATED,
          replacedBySessionId: newSession.id,
          lastUsedAt: new Date()
        }
      });

      return newSession;
    });
  }

  public async markSessionUsed(sessionId: string): Promise<void> {
    await this.prisma.session.update({
      where: {
        id: sessionId
      },
      data: {
        lastUsedAt: new Date()
      }
    });
  }

  public async revokeSession(sessionId: string, reason: SessionRevocationReason): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        id: sessionId,
        revokedAt: null
      },
      data: {
        revokedAt: new Date(),
        revocationReason: reason
      }
    });
  }

  public async revokeAllSessionsForUser(userId: string, reason: SessionRevocationReason, transaction?: TransactionClient): Promise<void> {
    const client = transaction ?? this.prisma;

    await client.session.updateMany({
      where: {
        userId,
        revokedAt: null
      },
      data: {
        revokedAt: new Date(),
        revocationReason: reason
      }
    });
  }

  public async flagRefreshTokenReuse(sessionId: string, userId: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.session.update({
        where: {
          id: sessionId
        },
        data: {
          reuseDetectedAt: new Date(),
          revokedAt: new Date(),
          revocationReason: SessionRevocationReason.TOKEN_REUSE_DETECTED
        }
      });

      await this.revokeAllSessionsForUser(userId, SessionRevocationReason.TOKEN_REUSE_DETECTED, transaction);
    });
  }

  private async invalidateOutstandingPasswordResetTokens(transaction: TransactionClient, userId: string, excludeTokenId?: string): Promise<void> {
    await transaction.passwordResetToken.updateMany({
      where: {
        userId,
        usedAt: null,
        ...(excludeTokenId
          ? {
              id: {
                not: excludeTokenId
              }
            }
          : {})
      },
      data: {
        usedAt: new Date()
      }
    });
  }
}
