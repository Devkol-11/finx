import { FastifyRequest, FastifyReply } from 'fastify';
import { SubmitBvnInput } from './kyc.schema';
import { KycService } from '../kyc.service';
import logger from '../../../utils/logger';

export class KycController {
  constructor(private readonly KycService: KycService) {}

  verifyBvn = async (request: FastifyRequest<{ Body: SubmitBvnInput }>, reply: FastifyReply) => {
    const response = await this.KycService.verifyMockKyc(request.user.userId, request.body.bvn);
    logger.info('[CHECKFING RES]', response);
    console.log(response);
    if (!response.success) {
      return reply.status(422).send(response);
    }

    return reply.status(200).send(response);
  };

  getStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    const response = await this.KycService.getKycStatus(request.user.userId);
    return reply.status(200).send(response);
  };
}
