import type { FastifyReply, FastifyRequest } from "fastify";
import type { WalletService } from "../wallet.service";
import type {
  BalanceQueryInput,
  DepositInput,
  TransactionsQueryInput,
  TransferInput,
  WithdrawInput,
} from "./wallet.schema";

export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  public getBalance = async (
    request: FastifyRequest<{ Querystring: BalanceQueryInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const result = await this.walletService.getBalance(request.user.userId, request.query);
    void reply.status(200).send(result);
  };

  public transferP2P = async (
    request: FastifyRequest<{ Body: TransferInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const result = await this.walletService.transferP2P(request.user.userId, request.body);
    void reply.status(200).send(result);
  };

  public depositFiat = async (
    request: FastifyRequest<{ Body: DepositInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const result = await this.walletService.initiateFiatDeposit(
      request.user.userId,
      request.user.email,
      request.body,
    );
    void reply.status(200).send(result);
  };

  public withdrawFiat = async (
    request: FastifyRequest<{ Body: WithdrawInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const result = await this.walletService.withdrawFiat(request.user.userId, request.body);
    void reply.status(200).send(result);
  };

  public getTransactions = async (
    request: FastifyRequest<{ Querystring: TransactionsQueryInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const result = await this.walletService.getTransactions(request.user.userId, request.query);
    void reply.status(200).send(result);
  };
}
