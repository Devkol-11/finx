/**
 * AuthRepository Test Suite
 *
 * Tests for database persistence layer operations using Node.js assert
 * These tests verify that the repository correctly interfaces with Prisma
 */

import assert from 'node:assert';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { UserStatus, SessionRevocationReason, WalletType, WalletCurrency } from '@prisma/client';
import { AuthRepository } from '../auth.repository';
import type { RegisterInput } from '../http/auth.schema';

// Mock Prisma Client
const createMockPrismaClient = () => ({
  user: {
    findFirst: async (query: any) => null,
    findUnique: async (query: any) => null,
    create: async (query: any) => ({ id: 'test-user-id' }),
    update: async (query: any) => ({})
  },
  passwordResetToken: {
    findFirst: async (query: any) => null,
    create: async (query: any) => ({}),
    updateMany: async (query: any) => ({}),
    update: async (query: any) => ({})
  },
  session: {
    create: async (query: any) => ({
      id: 'session-id',
      userId: 'user-id',
      expiresAt: new Date()
    }),
    findUnique: async (query: any) => null,
    update: async (query: any) => ({}),
    updateMany: async (query: any) => ({})
  },
  wallet: {
    create: async (query: any) => ({
      id: 'wallet-id',
      userId: 'user-id',
      type: WalletType.FIAT,
      currency: WalletCurrency.NGN,
      availableBalance: '0'
    })
  },
  $transaction: async (callback: any) =>
    callback({
      user: {
        create: async (query: any) => ({
          id: 'test-user-id',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          phoneNumber: '+2341234567890',
          finxTag: 'testuser',
          status: UserStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      },
      wallet: {
        create: async (query: any) => ({
          id: 'wallet-id',
          userId: 'test-user-id',
          type: WalletType.FIAT,
          currency: WalletCurrency.NGN,
          availableBalance: '0'
        })
      },
      passwordResetToken: {
        updateMany: async (query: any) => ({}),
        create: async (query: any) => ({})
      },
      session: {
        create: async (query: any) => ({
          id: query.data.id,
          userId: query.data.userId,
          expiresAt: query.data.expiresAt
        }),
        update: async (query: any) => ({})
      }
    })
});

describe('AuthRepository', () => {
  let repository: AuthRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrismaClient();
    repository = new AuthRepository(mockPrisma as any);
  });

  afterEach(() => {
    mockPrisma = null;
    repository = null as any;
  });

  describe('findUserByEmail', () => {
    it('should return null when user does not exist', async () => {
      mockPrisma.user.findFirst = async () => null;

      const result = await repository.findUserByEmail('nonexistent@example.com');

      assert.strictEqual(result, null, 'Should return null for non-existent user');
    });

    it('should return user when found', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };

      mockPrisma.user.findFirst = async () => mockUser;

      const result = await repository.findUserByEmail('test@example.com');

      assert.deepStrictEqual(result, mockUser, 'Should return the user object when found');
    });

    it('should filter out deleted users', async () => {
      mockPrisma.user.findFirst = async (query: any) => {
        assert.deepStrictEqual(query.where.deletedAt, null, 'Query should filter out deleted users');
        return null;
      };

      await repository.findUserByEmail('test@example.com');
    });
  });

  describe('findActiveUserById', () => {
    it('should return null when active user does not exist', async () => {
      mockPrisma.user.findFirst = async () => null;

      const result = await repository.findActiveUserById('non-existent-id');

      assert.strictEqual(result, null, 'Should return null for non-existent active user');
    });

    it('should filter for ACTIVE status and non-deleted users', async () => {
      mockPrisma.user.findFirst = async (query: any) => {
        assert.strictEqual(query.where.status, UserStatus.ACTIVE, 'Should filter by ACTIVE status');
        assert.strictEqual(query.where.deletedAt, null, 'Should filter out deleted users');
        return null;
      };

      await repository.findActiveUserById('user-1');
    });
  });

  describe('findUserByEmailWithWallets', () => {
    it('should return user with wallets included', async () => {
      const mockUserWithWallets = {
        id: 'user-1',
        email: 'test@example.com',
        wallets: [
          {
            id: 'wallet-1',
            type: WalletType.FIAT,
            currency: WalletCurrency.NGN
          }
        ]
      };

      mockPrisma.user.findFirst = async (query: any) => {
        assert(query.include?.wallets, 'Should include wallets in query');
        return mockUserWithWallets;
      };

      const result = await repository.findUserByEmailWithWallets('test@example.com');

      assert.deepStrictEqual(result, mockUserWithWallets, 'Should return user with wallets');
    });
  });

  describe('existsByFinxTag', () => {
    it('should return true when finxTag exists', async () => {
      mockPrisma.user.findUnique = async () => ({ id: 'user-1' });

      const result = await repository.existsByFinxTag('testuser');

      assert.strictEqual(result, true, 'Should return true when finxTag exists');
    });

    it('should return false when finxTag does not exist', async () => {
      mockPrisma.user.findUnique = async () => null;

      const result = await repository.existsByFinxTag('nonexistent');

      assert.strictEqual(result, false, 'Should return false when finxTag does not exist');
    });

    it('should only select id field for efficiency', async () => {
      mockPrisma.user.findUnique = async (query: any) => {
        assert.deepStrictEqual(query.select, { id: true }, 'Should only select id field');
        return null;
      };

      await repository.existsByFinxTag('testuser');
    });
  });

  describe('existsByEmail', () => {
    it('should return true when active email exists', async () => {
      mockPrisma.user.findFirst = async () => ({ id: 'user-1' });

      const result = await repository.existsByEmail('test@example.com');

      assert.strictEqual(result, true, 'Should return true when active email exists');
    });

    it('should return false when email does not exist', async () => {
      mockPrisma.user.findFirst = async () => null;

      const result = await repository.existsByEmail('nonexistent@example.com');

      assert.strictEqual(result, false, 'Should return false when email does not exist');
    });

    it('should filter by ACTIVE status and non-deleted', async () => {
      mockPrisma.user.findFirst = async (query: any) => {
        assert.strictEqual(query.where.status, UserStatus.ACTIVE, 'Should filter by ACTIVE status');
        assert.strictEqual(query.where.deletedAt, null, 'Should filter out deleted users');
        return null;
      };

      await repository.existsByEmail('test@example.com');
    });
  });

  describe('registerUserWithWallet', () => {
    it('should create user and wallet in a transaction', async () => {
      const input: RegisterInput = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phoneNumber: '+2341234567890',
        password: 'Password123!'
      };

      const passwordHash = 'hashed-password';
      const finxTag = 'johndoe';

      const result = await repository.registerUserWithWallet(input, passwordHash, finxTag);

      assert(result.user, 'Should return user object');
      assert(result.wallet, 'Should return wallet object');
      assert.strictEqual(result.user.email, input.email, 'User email should match');
      assert.strictEqual(result.wallet.type, WalletType.FIAT, 'Wallet type should be FIAT');
    });

    it('should set correct user properties during registration', async () => {
      const input: RegisterInput = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phoneNumber: '+2341234567890',
        password: 'Password123!'
      };

      mockPrisma.$transaction = async (callback: any) => {
        const transaction = {
          user: {
            create: async (query: any) => {
              assert.strictEqual(query.data.firstName, 'Jane', 'First name should be set');
              assert.strictEqual(query.data.lastName, 'Smith', 'Last name should be set');
              assert.strictEqual(query.data.email, input.email, 'Email should be set');
              assert.strictEqual(query.data.status, UserStatus.ACTIVE, 'Status should be ACTIVE');
              return { id: 'user-1', ...query.data };
            }
          },
          wallet: {
            create: async (query: any) => ({
              id: 'wallet-1',
              ...query.data
            })
          }
        };
        return callback(transaction);
      };

      await repository.registerUserWithWallet(input, 'hash', 'janessmith');
    });
  });

  describe('updateLastLoginAt', () => {
    it('should update lastLoginAt field', async () => {
      mockPrisma.user.update = async (query: any) => {
        assert.strictEqual(query.where.id, 'user-1', 'Should update specific user');
        assert(query.data.lastLoginAt, 'Should set lastLoginAt');
        assert(query.data.lastLoginAt instanceof Date, 'lastLoginAt should be a Date');
        return {};
      };

      await repository.updateLastLoginAt('user-1');
    });
  });

  describe('createPasswordResetToken', () => {
    it('should create reset token for existing user', async () => {
      const input = { email: 'test@example.com' };
      const tokenHash = 'hashed-token';
      const expiresAt = new Date();

      mockPrisma.user.findFirst = async () => ({
        id: 'user-1',
        email: 'test@example.com'
      });

      const result = await repository.createPasswordResetToken(input as any, tokenHash, expiresAt);

      assert(result, 'Should return user object');
      assert.strictEqual(result.id, 'user-1', 'Should return correct user');
    });

    it('should return null for non-existent user', async () => {
      mockPrisma.user.findFirst = async () => null;

      const result = await repository.createPasswordResetToken({ email: 'nonexistent@example.com' } as any, 'token-hash', new Date());

      assert.strictEqual(result, null, 'Should return null for non-existent user');
    });
  });

  describe('resetPassword', () => {
    it('should update password and mark token as used', async () => {
      let updateCalled = false;
      let tokenUpdateCalled = false;

      mockPrisma.$transaction = async (callback: any) => {
        const transaction = {
          user: {
            update: async (query: any) => {
              updateCalled = true;
              assert.strictEqual(query.where.id, 'user-1', 'Should update user password');
              assert(query.data.passwordHash, 'Should have new password hash');
              return {};
            }
          },
          passwordResetToken: {
            update: async (query: any) => {
              tokenUpdateCalled = true;
              assert.strictEqual(query.where.id, 'token-1', 'Should update token');
              assert(query.data.usedAt, 'Should mark token as used');
              return {};
            },
            updateMany: async () => ({})
          },
          session: {
            updateMany: async () => ({})
          }
        };
        return callback(transaction);
      };

      await repository.resetPassword('user-1', 'token-1', 'new-password-hash');

      assert(updateCalled, 'User update should be called');
      assert(tokenUpdateCalled, 'Token update should be called');
    });
  });

  describe('createSession', () => {
    it('should create session with all metadata', async () => {
      mockPrisma.session.create = async (query: any) => {
        assert.strictEqual(query.data.userId, 'user-1', 'Should set userId');
        assert(query.data.refreshTokenHash, 'Should set refreshTokenHash');
        assert(query.data.expiresAt instanceof Date, 'Should set expiresAt as Date');
        assert.strictEqual(query.data.userAgent, 'Mozilla/5.0', 'Should set userAgent');
        assert.strictEqual(query.data.ipAddress, '192.168.1.1', 'Should set ipAddress');
        return query.data;
      };

      const sessionData = {
        id: 'session-1',
        userId: 'user-1',
        refreshTokenHash: 'token-hash',
        expiresAt: new Date(),
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1'
      };

      await repository.createSession(sessionData);
    });

    it('should handle optional metadata fields', async () => {
      mockPrisma.session.create = async (query: any) => {
        assert.strictEqual(query.data.userAgent, null, 'Should set userAgent to null if not provided');
        assert.strictEqual(query.data.ipAddress, null, 'Should set ipAddress to null if not provided');
        return query.data;
      };

      await repository.createSession({
        id: 'session-1',
        userId: 'user-1',
        refreshTokenHash: 'token-hash',
        expiresAt: new Date()
      });
    });
  });

  describe('findSessionByRefreshTokenHash', () => {
    it('should return session with user included', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        user: { id: 'user-1', email: 'test@example.com' }
      };

      mockPrisma.session.findUnique = async (query: any) => {
        assert(query.include?.user, 'Should include user in query');
        return mockSession;
      };

      const result = await repository.findSessionByRefreshTokenHash('token-hash');

      assert.deepStrictEqual(result, mockSession, 'Should return session with user');
    });
  });

  describe('rotateSessionForUser', () => {
    it('should create new session and revoke old one', async () => {
      let newSessionCreated = false;
      let oldSessionRevoked = false;

      mockPrisma.$transaction = async (callback: any) => {
        const transaction = {
          session: {
            create: async (query: any) => {
              newSessionCreated = true;
              return { id: query.data.id, userId: query.data.userId };
            },
            update: async (query: any) => {
              oldSessionRevoked = true;
              assert.strictEqual(query.where.id, 'old-session-id', 'Should revoke old session');
              assert.strictEqual(query.data.revocationReason, SessionRevocationReason.ROTATED, 'Should set revocation reason');
              return {};
            }
          }
        };
        return callback(transaction);
      };

      await repository.rotateSessionForUser({
        currentSessionId: 'old-session-id',
        newSessionId: 'new-session-id',
        userId: 'user-1',
        refreshTokenHash: 'new-hash',
        expiresAt: new Date()
      });

      assert(newSessionCreated, 'New session should be created');
      assert(oldSessionRevoked, 'Old session should be revoked');
    });
  });

  describe('markSessionUsed', () => {
    it('should update lastUsedAt to current date', async () => {
      mockPrisma.session.update = async (query: any) => {
        assert.strictEqual(query.where.id, 'session-1', 'Should update correct session');
        assert(query.data.lastUsedAt instanceof Date, 'lastUsedAt should be a Date');
        return {};
      };

      await repository.markSessionUsed('session-1');
    });
  });

  describe('revokeSession', () => {
    it('should revoke session with reason', async () => {
      mockPrisma.session.updateMany = async (query: any) => {
        assert.strictEqual(query.where.id, 'session-1', 'Should revoke correct session');
        assert.strictEqual(query.where.revokedAt, null, 'Should only revoke non-revoked sessions');
        assert.strictEqual(query.data.revocationReason, SessionRevocationReason.LOGGED_OUT, 'Should set revocation reason');
        assert(query.data.revokedAt instanceof Date, 'revokedAt should be a Date');
        return {};
      };

      await repository.revokeSession('session-1', SessionRevocationReason.LOGGED_OUT);
    });
  });

  describe('revokeAllSessionsForUser', () => {
    it('should revoke all user sessions with reason', async () => {
      mockPrisma.session.updateMany = async (query: any) => {
        assert.strictEqual(query.where.userId, 'user-1', 'Should target correct user');
        assert.strictEqual(query.where.revokedAt, null, 'Should only revoke non-revoked sessions');
        assert.strictEqual(query.data.revocationReason, SessionRevocationReason.SECURITY_REVOKED, 'Should set revocation reason');
        return {};
      };

      await repository.revokeAllSessionsForUser('user-1', SessionRevocationReason.SECURITY_REVOKED);
    });
  });

  describe('flagRefreshTokenReuse', () => {
    it('should mark reuse and revoke all user sessions', async () => {
      let sessionReuseMarked = false;
      let allUserSessionsRevoked = false;

      mockPrisma.$transaction = async (callback: any) => {
        const transaction = {
          session: {
            update: async (query: any) => {
              sessionReuseMarked = true;
              assert.strictEqual(query.where.id, 'session-1', 'Should update session');
              assert(query.data.reuseDetectedAt, 'Should mark reuse detected');
              return {};
            },
            updateMany: async () => {
              allUserSessionsRevoked = true;
              return {};
            }
          }
        };
        return callback(transaction);
      };

      mockPrisma.session.updateMany = async () => {
        allUserSessionsRevoked = true;
        return {};
      };

      await repository.flagRefreshTokenReuse('session-1', 'user-1');

      assert(sessionReuseMarked, 'Session reuse should be marked');
    });
  });
});
