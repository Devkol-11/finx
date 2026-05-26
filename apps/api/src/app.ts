import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyRequest } from 'fastify';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { env } from './config/env';
import { getRedisApi } from './lib/redis';
import { prisma } from './lib/prisma';
import { pingRedis } from './lib/redis';
import { authRoutes } from './modules/auth/http/auth.routes';
import { walletRoutes } from './modules/wallet/http/wallet.routes';
import { walletMockRoutes } from './modules/wallet-mock/http/wallet-mock.routes';
import { savingsRoute } from './modules/savings/http/savings.routes';
import { recordHttpError, recordHttpRequest, renderPrometheusMetrics } from './modules/observability/metrics';
import { paymentRoutes } from './modules/payments/http/payment.routes';
import { authPlugin } from './plugins/auth';
import { errorPlugin } from './plugins/errorPlugin';
import { webhookRoutes } from './modules/webhooks/http/webhook.route';
import { mapJwtError } from './plugins/auth';
import { AppError } from './utils/ErrorHandler';
import { kycRoutes } from './modules/kyc/http/kyc.routes';
import { profileRoutes } from './modules/profile/http/profile.routes';

const requestStarts = new WeakMap<FastifyRequest, bigint>();

export const buildApp = async () => {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL ?? (env.NODE_ENV === 'production' ? 'info' : 'debug'),
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          "response.headers['set-cookie']",
          'config.headers.Authorization',
          'config.headers.authorization'
        ],
        censor: '[REDACTED]'
      }
    },
    trustProxy: true,
    bodyLimit: env.REQUEST_BODY_LIMIT_BYTES,
    disableRequestLogging: false,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId'
  });

  app.addHook('onRequest', async (request) => {
    requestStarts.set(request, process.hrtime.bigint());
    request.headers['x-request-id'] = request.id;
  });

  app.addHook('onSend', async (request, reply, payload) => {
    reply.header('X-Request-Id', request.id);

    if (request.url.startsWith('/api/v1/auth')) {
      reply.header('Cache-Control', 'no-store');
      reply.header('Pragma', 'no-cache');
    }

    return payload;
  });

  app.addHook('onResponse', async (request, reply) => {
    const started = requestStarts.get(request);
    const durationSeconds = started ? Number(process.hrtime.bigint() - started) / 1_000_000_000 : 0;
    const route = request.routeOptions.url ?? request.url;

    recordHttpRequest(
      {
        method: request.method,
        route,
        statusCode: reply.statusCode
      },
      durationSeconds
    );
  });

  app.addHook('onError', async (request, _reply, error) => {
    recordHttpError({
      method: request.method,
      route: request.routeOptions.url ?? request.url,
      errorCode: 'code' in error && typeof error.code === 'string' ? error.code : 'UNHANDLED_ERROR'
    });
  });

  app.decorate('authenticate', async (request, reply): Promise<void> => {
    try {
      await request.jwtVerify();
    } catch (error) {
      throw mapJwtError(error, {
        expiredCode: 'ACCESS_TOKEN_EXPIRED',
        invalidCode: 'INVALID_ACCESS_TOKEN'
      });
    }

    if (!request.user || typeof request.user.userId !== 'string' || typeof request.user.sessionId !== 'string' || request.user.type === 'refresh') {
      throw new AppError('Authentication token is invalid.', 401, {
        code: 'INVALID_ACCESS_TOKEN'
      });
    }

    const cache = getRedisApi();
    const constructSessionCacheKey = (userId: string) => `session:${userId}`;
    const cacheKey = constructSessionCacheKey(request.user.userId);

    let session = null;
    const cachedSession = await cache.get(cacheKey);

    if (cachedSession) {
      try {
        const parsed = JSON.parse(cachedSession);
        if (parsed.id === request.user.sessionId && parsed.user.status === 'ACTIVE' && new Date(parsed.expiresAt) > new Date()) {
          session = parsed;
        } else {
          if (parsed.user.status !== 'ACTIVE') {
            reply.clearCookie(env.REFRESH_TOKEN_COOKIE_NAME, {
              path: '/api/v1/auth',
              ...(env.COOKIE_DOMAIN
                ? {
                    domain: env.COOKIE_DOMAIN
                  }
                : {})
            });
          }
          await cache.del(cacheKey);
        }
      } catch (error) {
        await cache.del(cacheKey);
      }
    }

    if (!session) {
      session = await prisma.session.findFirst({
        where: {
          id: request.user.sessionId,
          userId: request.user.userId,
          revokedAt: null,
          expiresAt: {
            gt: new Date()
          },
          user: {
            deletedAt: null
          }
        },
        include: {
          user: true
        }
      });

      if (session) {
        await cache.setex(cacheKey, 3600, JSON.stringify(session));
      }
    }

    if (!session || session.user.status !== 'ACTIVE') {
      reply.clearCookie(env.REFRESH_TOKEN_COOKIE_NAME, {
        path: '/api/v1/auth',
        ...(env.COOKIE_DOMAIN
          ? {
              domain: env.COOKIE_DOMAIN
            }
          : {})
      });

      throw new AppError('Your session is no longer valid.', 401, {
        code: 'SESSION_REVOKED'
      });
    }

    if (session.userId !== request.user.userId) {
      throw new AppError('Authentication token is invalid.', 401, {
        code: 'INVALID_ACCESS_TOKEN'
      });
    }

    request.authSession = session;
  });

  app.decorateRequest('authSession', null);

  await app.register(cookie);

  await app.register(jwt, {
    secret: env.JWT_ACCESS_SECRET
  });

  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: false,
    hsts: env.IS_PRODUCTION
      ? {
          maxAge: 15552000,
          includeSubDomains: true
        }
      : false
  });

  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (env.CORS_ORIGIN_LIST.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS policy.'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Idempotency-Key'],
    exposedHeaders: ['X-Request-Id']
  });

  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: (_request: unknown, context: { after: string | number }) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Retry in ${context.after}.`,
      code: 'RATE_LIMIT_EXCEEDED'
    })
  });

  app.get('/health', async () => ({
    status: 'ok',
    service: 'finx-api',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString()
  }));

  app.get('/ready', async (_request, reply) => {
    const checks = {
      database: false,
      redis: false
    };

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (error) {
      _request.log.error({ err: error }, 'Database readiness check failed.');
    }

    try {
      checks.redis = await pingRedis();
    } catch (error) {
      _request.log.error({ err: error }, 'Redis readiness check failed.');
    }

    const ready = checks.database && checks.redis;

    void reply.status(ready ? 200 : 503).send({
      status: ready ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString()
    });
  });

  app.get('/metrics', async (request, reply) => {
    if (env.METRICS_BEARER_TOKEN) {
      const expectedHeader = `Bearer ${env.METRICS_BEARER_TOKEN}`;

      if (request.headers.authorization !== expectedHeader) {
        void reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Metrics authentication is required.',
          code: 'METRICS_UNAUTHORIZED'
        });
        return;
      }
    }

    void reply.header('Content-Type', 'text/plain; version=0.0.4').send(renderPrometheusMetrics());
  });

  await app.register(errorPlugin);
  await app.register(authPlugin);

  await app.register(authRoutes, {
    prefix: '/api/v1/auth'
  });

  await app.register(walletMockRoutes, {
    prefix: '/api/v1/wallet'
  });

  await app.register(kycRoutes, {
    prefix: '/api/v1/kyc'
  });

  await app.register(profileRoutes, {
    prefix: '/api/v1/profile'
  });

  await app.register(paymentRoutes, {
    prefix: '/api/v1/payments'
  });

  await app.register(savingsRoute, {
    prefix: '/api/v1/savings'
  });

  await app.register(webhookRoutes, {
    prefix: '/api/v1/webhooks'
  });

  return app;
};
