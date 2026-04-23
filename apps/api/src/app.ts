import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { env } from "./config/env";
import { authRoutes } from "./modules/auth/http/auth.routes";
import { investRoutes } from "./modules/invest/http/invest.routes";
import { walletRoutes } from "./modules/wallet/http/wallet.routes";
import { errorPlugin } from "./plugins/errorPlugin";

/**
 * Factory that assembles the API process with infrastructure-only concerns.
 *
 * Feature modules are intentionally deferred so the bootstrap remains a clean
 * foundation for later bounded-context registration.
 */
export const buildApp = async () => {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL ?? (env.NODE_ENV === "production" ? "info" : "debug"),
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "response.headers['set-cookie']",
          "config.headers.Authorization",
          "config.headers.authorization",
        ],
        censor: "[REDACTED]",
      },
    },
    trustProxy: true,
    disableRequestLogging: false,
    requestIdHeader: "x-request-id",
    requestIdLogLabel: "requestId",
  });

  await app.register(errorPlugin);

  await app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: false,
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

      callback(new Error("Origin not allowed by CORS policy."), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  });

  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: "1 minute",
    errorResponseBuilder: (_request: unknown, context: { after: string | number }) => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: `Rate limit exceeded. Retry in ${context.after}.`,
      code: "RATE_LIMIT_EXCEEDED",
    }),
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "finx-api",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  }));

  await app.register(authRoutes, {
    prefix: "/api/v1/auth",
  });

  await app.register(walletRoutes, {
    prefix: "/api/v1/wallet",
  });

  await app.register(investRoutes, {
    prefix: "/api/v1/invest",
  });

  return app;
};
