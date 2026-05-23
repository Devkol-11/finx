import type { FastifyPluginAsync } from 'fastify';
import { AppError } from '../utils/ErrorHandler';

export const mapJwtError = (
  error: unknown,
  codes: {
    expiredCode: string;
    invalidCode: string;
  }
): AppError => {
  const code = typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' ? error.code : undefined;

  if (code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED') {
    return new AppError('Authentication token has expired.', 401, {
      code: codes.expiredCode
    });
  }

  if (
    code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER' ||
    code === 'FST_JWT_NO_AUTHORIZATION_IN_COOKIE' ||
    code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID' ||
    code === 'FAST_JWT_MISSING_SIGNATURE' ||
    code === 'FST_JWT_BAD_REQUEST' ||
    code === 'FST_JWT_BAD_COOKIE_REQUEST'
  ) {
    return new AppError('Authentication token is invalid.', 401, {
      code: codes.invalidCode
    });
  }

  return AppError.unauthorized('Authentication is required.');
};

export const authPlugin: FastifyPluginAsync = async (fastify) => {};
