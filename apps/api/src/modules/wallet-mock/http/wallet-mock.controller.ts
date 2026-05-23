import type { FastifyReply, FastifyRequest } from 'fastify';

import type { BalanceQueryInput, DepositInput, TransactionsQueryInput, TransferInput, WithdrawInput } from './wallet-mock.schema';

import { WalletMockService } from '../wallet-mock.service';

export class WalletMockController {
  constructor(private readonly walletMockService: WalletMockService) {}

  public getBalance = async (request: FastifyRequest<{ Querystring: BalanceQueryInput }>, reply: FastifyReply): Promise<void> => {
    const result = await this.walletMockService.getBalance(request.user.userId, request.query);
    void reply.status(200).send(result);
  };

  public transferP2P = async (request: FastifyRequest<{ Body: TransferInput }>, reply: FastifyReply): Promise<void> => {
    const result = await this.walletMockService.transferP2P(request.user.userId, request.body);
    void reply.status(200).send(result);
  };

  public depositFiat = async (request: FastifyRequest<{ Body: DepositInput }>, reply: FastifyReply): Promise<void> => {
    const idempotencyKey = this.getIdempotencyKey(request);
    if (!idempotencyKey) return reply.status(400).send({ success: 'false', message: 'idempotency key is required' });
    const result = await this.walletMockService.initiateFiatDeposit(request.user.userId, request.user.email, request.body);
    void reply.status(200).send(result);
  };

  public withdrawFiat = async (request: FastifyRequest<{ Body: WithdrawInput }>, reply: FastifyReply): Promise<void> => {
    const idempotencyKey = this.getIdempotencyKey(request);
    if (!idempotencyKey) return reply.status(400).send({ success: 'false', message: 'idempotency key is required' });
    const result = await this.walletMockService.withdrawFiat(request.user.userId, request.body, idempotencyKey);
    void reply.status(200).send(result);
  };

  public getTransactions = async (request: FastifyRequest<{ Querystring: TransactionsQueryInput }>, reply: FastifyReply): Promise<void> => {
    const result = await this.walletMockService.getTransactions(request.user.userId, request.query);
    void reply.status(200).send(result);
  };

  private getIdempotencyKey(request: FastifyRequest): string | undefined {
    const key = request.headers['x-idempotency-key'] ?? request.headers['idempotency-key'];
    return Array.isArray(key) ? key[0] : key;
  }
}
