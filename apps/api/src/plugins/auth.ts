import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import type { FastifyPluginAsync } from "fastify";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/ErrorHandler";

export const mapJwtError = (
  error: unknown,
  codes: {
    expiredCode: string;
    invalidCode: string;
  },
): AppError => {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : undefined;

  if (code === "FST_JWT_AUTHORIZATION_TOKEN_EXPIRED") {
    return new AppError("Authentication token has expired.", 401, {
      code: codes.expiredCode,
    });
  }

  if (
    code === "FST_JWT_NO_AUTHORIZATION_IN_HEADER" ||
    code === "FST_JWT_NO_AUTHORIZATION_IN_COOKIE" ||
    code === "FST_JWT_AUTHORIZATION_TOKEN_INVALID" ||
    code === "FAST_JWT_MISSING_SIGNATURE" ||
    code === "FST_JWT_BAD_REQUEST" ||
    code === "FST_JWT_BAD_COOKIE_REQUEST"
  ) {
    return new AppError("Authentication token is invalid.", 401, {
      code: codes.invalidCode,
    });
  }

  return AppError.unauthorized("Authentication is required.");
};

export const authPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(cookie);

  await fastify.register(jwt, {
    secret: env.JWT_ACCESS_SECRET,
  });

  fastify.decorateRequest("authSession", null);

  fastify.decorate("authenticate", async (request, reply): Promise<void> => {
    try {
      await request.jwtVerify();
    } catch (error) {
      throw mapJwtError(error, {
        expiredCode: "ACCESS_TOKEN_EXPIRED",
        invalidCode: "INVALID_ACCESS_TOKEN",
      });
    }

    const session = await prisma.session.findFirst({
      where: {
        id: request.user.sessionId,
        userId: request.user.userId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
        user: {
          deletedAt: null,
        },
      },
      include: {
        user: true,
      },
    });

    if (!session || session.user.status !== "ACTIVE") {
      reply.clearCookie(env.REFRESH_TOKEN_COOKIE_NAME, {
        path: "/api/v1/auth",
        ...(env.COOKIE_DOMAIN
          ? {
              domain: env.COOKIE_DOMAIN,
            }
          : {}),
      });

      throw new AppError("Your session is no longer valid.", 401, {
        code: "SESSION_REVOKED",
      });
    }

    request.authSession = session;
  });
};
