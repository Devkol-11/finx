import type { FastifyPluginAsync } from "fastify";
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
  PortfolioQueryInput,
  portfolioQuerySchema,
  portfolioRouteSchema,
  SubscribeInput,
  subscribeRouteSchema,
  subscribeSchema,
  WithdrawParamsInput,
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

  fastify.get(
    "/plans",
    {
      // schema: plansRouteSchema,
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "1 minute",
        },
      },
    },
    investController.listPlans
  );

  fastify.post<{ Body: SubscribeInput }>(
    "/subscribe",
    {
      schema: subscribeRouteSchema,
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
      preHandler: [fastify.authenticate, validateRequest("body", subscribeSchema)],
    },
    investController.subscribe
  );

  fastify.get<{ Querystring: PortfolioQueryInput }>(
    "/my-portfolio",
    {
      schema: portfolioRouteSchema,
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
        },
      },
      preHandler: [
        fastify.authenticate,
        validateRequest("query", portfolioQuerySchema),
      ],
    },
    investController.getPortfolio
  );

  fastify.post<{ Params: WithdrawParamsInput }>(
    "/withdraw/:id",
    {
      schema: withdrawRouteSchema,
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
      preHandler: [
        fastify.authenticate,
        validateRequest("params", withdrawParamsSchema),
      ],
    },
    investController.withdraw
  );
};
