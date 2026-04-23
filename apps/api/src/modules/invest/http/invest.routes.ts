import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { prisma } from "../../../lib/prisma";
import { validateRequest } from "../../../utils/validateRequest";
import { WalletRepository } from "../../wallet/wallet.repository";
import { FixedTermPlan } from "../external/plans/FixedTerm.plan";
import { FlexDailyPlan } from "../external/plans/FlexDaily.plan";
import { WealthMonthlyPlan } from "../external/plans/WealthMonthly.plan";
import { InvestRepository } from "../invest.repository";
import { InvestService } from "../invest.service";
import { InvestController } from "./invest.controller";
import {
  plansRouteSchema,
  portfolioQuerySchema,
  portfolioRouteSchema,
  subscribeRouteSchema,
  subscribeSchema,
  withdrawParamsSchema,
  withdrawRouteSchema,
} from "./invest.schema";

export const investRoutes: FastifyPluginAsync = async (fastify) => {
  const investRepository = new InvestRepository(prisma);
  const walletRepository = new WalletRepository(prisma);
  const investService = new InvestService(investRepository, walletRepository, [
    new FlexDailyPlan(),
    new FixedTermPlan(),
    new WealthMonthlyPlan(),
  ]);
  const investController = new InvestController(investService);

  const authenticate = async (request: FastifyRequest): Promise<void> => {
    await request.jwtVerify();
  };

  fastify.get(
    "/plans",
    {
      schema: plansRouteSchema,
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "1 minute",
        },
      },
    },
    investController.listPlans,
  );

  fastify.post(
    "/subscribe",
    {
      schema: subscribeRouteSchema,
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
      preHandler: [authenticate, validateRequest("body", subscribeSchema)],
    },
    investController.subscribe,
  );

  fastify.get(
    "/my-portfolio",
    {
      schema: portfolioRouteSchema,
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
        },
      },
      preHandler: [authenticate, validateRequest("query", portfolioQuerySchema)],
    },
    investController.getPortfolio,
  );

  fastify.post(
    "/withdraw/:id",
    {
      schema: withdrawRouteSchema,
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
      preHandler: [authenticate, validateRequest("params", withdrawParamsSchema)],
    },
    investController.withdraw,
  );
};
