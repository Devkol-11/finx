import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../../../lib/prisma";
import { validateRequest } from "../../../utils/validateRequest";
import { AuthRepository } from "../auth.repository";
import { AuthService } from "../auth.service";

import { AuthController } from "./auth.controller";
import {
  forgotSchema,
  forgotRouteSchema,
  loginSchema,
  loginRouteSchema,
  refreshRouteSchema,
  registerSchema,
  registerRouteSchema,
  resetSchema,
  resetRouteSchema,
} from "./auth.schema";

/**
 * Route composition for the Auth module.
 */
export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const authRepository = new AuthRepository(prisma);
  const authService = new AuthService(authRepository, fastify);
  const authController = new AuthController(authService);

  fastify.post(
    "/register",
    {
      schema: registerRouteSchema,
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
      preHandler: [validateRequest("body", registerSchema)],
    },
    authController.register
  );

  fastify.post(
    "/login",
    {
      schema: loginRouteSchema,
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
      preHandler: [validateRequest("body", loginSchema)],
    },
    authController.login
  );

  fastify.post(
    "/refresh",
    {
      schema: refreshRouteSchema,
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
        },
      },
    },
    authController.refresh
  );

  fastify.post(
    "/logout",
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
        },
      },
      preHandler: [fastify.authenticate],
    },
    authController.logout
  );

  fastify.post(
    "/forgot-password",
    {
      // schema: forgotRouteSchema,
      config: {
        rateLimit: {
          max: 3,
          timeWindow: "15 minutes",
        },
      },
      preHandler: [validateRequest("body", forgotSchema)],
    },
    authController.forgotPassword
  );

  fastify.post(
    "/reset-password",
    {
      // schema: resetRouteSchema,
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "15 minutes",
        },
      },
      preHandler: [validateRequest("body", resetSchema)],
    },
    authController.resetPassword
  );
};
