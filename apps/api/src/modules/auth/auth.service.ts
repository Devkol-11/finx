import argon2 from 'argon2';
import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { SessionRevocationReason, UserStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type { FastifyInstance } from 'fastify';
import { env } from '../../config/env';
import { AppError } from '../../utils/ErrorHandler';
import { EMAIL_TEMPLATES } from '../../utils/emailTemplates';
import { queuePublishEmail } from '../pub-sub';
import { mapJwtError } from '../../plugins/auth';
import { AuthRepository } from './auth.repository';
import type { ForgotInput, LoginInput, RegisterInput, ResetInput } from './http/auth.schema';
import logger from '../../utils/logger';
import { mockVerifyPhoneNumber } from './auth.helpers';

const PASSWORD_RESET_TOKEN_TTL_MINUTES = 15;
const MAX_FINX_TAG_GENERATION_ATTEMPTS = 10;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type SessionMetadata = {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
};

/**
 * Auth service contains the business rules for account onboarding and access.
 */
export class AuthService {
  constructor(private readonly authRepository: AuthRepository, private readonly jwt: FastifyInstance['jwt']) {}

  public async register(input: RegisterInput, sessionMetadata?: SessionMetadata) {
    logger.info('[AUTH] register called', {
      email: input.email,
      attempt: 0
    });
    const existsByEmail = await this.authRepository.findUserByEmail(input.email);

    if (existsByEmail) {
      throw AppError.conflict('An account already exists with this email address.');
    }

    const existsByPhoneNumber = await this.authRepository.existsByPhoneNumber(input.phoneNumber);

    if (existsByPhoneNumber) {
      throw AppError.conflict('An account already exists with this Phone Number.');
    }

    const phoneNumberVerificationResult = mockVerifyPhoneNumber(input.phoneNumber);

    if (!phoneNumberVerificationResult.verified) {
      throw AppError.badRequest(phoneNumberVerificationResult.reason ?? 'Invalid phone number');
    }

    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id
    });

    for (let attempt = 0; attempt < MAX_FINX_TAG_GENERATION_ATTEMPTS; attempt += 1) {
      logger.info('[AUTH] generating finxTag', { attempt });
      const finxTag = await this.generateUniqueFinxTag(input, attempt);

      try {
        const createdAccount = await this.authRepository.registerUserWithWallet(input, passwordHash, finxTag);

        logger.info('[AUTH] user created successfully', {
          userId: createdAccount.user.id,
          walletId: createdAccount.wallet.id
        });

        const authBundle = await this.createSessionBundle(createdAccount.user.id, createdAccount.user.email, sessionMetadata);

        const subject = EMAIL_TEMPLATES.REGISTERED.subject(createdAccount.user.firstName);
        const body = EMAIL_TEMPLATES.REGISTERED.body(createdAccount.user.firstName);

        logger.info('[AUTH] queueing welcome email', {
          email: createdAccount.user.email
        });
        await queuePublishEmail({
          to: createdAccount.user.email,
          subject,
          body
        });

        logger.info('[AUTH] registration completed', {
          userId: createdAccount.user.id
        });

        return {
          message: 'Registration completed successfully.',
          data: {
            accessToken: authBundle.accessToken,
            accessTokenExpiresIn: env.ACCESS_TOKEN_TTL,
            user: {
              id: createdAccount.user.id,
              email: createdAccount.user.email,
              finxTag: createdAccount.user.finxTag,
              firstName: createdAccount.user.firstName,
              lastName: createdAccount.user.lastName
            },
            wallet: {
              id: createdAccount.wallet.id,
              currency: createdAccount.wallet.currency,
              type: createdAccount.wallet.type,
              availableBalance: createdAccount.wallet.availableBalance.toString()
            },
            session: {
              id: authBundle.session.id,
              expiresAt: authBundle.session.expiresAt.toISOString()
            }
          },
          meta: {
            refreshToken: authBundle.refreshToken
          }
        };
      } catch (error) {
        if (this.isFinxTagConflict(error)) {
          continue;
        }

        throw error;
      }
    }

    throw AppError.internal('Unable to allocate a unique FinxTag for the new account.', {
      isOperational: true
    });
  }

  public async login(input: LoginInput, sessionMetadata?: SessionMetadata) {
    const user = await this.authRepository.findUserByEmailWithWallets(input.email);

    if (!user) {
      throw AppError.unauthorized('Invalid email or password.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw AppError.forbidden('This account is not allowed to sign in.');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, input.password);

    if (!isPasswordValid) {
      throw AppError.unauthorized('Invalid email or password.');
    }

    await this.authRepository.updateLastLoginAt(user.id);

    const authBundle = await this.createSessionBundle(user.id, user.email, sessionMetadata);

    return {
      message: 'Login completed successfully.',
      data: {
        accessToken: authBundle.accessToken,
        accessTokenExpiresIn: env.ACCESS_TOKEN_TTL,
        user: {
          id: user.id,
          email: user.email,
          finxTag: user.finxTag,
          firstName: user.firstName,
          lastName: user.lastName
        },
        session: {
          id: authBundle.session.id,
          expiresAt: authBundle.session.expiresAt.toISOString()
        }
      },
      meta: {
        refreshToken: authBundle.refreshToken
      }
    };
  }

  public async refreshSession(refreshToken: string, sessionMetadata?: SessionMetadata) {
    const payload = this.verifyRefreshToken(refreshToken);
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const existingSession = await this.authRepository.findSessionByRefreshTokenHash(refreshTokenHash);

    if (!existingSession) {
      throw new AppError('Refresh token is invalid.', 401, {
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    if (payload.userId !== existingSession.userId || payload.sessionId !== existingSession.id || payload.type !== 'refresh') {
      await this.authRepository.flagRefreshTokenReuse(existingSession.id, existingSession.userId);

      throw new AppError('Refresh token is invalid.', 401, {
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    if (
      existingSession.revokedAt ||
      existingSession.replacedBySessionId ||
      existingSession.revocationReason === SessionRevocationReason.ROTATED ||
      existingSession.revocationReason === SessionRevocationReason.TOKEN_REUSE_DETECTED
    ) {
      await this.authRepository.flagRefreshTokenReuse(existingSession.id, existingSession.userId);

      throw new AppError('Refresh token reuse detected. All sessions have been revoked.', 401, {
        code: 'REFRESH_TOKEN_REUSE_DETECTED'
      });
    }

    if (existingSession.expiresAt <= new Date()) {
      await this.authRepository.revokeSession(existingSession.id, SessionRevocationReason.SECURITY_REVOKED);

      throw new AppError('Refresh token has expired.', 401, {
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }

    if (existingSession.user.status !== UserStatus.ACTIVE || existingSession.user.deletedAt) {
      await this.authRepository.revokeAllSessionsForUser(existingSession.userId, SessionRevocationReason.SECURITY_REVOKED);

      throw AppError.forbidden('This account is not allowed to sign in.');
    }

    const nextSessionId = randomUUID();
    const nextRefreshToken = this.issueRefreshToken({
      userId: existingSession.userId,
      sessionId: nextSessionId
    });
    const nextRefreshTokenExpiresAt = this.buildRefreshTokenExpiryDate();

    const rotatedSession = await this.authRepository.rotateSessionForUser({
      currentSessionId: existingSession.id,
      newSessionId: nextSessionId,
      userId: existingSession.userId,
      refreshTokenHash: this.hashRefreshToken(nextRefreshToken),
      expiresAt: nextRefreshTokenExpiresAt,
      userAgent: sessionMetadata?.userAgent,
      ipAddress: sessionMetadata?.ipAddress
    });

    const accessToken = await this.issueAccessToken(existingSession.userId, existingSession.user.email, rotatedSession.id);

    return {
      message: 'Session refreshed successfully.',
      data: {
        accessToken,
        accessTokenExpiresIn: env.ACCESS_TOKEN_TTL,
        user: {
          id: existingSession.user.id,
          email: existingSession.user.email,
          finxTag: existingSession.user.finxTag,
          firstName: existingSession.user.firstName,
          lastName: existingSession.user.lastName
        },
        session: {
          id: rotatedSession.id,
          expiresAt: rotatedSession.expiresAt.toISOString()
        }
      },
      meta: {
        refreshToken: nextRefreshToken
      }
    };
  }

  public async logout(sessionId: string): Promise<void> {
    await this.authRepository.revokeSession(sessionId, SessionRevocationReason.LOGGED_OUT);
  }

  public async forgotPassword(input: ForgotInput) {
    const existingUser = await this.authRepository.existsByEmail(input.email);

    if (!existingUser) {
      return {
        message: 'If the account exists, a password reset email has been sent.'
      };
    }

    const rawToken = this.generateResetPasswordToken();
    const tokenHash = this.hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000);

    const user = await this.authRepository.createPasswordResetToken(input, tokenHash, expiresAt);

    if (!user) {
      throw AppError.internal('Please try again later');
    }

    const subject = EMAIL_TEMPLATES.PASSWORD_RESET.subject(user.firstName);
    const body = EMAIL_TEMPLATES.PASSWORD_RESET.body(user.firstName, rawToken);

    queuePublishEmail({
      to: user.email,
      subject,
      body
    });

    return {
      message: 'If the account exists, a password reset email has been sent.'
    };
  }

  public async resetPassword(input: ResetInput) {
    const tokenHash = this.hashResetToken(input.token);
    const passwordResetRecord = await this.authRepository.findActiveUserByResetToken(tokenHash);

    if (!passwordResetRecord) {
      throw AppError.badRequest('The password reset token is invalid or has expired.');
    }

    const passwordHash = await argon2.hash(input.newPassword, {
      type: argon2.argon2id
    });

    await this.authRepository.resetPassword(passwordResetRecord.user.id, passwordResetRecord.id, passwordHash);

    return {
      message: 'Password reset completed successfully.'
    };
  }

  private async generateUniqueFinxTag(input: RegisterInput, attempt: number): Promise<string> {
    const normalizedBase = `${input.firstName}${input.lastName}`
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 20);

    const fallbackBase = normalizedBase.length > 0 ? normalizedBase : 'finxuser';

    logger.debug('[FINX_TAG] base generated', {
      fallbackBase,
      attempt
    });

    for (let candidateAttempt = attempt; candidateAttempt < MAX_FINX_TAG_GENERATION_ATTEMPTS; candidateAttempt += 1) {
      const suffix = candidateAttempt === 0 ? '' : `${randomInt(1000, 10000)}`;
      const candidate = `${fallbackBase}${suffix}`.slice(0, 32);
      logger.debug('[FINX_TAG] checking candidate', { candidate });
      const exists = await this.authRepository.existsByFinxTag(candidate);
      logger.debug('[FINX_TAG] exists check result', {
        candidate,
        exists
      });

      if (!exists) {
        return candidate;
      }
    }

    throw AppError.internal('Unable to allocate a unique FinxTag for the new account.', {
      isOperational: true
    });
  }

  private async createSessionBundle(userId: string, email: string, sessionMetadata?: SessionMetadata) {
    logger.info('[AUTH] creating session bundle', {
      userId
    });

    const sessionId = randomUUID();
    const refreshToken = this.issueRefreshToken({
      userId,
      sessionId
    });
    const session = await this.authRepository.createSession({
      id: sessionId,
      userId,
      refreshTokenHash: this.hashRefreshToken(refreshToken),
      expiresAt: this.buildRefreshTokenExpiryDate(),
      userAgent: sessionMetadata?.userAgent,
      ipAddress: sessionMetadata?.ipAddress
    });
    const accessToken = await this.issueAccessToken(userId, email, session.id);

    return {
      accessToken,
      refreshToken,
      session
    };
  }

  private async issueAccessToken(userId: string, email: string, sessionId: string): Promise<string> {
    return this.jwt.sign(
      {
        userId,
        email,
        sessionId
      },
      {
        expiresIn: env.ACCESS_TOKEN_TTL
      }
    );
  }

  private issueRefreshToken(input: { userId: string; sessionId: string }): string {
    return this.jwt.sign(
      {
        userId: input.userId,
        sessionId: input.sessionId,
        type: 'refresh'
      },
      {
        key: env.JWT_REFRESH_SECRET,
        expiresIn: env.REFRESH_TOKEN_TTL
      }
    );
  }

  private verifyRefreshToken(refreshToken: string): {
    userId: string;
    sessionId: string;
    type?: string;
  } {
    try {
      return this.jwt.verify(refreshToken, {
        key: env.JWT_REFRESH_SECRET
      }) as {
        userId: string;
        sessionId: string;
        type?: string;
      };
    } catch (error) {
      throw mapJwtError(error, {
        expiredCode: 'REFRESH_TOKEN_EXPIRED',
        invalidCode: 'INVALID_REFRESH_TOKEN'
      });
    }
  }

  private generateResetPasswordToken() {
    const num = randomInt(0, 1000000);

    return num.toString().padStart(6, '0');
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildRefreshTokenExpiryDate(): Date {
    return new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private isFinxTagConflict(error: any): boolean {
    return (
      error instanceof PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      Array.isArray((error.meta as { target?: string[] } | undefined)?.target) &&
      ((error.meta as { target?: string[] }).target ?? []).includes('finxTag')
    );
  }
}
