import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../../../lib/prisma";
import { validateRequest } from "../../../utils/validateRequest";
import { CryptoProvider } from "../external/crypto.provider";
import { PaystackPaymentProvider } from "../external/paystack.provider";
import { WalletController } from "./wallet.controller";
import {
  BalanceQueryInput,
  balanceQuerySchema,
  balanceRouteSchema,
  DepositInput,
  depositRouteSchema,
  depositSchema,
  TransactionsQueryInput,
  transactionsQuerySchema,
  transactionsRouteSchema,
  TransferInput,
  transferRouteSchema,
  transferSchema,
  WithdrawInput,
  withdrawRouteSchema,
  withdrawSchema,
} from "./wallet.schema";
import { WalletRepository } from "../wallet.repository";
import { WalletService } from "../wallet.service";

export const walletRoutes: FastifyPluginAsync = async (fastify) => {
  const walletRepository = new WalletRepository(prisma);
  const paymentProvider = new PaystackPaymentProvider();
  const blockchainProvider = new CryptoProvider();
  const walletService = new WalletService(
    walletRepository,
    paymentProvider,
    blockchainProvider
  );
  const walletController = new WalletController(walletService);

  fastify.get<{ Querystring: BalanceQueryInput }>(
    "/balance",
    {
      // schema: balanceRouteSchema,
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "1 minute",
        },
      },
      preHandler: [fastify.authenticate, validateRequest("query", balanceQuerySchema)],
    },
    walletController.getBalance
  );

  fastify.post<{ Body: TransferInput }>(
    "/transfer/p2p",
    {
      // schema: transferRouteSchema,
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
      preHandler: [fastify.authenticate, validateRequest("body", transferSchema)],
    },
    walletController.transferP2P
  );

  fastify.post<{ Body: DepositInput }>(
    "/deposit/fiat",
    {
      // schema: depositRouteSchema,
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
      preHandler: [fastify.authenticate, validateRequest("body", depositSchema)],
    },
    walletController.depositFiat
  );

  fastify.post<{ Body: WithdrawInput }>(
    "/withdraw/fiat",
    {
      // schema: withdrawRouteSchema,
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
      preHandler: [fastify.authenticate, validateRequest("body", withdrawSchema)],
    },
    walletController.withdrawFiat
  );

  fastify.get<{ Querystring: TransactionsQueryInput }>(
    "/transactions",
    {
      schema: transactionsRouteSchema,
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
        },
      },
      preHandler: [
        fastify.authenticate,
        validateRequest("query", transactionsQuerySchema),
      ],
    },
    walletController.getTransactions
  );
};
