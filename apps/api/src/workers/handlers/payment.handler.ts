import { CapturePaymentJob } from '../../modules/pub-sub';
import { prisma } from '../../lib/prisma';
import { PaymentType, PaymentStatus } from '@prisma/client';
import { WalletRepository } from '../../modules/wallet/wallet.repository';
import logger, { logError } from '../../utils/logger';
import { VerifyTransactionResult } from '../../modules/wallet/external/interfaces/IPaymentProvider';
import { PaystackChargeSuccessWebhook } from '../../modules/webhooks/types';

const walletRepository = new WalletRepository(prisma);

export async function capturePaymentWorker(data: unknown) {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid Payment job payload');
  }

  const job = data as CapturePaymentJob;
  const { provider, providerEventId, payload, reference, eventType } = job;

  const paymentIntent = await prisma.paymentIntent.findUnique({ where: { reference } });

  if (!paymentIntent) {
    logError(`NO PAYMENT INTENT FOUND FOR PAYMENT INTENT REFERENCE :  ${reference}`);
    return;
  }

  switch (eventType) {
    case 'charge.success':
      const chargedPayload = job.payload as PaystackChargeSuccessWebhook['data'];
      if (paymentIntent.type !== PaymentType.FIAT_DEPOSIT) return;
      if (paymentIntent.status === PaymentStatus.SUCCEEDED) return;
      const mapped = mapPaystackWebhookToVerificationResult({ reference, providerEventId, payload: chargedPayload });
      await walletRepository.postSuccessfulFiatDeposit(reference, mapped);

      break;

    case 'transfer.success':
      break;

    case 'transfer.failed':
      break;
    case 'transfer.reversed':
      if (paymentIntent.type !== PaymentType.FIAT_WITHDRAWAL) return;
      await walletRepository.releaseFailedFiatWithdrawal(reference, '', payload);
      break;

    default:
      logger.error('[WORKER] Unhandled event type:', eventType);
      break;
  }

  await prisma.webhookEvent.update({
    where: {
      providerEventId
    },
    data: {
      status: 'PROCESSED'
    }
  });
}

export function mapPaystackWebhookToVerificationResult(input: {
  reference: string;
  providerEventId?: string;
  payload: CapturePaymentJob['payload'];
}): VerifyTransactionResult {
  const { reference, providerEventId, payload } = input;

  return {
    reference,
    status: 'success',
    amount: String(payload.amount),
    currency: payload.currency,
    raw: payload,

    ...(providerEventId
      ? {
          providerTransactionId: BigInt(providerEventId)
        }
      : {}),

    ...(payload.gateway_response
      ? {
          gatewayResponse: payload.gateway_response
        }
      : {}),

    ...(payload.channel
      ? {
          channel: payload.channel
        }
      : {}),

    ...(payload.paid_at
      ? {
          paidAt: new Date(payload.paid_at)
        }
      : {}),

    ...(payload.fees
      ? {
          fees: String(payload.fees)
        }
      : {}),

    ...(payload.authorization?.authorization_code
      ? {
          authorizationCode: payload.authorization.authorization_code
        }
      : {}),

    ...(typeof payload.authorization?.reusable === 'boolean'
      ? {
          reusableAuthorization: payload.authorization.reusable
        }
      : {})
  };
}
