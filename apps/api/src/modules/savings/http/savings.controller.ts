import { FastifyRequest, FastifyReply } from 'fastify';
import {
  CancelSavingsPlanInput,
  CreateSavingsPlanInput,
  FundSavingsPlanInput,
  planIdParamsInput,
  WithdrawFromSavingsPlanInput
} from './savings.schema';
import { SavingsService } from '../savings.service';

export class SavingsController {
  constructor(private readonly savingsService: SavingsService) {}

  createSavingsPlan = async (request: FastifyRequest<{ Body: CreateSavingsPlanInput }>, reply: FastifyReply) => {
    console.log('[USER ID]', request.user.userId);
    console.log('BODY', request.body);
    const response = await this.savingsService.createSavingsPlan(request.user.userId, request.body);
    return reply.status(201).send(response);
  };

  fundSavingsPlan = async (request: FastifyRequest<{ Body: FundSavingsPlanInput; Params: planIdParamsInput }>, reply: FastifyReply) => {
    const response = await this.savingsService.fundSavingsPlan(request.user.userId, request.params.planId, request.body);
    return reply.status(201).send(response);
  };

  withdrawFromSavingsPlan = async (
    request: FastifyRequest<{ Body: WithdrawFromSavingsPlanInput; Params: planIdParamsInput }>,
    reply: FastifyReply
  ) => {
    const response = await this.savingsService.withdrawFromSavingsPlan(request.user.userId, request.params.planId, request.body);
    return reply.status(201).send(response);
  };

  cancelSavingsPlan = async (request: FastifyRequest<{ Body: CancelSavingsPlanInput; Params: planIdParamsInput }>, reply: FastifyReply) => {
    const response = await this.savingsService.cancelSavingsPlan(request.user.userId, request.params.planId, request.body);
    return reply.status(201).send(response);
  };

  getUserSavingsPlans = async (request: FastifyRequest, reply: FastifyReply) => {
    const response = await this.savingsService.getUserSavingsPlans(request.user.userId);
    return reply.status(201).send(response);
  };

  getSavingsPlanById = async (request: FastifyRequest<{ Params: { planId: string } }>, reply: FastifyReply) => {
    const response = await this.savingsService.getSavingsPlanById(request.user.userId, request.params.planId);
    return reply.status(201).send(response);
  };
}
