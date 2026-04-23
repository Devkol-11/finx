import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { prisma } from "../../../lib/prisma";
import { validateRequest } from "../../../utils/validateRequest";
import { CryptoProvider } from "../external/crypto.provider";
import { PaystackPaymentProvider } from "../external/paystack.provider";
import { WalletController } from "./wallet.controller";
import {
  balanceQuerySchema,
  balanceRouteSchema,
  depositRouteSchema,
  depositSchema,
  transactionsQuerySchema,
  transactionsRouteSchema,
  transferRouteSchema,
  transferSchema,
  withdrawRouteSchema,
  withdrawSchema,
} from "./wallet.schema";
import { WalletRepository } from "../wallet.repository";
import { WalletService } from "../wallet.service";

export const walletRoutes: FastifyPluginAsync = async (fastify) => {
  const walletRepository = new WalletRepository(prisma);
  const paymentProvider = new PaystackPaymentProvider();
  const blockchainProvider = new CryptoProvider();
  const walletService = new WalletService(walletRepository, paymentProvider, blockchainProvider);
  const walletController = new WalletController(walletService);

  const authenticate = async (request: FastifyRequest): Promise<void> => {
    await request.jwtVerify();
  };

  fastify.get(
    "/balance",
    {
      schema: balanceRouteSchema,
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "1 minute",
        },
      },
      preHandler: [authenticate, validateRequest("query", balanceQuerySchema)],
    },
    walletController.getBalance,
  );

  fastify.post(
    "/transfer/p2p",
    {
      schema: transferRouteSchema,
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
      preHandler: [authenticate, validateRequest("body", transferSchema)],
    },
    walletController.transferP2P,
  );

  fastify.post(
    "/deposit/fiat",
    {
      schema: depositRouteSchema,
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
      preHandler: [authenticate, validateRequest("body", depositSchema)],
    },
    walletController.depositFiat,
  );

  fastify.post(
    "/withdraw/fiat",
    {
      schema: withdrawRouteSchema,
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
      preHandler: [authenticate, validateRequest("body", withdrawSchema)],
    },
    walletController.withdrawFiat,
  );

  fastify.get(
    "/transactions",
    {
      schema: transactionsRouteSchema,
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
        },
      },
      preHandler: [authenticate, validateRequest("query", transactionsQuerySchema)],
    },
    walletController.getTransactions,
  );
};
