import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyRequest } from 'fastify';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { pingRedis } from './lib/redis';
import { authRoutes } from './modules/auth/http/auth.routes';
import { investRoutes } from './modules/invest/http/invest.routes';
import { recordHttpError, recordHttpRequest, renderPrometheusMetrics } from './modules/observability/metrics';
import { paymentRoutes } from './modules/payments/http/payment.routes';
import { walletRoutes } from './modules/wallet/http/wallet.routes';
import { authPlugin } from './plugins/auth';
import { errorPlugin } from './plugins/errorPlugin';

const requestStarts = new WeakMap<FastifyRequest, bigint>();

/**
 * Factory that assembles the API process with infrastructure-only concerns.
 *
 * Feature modules are intentionally deferred so the bootstrap remains a clean
 * foundation for later bounded-context registration.
 */
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

  // app.addContentTypeParser(
  //   'application/json',
  //   {
  //     parseAs: 'buffer'
  //   },
  //   (request: FastifyRequest & { rawBody?: string }, body, done) => {
  //     const rawBody = body.toString('utf8');
  //     request.rawBody = rawBody;

  //     try {
  //       done(null, rawBody.length > 0 ? JSON.parse(rawBody) : {});
  //     } catch (error) {
  //       done(error as Error, undefined);
  //     }
  //   }
  // );

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

  await app.register(errorPlugin);
  await app.register(authPlugin);

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

  await app.register(authRoutes, {
    prefix: '/api/v1/auth'
  });

  await app.register(walletRoutes, {
    prefix: '/api/v1/wallet'
  });

  await app.register(paymentRoutes, {
    prefix: '/api/v1/payments'
  });

  await app.register(investRoutes, {
    prefix: '/api/v1/invest'
  });

  return app;
};
