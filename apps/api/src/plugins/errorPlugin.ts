import { FastifyError, FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { PrismaClientInitializationError, PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/client';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { AppError, formatZodError, StandardErrorResponse } from '../utils/ErrorHandler';

const HTTP_STATUS_TEXT: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  503: 'Service Unavailable'
};

const isFastifyValidationError = (error: Partial<FastifyError> & { validation?: unknown[] }): boolean => Array.isArray(error.validation);

const buildResponse = (statusCode: number, message: string, code: string, details?: unknown): StandardErrorResponse => ({
  statusCode,
  error: HTTP_STATUS_TEXT[statusCode] ?? 'Application Error',
  message,
  code,
  ...(details !== undefined ? { details } : { details: null })
});

const mapPrismaError = (error: unknown): StandardErrorResponse | null => {
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return buildResponse(409, 'A unique resource already exists with the supplied value.', 'PRISMA_UNIQUE_CONSTRAINT', error.meta);
      case 'P2003':
        return buildResponse(409, 'The requested operation violates a relational integrity constraint.', 'PRISMA_FOREIGN_KEY_CONSTRAINT', error.meta);
      case 'P2025':
        return buildResponse(404, 'The requested record does not exist.', 'PRISMA_RECORD_NOT_FOUND', error.meta);
      default:
        return buildResponse(400, 'The database rejected the request.', 'PRISMA_KNOWN_REQUEST_ERROR', {
          prismaCode: error.code,
          meta: error.meta
        });
    }
  }

  if (error instanceof PrismaClientValidationError) {
    return buildResponse(400, 'The database query payload is invalid.', 'PRISMA_VALIDATION_ERROR');
  }

  if (error instanceof PrismaClientInitializationError) {
    return buildResponse(503, 'The database connection could not be initialized.', 'PRISMA_INITIALIZATION_ERROR');
  }

  return null;
};

const errorPluginCallback: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.setErrorHandler((error: unknown, request: FastifyRequest, reply: FastifyReply): void => {
    const fastifyError = error as Partial<FastifyError> & {
      message?: string;
      stack?: string;
    };
    const prismaMappedError = mapPrismaError(error);

    // 1. Handle Known Operational App Errors First
    if (error instanceof AppError) {
      const payload = buildResponse(error.statusCode, error.message, error.code ?? 'APPLICATION_ERROR', error.details);
      console.log('[ERROR PAYLOAD AFTER BUILD : ', payload);

      request.log.warn(
        {
          err: error,
          code: payload.code,
          details: error.details
        },
        'Operational application error handled.'
      );

      void reply.status(payload.statusCode).send(payload);
      return;
    }

    if ((error as any)?.name === 'ZodError') {
      const zodError = error as ZodError;

      const payload = formatZodError(zodError);

      request.log.warn(
        {
          err: error,
          code: payload.code,
          details: payload.details
        },
        'Zod validation error handled.'
      );

      void reply.status(payload.statusCode).send(payload);
      return;
    }

    if ((error as any).name === 'AppError' && (error as any).code === 'UNABLE_TO_PROCESS') {
      console.log(['ERR : ', error]);
      const payload = buildResponse((error as any).statusCode, (error as any).message ?? '', (error as any).code);
      request.log.warn({
        err: payload.error,
        code: payload.code,
        details: payload.code
      });

      void reply.status(payload.statusCode).send(payload);
    }
    if (prismaMappedError) {
      // ==========================================

      // 3. Handle Database / Prisma Failures
      request.log.error(
        {
          err: error,
          code: prismaMappedError.code,
          details: prismaMappedError.details
        },
        'Prisma error handled by global error layer.'
      );

      void reply.status(prismaMappedError.statusCode).send(prismaMappedError);
      return;
    }

    // 4. Handle Fastify Internal Validation Errors (e.g. built-in AJV schemas)
    if (isFastifyValidationError(fastifyError)) {
      const validationError = fastifyError as FastifyError & {
        validation?: unknown[];
        validationContext?: string;
      };

      const payload = buildResponse(400, 'Request validation failed.', 'FASTIFY_VALIDATION_ERROR', {
        context: validationError.validationContext,
        issues: validationError.validation
      });

      request.log.warn(
        {
          err: error,
          code: payload.code,
          details: payload.details
        },
        'Fastify validation error handled.'
      );

      void reply.status(payload.statusCode).send(payload);
      return;
    }

    // 5. Handle Rate Limit Triggers
    if (fastifyError.statusCode === 429) {
      const payload = buildResponse(429, fastifyError.message || 'Too many requests.', 'RATE_LIMIT_EXCEEDED');
      request.log.warn({ err: error, code: payload.code }, 'Rate limit error handled.');
      void reply.status(payload.statusCode).send(payload);
      return;
    }

    // 6. Final Catch-All / Fallback Layer (Unhandeld 500s)
    const statusCode = fastifyError.statusCode && fastifyError.statusCode >= 400 ? fastifyError.statusCode : 500;

    const payload = buildResponse(
      statusCode,
      statusCode >= 500 && env.NODE_ENV === 'production' ? 'Internal server error.' : fastifyError.message || 'An unexpected error occurred.',
      statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'UNHANDLED_APPLICATION_ERROR',
      env.NODE_ENV === 'production' || statusCode < 500
        ? undefined
        : {
            stack: fastifyError.stack
          }
    );

    request.log.error(
      {
        err: error,
        code: payload.code,
        requestId: request.id
      },
      'Unhandled error reached the global error handler.'
    );

    void reply.status(payload.statusCode).send(payload);
  });
};

export const errorPlugin = errorPluginCallback;
