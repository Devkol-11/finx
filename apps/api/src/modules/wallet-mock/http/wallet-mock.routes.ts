import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../../lib/prisma';
import { validateRequest } from '../../../utils/validateRequest';
import {
  BalanceQueryInput,
  balanceQuerySchema,
  DepositInput,
  depositSchema,
  TransactionsQueryInput,
  transactionsQuerySchema,
  TransferInput,
  transferSchema
} from './wallet-mock.schema';
import { WalletMockService } from '../wallet-mock.service';
import { WalletMockRpository } from '../wallet-mock.repository';
import { WalletMockController } from './wallet-mock.controller';

export const walletMockRoutes: FastifyPluginAsync = async (fastify) => {
  const walletMockRepository = new WalletMockRpository(prisma);

  const walletMockService = new WalletMockService(walletMockRepository);
  const walletMokController = new WalletMockController(walletMockService);

  fastify.get<{ Querystring: BalanceQueryInput }>(
    '/balance',
    {
      // schema: balanceRouteSchema,
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute'
        }
      },
      preHandler: [(request, reply) => fastify.authenticate(request, reply), validateRequest('query', balanceQuerySchema)]
    },
    walletMokController.getBalance
  );

  fastify.post<{ Body: TransferInput }>(
    '/transfer/p2p',
    {
      // schema: transferRouteSchema,
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute'
        }
      },
      preHandler: [(request, reply) => fastify.authenticate(request, reply), validateRequest('body', transferSchema)]
    },
    walletMokController.transferP2P
  );

  fastify.post<{ Body: DepositInput }>(
    '/deposit/fiat',
    {
      // schema: depositRouteSchema,
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute'
        }
      },
      preHandler: [(request, reply) => fastify.authenticate(request, reply), validateRequest('body', depositSchema)]
    },
    walletMokController.depositFiat
  );

  // fastify.post<{ Body: WithdrawInput }>(
  //   '/withdraw/fiat',
  //   {
  //     // schema: withdrawRouteSchema,
  //     config: {
  //       rateLimit: {
  //         max: 5,
  //         timeWindow: '1 minute'
  //       }
  //     },
  //     preHandler: [(request, reply) => fastify.authenticate(request, reply), validateRequest('body', withdrawSchema)]
  //   },
  //   walletMokController.withdrawFiat
  // );

  fastify.get<{ Querystring: TransactionsQueryInput }>(
    '/transactions',
    {
      // schema: transactionsRouteSchema,
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute'
        }
      },
      preHandler: [(request, reply) => fastify.authenticate(request, reply), validateRequest('query', transactionsQuerySchema)]
    },
    walletMokController.getTransactions
  );
};
