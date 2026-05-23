import { FastifyPluginAsync } from 'fastify';
import { SubmitBvnInput, submitBvnSchema } from './kyc.schema';
import { validateRequest } from '../../../utils/validateRequest';
import { KycRepository } from '../kyc.repository';
import { KycService } from '../kyc.service';
import { KycController } from './kyc.controllers';

export const kycRoutes: FastifyPluginAsync = async (fastify) => {
  const kycRepo = new KycRepository();
  const kycService = new KycService(kycRepo);
  const kycController = new KycController(kycService);

  fastify.post<{ Body: SubmitBvnInput }>(
    '/bvn',
    {
      preHandler: [(request, reply) => fastify.authenticate(request, reply), validateRequest('body', submitBvnSchema)]
    },
    kycController.verifyBvn
  );

  fastify.get(
    '/status',
    {
      preHandler: [fastify.authenticate]
    },
    kycController.getStatus
  );
};
