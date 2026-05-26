import { config as loadEnvironmentVariables } from 'dotenv';
import { z } from 'zod';

loadEnvironmentVariables();

/**
 * Runtime environment contract for the API process.
 *
 * This file is intentionally loaded at startup so that configuration problems
 * fail fast and loudly before the server opens a socket or touches the database.
 */
const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    DATABASE_URL: z.url().min(1, 'DATABASE_URL is required.'),
    PORT: z.coerce.number().int().min(1).max(65535),
    HOST: z.string().trim().min(1).optional(),
    REQUEST_BODY_LIMIT_BYTES: z.coerce.number().int().min(1024).max(10_485_760).optional(),
    JWT_SECRET_DEV: z.string().min(32, 'JWT_SECRET must be at least 32 characters long.'),
    JWT_SECRET_PROD: z.string().min(32, 'JWT_SECRET must be at least 32 characters long.'),
    JWT_REFRESH_SECRET_DEV: z
      .string()

      .min(32, 'JWT_REFRESH_SECRET_DEV must be at least 32 characters long.')
      .optional(),
    JWT_REFRESH_SECRET_PROD: z.string().min(32, 'JWT_REFRESH_SECRET_PROD must be at least 32 characters long.').optional(),
    PAYSTACK_SECRET_KEY_DEV: z.string().min(1, 'PAYSTACK_SECRET_KEY is required.'),
    PAYSTACK_SECRET_KEY_PROD: z.string().min(1, 'PAYSTACK_SECRET_KEY is required.'),
    RESEND_SANDBOX_API_KEY: z.string().min(1, 'RESEND_SANDBOX_API_KEY is required.'),
    RESEND_PRODUCTION_API_KEY: z.string().min(1, 'RESEND_PRODUCTION_API_KEY is required.'),
    REDIS_URL: z.url().min(1, 'REDIS_URL is required.'),
    CORS_ORIGIN: z.string().trim().optional(),
    COOKIE_DOMAIN: z.string().trim().optional(),
    METRICS_BEARER_TOKEN: z.string().min(24).optional(),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional()
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === 'production' && (!value.JWT_REFRESH_SECRET_PROD || value.JWT_REFRESH_SECRET_PROD === value.JWT_SECRET_PROD)) {
      context.addIssue({
        code: 'custom',
        path: ['JWT_REFRESH_SECRET_PROD'],
        message: 'JWT_REFRESH_SECRET_PROD is required in production and must differ from JWT_SECRET_PROD.'
      });
    }

    if (value.NODE_ENV === 'production' && value.CORS_ORIGIN?.split(',').some((origin) => origin.trim() === '*')) {
      context.addIssue({
        code: 'custom',
        path: ['CORS_ORIGIN'],
        message: 'Wildcard CORS origins are not allowed in production.'
      });
    }
  });

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  const formattedErrors = parsedEnvironment.error.issues.map((issue) => `${issue.path.join('.') || 'process.env'}: ${issue.message}`).join('\n');

  throw new Error(`Environment validation failed. The API cannot start with an invalid configuration.\n${formattedErrors}`);
}

const allowedOrigins =
  parsedEnvironment.data.CORS_ORIGIN?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean) ?? (parsedEnvironment.data.NODE_ENV === 'production' ? [] : ['http://localhost:3000', 'http://localhost:5173']);

const isProduction = parsedEnvironment.data.NODE_ENV === 'production';

export const env = {
  ...parsedEnvironment.data,
  CORS_ORIGIN_LIST: allowedOrigins,
  IS_PRODUCTION: isProduction,
  JWT_ACCESS_SECRET: isProduction ? parsedEnvironment.data.JWT_SECRET_PROD : parsedEnvironment.data.JWT_SECRET_DEV,
  JWT_REFRESH_SECRET: isProduction
    ? parsedEnvironment.data.JWT_REFRESH_SECRET_PROD ?? parsedEnvironment.data.JWT_SECRET_PROD
    : parsedEnvironment.data.JWT_REFRESH_SECRET_DEV ?? parsedEnvironment.data.JWT_SECRET_DEV,
  PAYSTACK_SECRET_KEY: isProduction ? parsedEnvironment.data.PAYSTACK_SECRET_KEY_PROD : parsedEnvironment.data.PAYSTACK_SECRET_KEY_DEV,
  HOST: parsedEnvironment.data.HOST ?? '0.0.0.0',
  REQUEST_BODY_LIMIT_BYTES: parsedEnvironment.data.REQUEST_BODY_LIMIT_BYTES ?? 1_048_576,
  ACCESS_TOKEN_TTL: '3d',
  REFRESH_TOKEN_TTL: '7d',
  REFRESH_TOKEN_COOKIE_NAME: 'finx_refresh_token'
} as const;

export type Environment = typeof env;
