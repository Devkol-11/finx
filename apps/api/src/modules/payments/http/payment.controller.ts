import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../../../config/env';
import { AppError } from '../../../utils/ErrorHandler';
import type { WalletService } from '../../wallet/wallet.service';
import type { PaystackWebhookInput } from './payment.schema';

type RawBodyRequest = FastifyRequest<{ Body: PaystackWebhookInput }> & {
  rawBody?: string;
};

export class PaymentController {
  constructor(private readonly walletService: WalletService) {}

  public paystackWebhook = async (request: RawBodyRequest, reply: FastifyReply): Promise<void> => {
    this.verifyPaystackSignature(request);

    const reference = request.body.data.reference ?? request.body.data.transfer_code;

    if (!reference) {
      throw AppError.badRequest('Paystack webhook payload is missing a reference.');
    }

    const result = await this.walletService.handlePaystackWebhook({
      reference,
      eventName: request.body.event,
      payload: request.body
    });

    void reply.status(200).send(result);
  };

  private verifyPaystackSignature(request: RawBodyRequest): void {
    const signatureHeader = request.headers['x-paystack-signature'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

    if (!signature || !request.rawBody) {
      throw new AppError('Invalid Paystack webhook signature.', 401, {
        code: 'INVALID_PAYSTACK_SIGNATURE'
      });
    }

    const computedSignature = createHmac('sha512', env.PAYSTACK_SECRET_KEY).update(request.rawBody).digest('hex');

    const received = Buffer.from(signature, 'hex');
    const expected = Buffer.from(computedSignature, 'hex');

    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      throw new AppError('Invalid Paystack webhook signature.', 401, {
        code: 'INVALID_PAYSTACK_SIGNATURE'
      });
    }
  }
}
