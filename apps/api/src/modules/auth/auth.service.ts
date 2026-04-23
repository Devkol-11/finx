import argon2 from "argon2";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { UserStatus } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import type { FastifyInstance } from "fastify";
import { AppError } from "../../utils/ErrorHandler";
import { AuthRepository } from "./auth.repository";
import type { EmailService } from "./external/email.service";
import type { ForgotInput, LoginInput, RegisterInput, ResetInput } from "./http/auth.schema";

const PASSWORD_RESET_TOKEN_TTL_MINUTES = 15;
const MAX_FINX_TAG_GENERATION_ATTEMPTS = 10;

/**
 * Auth service contains the business rules for account onboarding and access.
 */
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly emailService: EmailService,
    private readonly fastify: FastifyInstance,
  ) {}

  public async register(input: RegisterInput) {
    const existingUser = await this.authRepository.findUserByEmail(input.email);

    if (existingUser) {
      throw AppError.conflict("An account already exists with this email address.");
    }

    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
    });

    for (let attempt = 0; attempt < MAX_FINX_TAG_GENERATION_ATTEMPTS; attempt += 1) {
      const finxTag = await this.generateUniqueFinxTag(input, attempt);

      try {
        const createdAccount = await this.authRepository.registerUserWithWallet(input, passwordHash, finxTag);

        const token = await this.issueAccessToken(createdAccount.user.id, createdAccount.user.email);

        return {
          message: "Registration completed successfully.",
          data: {
            token,
            user: {
              id: createdAccount.user.id,
              email: createdAccount.user.email,
              finxTag: createdAccount.user.finxTag,
              firstName: createdAccount.user.firstName,
              lastName: createdAccount.user.lastName,
            },
            wallet: {
              id: createdAccount.wallet.id,
              currency: createdAccount.wallet.currency,
              type: createdAccount.wallet.type,
              availableBalance: createdAccount.wallet.availableBalance.toString(),
            },
          },
        };
      } catch (error) {
        if (this.isFinxTagConflict(error)) {
          continue;
        }

        throw error;
      }
    }

    throw AppError.internal("Unable to allocate a unique FinxTag for the new account.", {
      isOperational: true,
    });
  }

  public async login(input: LoginInput) {
    const user = await this.authRepository.findUserByEmailWithWallets(input.email);

    if (!user) {
      throw AppError.unauthorized("Invalid email or password.");
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw AppError.forbidden("This account is not allowed to sign in.");
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, input.password);

    if (!isPasswordValid) {
      throw AppError.unauthorized("Invalid email or password.");
    }

    await this.authRepository.updateLastLoginAt(user.id);

    const token = await this.issueAccessToken(user.id, user.email);

    return {
      message: "Login completed successfully.",
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          finxTag: user.finxTag,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      },
    };
  }

  public async forgotPassword(input: ForgotInput) {
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = this.hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000);

    const user = await this.authRepository.createPasswordResetToken(input, tokenHash, expiresAt);

    if (user) {
      await this.emailService.sendPasswordResetEmail(user.email, rawToken);
    }

    return {
      message: "If the account exists, a password reset email has been queued.",
    };
  }

  public async resetPassword(input: ResetInput) {
    const tokenHash = this.hashResetToken(input.token);
    const passwordResetRecord = await this.authRepository.findActiveUserByResetToken(tokenHash);

    if (!passwordResetRecord) {
      throw AppError.badRequest("The password reset token is invalid or has expired.");
    }

    const passwordHash = await argon2.hash(input.newPassword, {
      type: argon2.argon2id,
    });

    await this.authRepository.resetPassword(passwordResetRecord.user.id, passwordResetRecord.id, passwordHash);

    return {
      message: "Password reset completed successfully.",
    };
  }

  private async generateUniqueFinxTag(input: RegisterInput, attempt: number): Promise<string> {
    const normalizedBase = `${input.firstName}${input.lastName}`
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20);

    const fallbackBase = normalizedBase.length > 0 ? normalizedBase : "finxuser";
    for (let candidateAttempt = attempt; candidateAttempt < MAX_FINX_TAG_GENERATION_ATTEMPTS; candidateAttempt += 1) {
      const suffix = candidateAttempt === 0 ? "" : `${randomInt(1000, 10000)}`;
      const candidate = `${fallbackBase}${suffix}`.slice(0, 32);
      const exists = await this.authRepository.existsByFinxTag(candidate);

      if (!exists) {
        return candidate;
      }
    }

    throw AppError.internal("Unable to allocate a unique FinxTag for the new account.", {
      isOperational: true,
    });
  }

  private async issueAccessToken(userId: string, email: string): Promise<string> {
    return this.fastify.jwt.sign(
      {
        userId,
        email,
      },
      {
        expiresIn: "1d",
      },
    );
  }

  private hashResetToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private isFinxTagConflict(error: unknown): boolean {
    return (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      Array.isArray((error.meta as { target?: string[] } | undefined)?.target) &&
      ((error.meta as { target?: string[] }).target ?? []).includes("finxTag")
    );
  }
}
