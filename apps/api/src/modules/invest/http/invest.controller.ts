import type { FastifyReply, FastifyRequest } from "fastify";
import type { InvestService } from "../invest.service";
import type {
  PortfolioQueryInput,
  SubscribeInput,
  WithdrawParamsInput,
} from "./invest.schema";

export class InvestController {
  constructor(private readonly investService: InvestService) {}

  public listPlans = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = this.investService.listPlans();
    void reply.status(200).send(result);
  };

  public subscribe = async (
    request: FastifyRequest<{ Body: SubscribeInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const result = await this.investService.subscribe(request.user.userId, request.body);
    void reply.status(201).send(result);
  };

  public getPortfolio = async (
    request: FastifyRequest<{ Querystring: PortfolioQueryInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const result = await this.investService.getPortfolio(request.user.userId, request.query);
    void reply.status(200).send(result);
  };

  public withdraw = async (
    request: FastifyRequest<{ Params: WithdrawParamsInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const result = await this.investService.withdraw(request.user.userId, request.params);
    void reply.status(200).send(result);
  };
}
