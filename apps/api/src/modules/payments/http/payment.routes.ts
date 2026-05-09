import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../../lib/prisma';
import { validateRequest } from '../../../utils/validateRequest';
import { PaystackPaymentProvider } from '../../wallet/external/paystack.provider';
import { WalletRepository } from '../../wallet/wallet.repository';
import { WalletService } from '../../wallet/wallet.service';
import { PaymentController } from './payment.controller';
import { paystackWebhookSchema, PaystackWebhookInput } from './payment.schema';

export const paymentRoutes: FastifyPluginAsync = async (fastify) => {
  const walletRepository = new WalletRepository(prisma);
  const paymentProvider = new PaystackPaymentProvider();
  const walletService = new WalletService(walletRepository, paymentProvider);
  const paymentController = new PaymentController(walletService);

  fastify.post<{ Body: PaystackWebhookInput }>(
    '/paystack/webhook',
    {
      config: {
        rateLimit: {
          max: 120,
          timeWindow: '1 minute'
        }
      },
      preHandler: [validateRequest('body', paystackWebhookSchema)]
    },
    paymentController.paystackWebhook
  );
};
