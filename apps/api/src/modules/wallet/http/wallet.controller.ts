import type { FastifyReply, FastifyRequest } from 'fastify';
import type { WalletService } from '../wallet.service';
import type { BalanceQueryInput, DepositInput, PaymentReferenceParams, TransactionsQueryInput, TransferInput, WithdrawInput } from './wallet.schema';

export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  public getBalance = async (request: FastifyRequest<{ Querystring: BalanceQueryInput }>, reply: FastifyReply): Promise<void> => {
    const result = await this.walletService.getBalance(request.user.userId, request.query);
    void reply.status(200).send(result);
  };

  public transferP2P = async (request: FastifyRequest<{ Body: TransferInput }>, reply: FastifyReply): Promise<void> => {
    const result = await this.walletService.transferP2P(request.user.userId, request.body);
    void reply.status(200).send(result);
  };

  public depositFiat = async (request: FastifyRequest<{ Body: DepositInput }>, reply: FastifyReply): Promise<void> => {
    const result = await this.walletService.initiateFiatDeposit(
      request.user.userId,
      request.user.email,
      request.body,
      this.getIdempotencyKey(request)
    );
    void reply.status(200).send(result);
  };

  public withdrawFiat = async (request: FastifyRequest<{ Body: WithdrawInput }>, reply: FastifyReply): Promise<void> => {
    const result = await this.walletService.withdrawFiat(request.user.userId, request.body, this.getIdempotencyKey(request));
    void reply.status(200).send(result);
  };

  public verifyFiatDeposit = async (request: FastifyRequest<{ Params: PaymentReferenceParams }>, reply: FastifyReply): Promise<void> => {
    const result = await this.walletService.verifyFiatDeposit(request.user.userId, request.params.reference);
    void reply.status(200).send(result);
  };

  public getTransactions = async (request: FastifyRequest<{ Querystring: TransactionsQueryInput }>, reply: FastifyReply): Promise<void> => {
    const result = await this.walletService.getTransactions(request.user.userId, request.query);
    void reply.status(200).send(result);
  };

  private getIdempotencyKey(request: FastifyRequest): string | undefined {
    const key = request.headers['x-idempotency-key'] ?? request.headers['idempotency-key'];
    return Array.isArray(key) ? key[0] : key;
  }
}
