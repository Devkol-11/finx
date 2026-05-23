import { FastifyRequest, FastifyReply } from 'fastify';
import { SubmitBvnInput } from './kyc.schema';
import { KycService } from '../kyc.service';

export class KycController {
  constructor(private readonly KycService: KycService) {}

  verifyBvn = async (request: FastifyRequest<{ Body: SubmitBvnInput }>, reply: FastifyReply) => {
    const response = await this.KycService.verifyMockKyc(request.user.userId, request.body.bvn);
    if (!response.success) {
      return reply.status(400).send({
        success: response.success,
        message: response.reason
      });
    }

    return reply.status(200).send({
      success: response.success,
      message: response.message ?? 'Kyc Verification success'
    });
  };

  getStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    const response = await this.KycService.getKycStatus(request.user.userId);
    return reply.status(200).send({ ...response });
  };
}
