import { ZodError } from 'zod';

/**
 * Uniform application-level error for predictable controller/service behavior.
 *
 * `isOperational` distinguishes expected business/runtime failures from
 * programmer errors, which helps the global error handler decide how much
 * detail to expose to clients.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string | undefined;
  public readonly details: unknown;

  constructor(
    message: string,
    statusCode = 500,
    options?: {
      isOperational?: boolean;
      code?: string;
      details?: unknown;
      cause?: unknown;
    }
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);

    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = options?.isOperational ?? true;
    this.code = options?.code;
    this.details = options?.details;

    Error.captureStackTrace?.(this, AppError);
  }

  public static badRequest(message: string, details?: unknown): AppError {
    return new AppError(message, 400, {
      code: 'BAD_REQUEST',
      details
    });
  }

  public static unauthorized(message = 'Authentication is required.'): AppError {
    return new AppError(message, 401, {
      code: 'UNAUTHORIZED'
    });
  }

  public static forbidden(message = 'You do not have permission to perform this action.'): AppError {
    return new AppError(message, 403, {
      code: 'FORBIDDEN'
    });
  }

  public static notFound(message = 'The requested resource could not be found.'): AppError {
    return new AppError(message, 404, {
      code: 'NOT_FOUND'
    });
  }

  public static conflict(message: string, details?: unknown): AppError {
    return new AppError(message, 409, {
      code: 'CONFLICT',
      details
    });
  }

  public static unprocessableEntity(message: string, details?: unknown): AppError {
    return new AppError(message, 422, {
      code: 'UNPROCESSABLE_ENTITY',
      details
    });
  }

  public static gatewayTimeout(message: string, details?: unknown): AppError {
    return new AppError(message, 504, {
      code: 'GATEWAY TIMEOUT',
      details
    });
  }

  public static webHookFailure(message = 'Webhook Delivery Failure', details?: unknown) {
    return new AppError(message, 401, {
      code: 'WEBHOOK_DELIVERY_FAILURE',
      details
    });
  }

  public static internal(
    message = 'An unexpected error occurred.',
    options?: { cause?: unknown; details?: unknown; isOperational?: boolean }
  ): AppError {
    return new AppError(message, 500, {
      code: 'INTERNAL_SERVER_ERROR',
      cause: options?.cause ?? '',
      details: options?.details,
      isOperational: options?.isOperational ?? false
    });
  }
}

/**
 * Serializable error response contract used by the global Fastify error layer.
 */
export interface StandardErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  code: string;
  details?: unknown;
}

/**
 * Transforms a Zod error into a client-safe payload that callers can act on.
 */
export const formatZodError = (error: ZodError): StandardErrorResponse => ({
  statusCode: 400,
  error: 'Bad Request',
  message: 'Request validation failed.',
  code: 'VALIDATION_ERROR',
  details: error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code
  }))
});
