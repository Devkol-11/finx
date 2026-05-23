import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { SavingsController } from './savings.controller';
import { SavingsService } from '../savings.service';
import { SavingsRepository } from '../savings.repository';
import { validateRequest } from '../../../utils/validateRequest';
import {
  cancelSavingsPlanSchema,
  CreateSavingsPlanInput,
  createSavingsPlanSchema,
  fundSavingsPlanSchema,
  planIdParamsSchema,
  withdrawFromSavingsPlanSchema
} from './savings.schema';

export const savingsRoute: FastifyPluginAsync = async (fastify) => {
  const savingsRepository = new SavingsRepository();
  const savingsService = new SavingsService(savingsRepository);
  const savingsController = new SavingsController(savingsService);

  // CREATE SAVINGS PLANS
  //createSavingsPlan()-

  fastify.post(
    '/plans',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute'
        }
      },
      preHandler: [(request, reply) => fastify.authenticate(request, reply), validateRequest('body', createSavingsPlanSchema)]
    },
    savingsController.createSavingsPlan
  );

  // GET SAVINGS PLAN FOR USER
  //getUserSavingsPlans()-
  fastify.get(
    '/plans',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute'
        }
      },
      preHandler: [(request, reply) => fastify.authenticate(request, reply)]
    },
    savingsController.getUserSavingsPlans
  );

  // GET A SINGLE SAVINGS PLAN BY ID
  //getSavingsPlanById()--
  fastify.get(
    '/plans/:planId',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute'
        }
      },
      preHandler: [(request, reply) => fastify.authenticate(request, reply), validateRequest('params', planIdParamsSchema)]
    },
    savingsController.getSavingsPlanById
  );

  //FUND A SAVINGS PLAN
  fastify.post(
    '/plans/:planId/fund',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute'
        }
      },
      preHandler: [
        (request, reply) => fastify.authenticate(request, reply),
        validateRequest('params', planIdParamsSchema),
        validateRequest('body', fundSavingsPlanSchema)
      ]
    },
    savingsController.fundSavingsPlan
  );

  // WITHDRAW FROM SAVINGS PLAN
  fastify.post(
    '/plans/:planId/withdraw',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute'
        }
      },
      preHandler: [
        (request, reply) => fastify.authenticate(request, reply),
        validateRequest('params', planIdParamsSchema),
        validateRequest('body', withdrawFromSavingsPlanSchema)
      ]
    },
    savingsController.withdrawFromSavingsPlan
  );

  //CANCEL SAVINGS PLAN
  fastify.post(
    '/plans/:planId/cancel',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute'
        }
      },
      preHandler: [
        (request, reply) => fastify.authenticate(request, reply),
        validateRequest('params', planIdParamsSchema),
        validateRequest('body', cancelSavingsPlanSchema)
      ]
    },
    savingsController.cancelSavingsPlan
  );
};
