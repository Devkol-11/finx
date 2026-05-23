import { createHmac, timingSafeEqual } from 'node:crypto';
import { CustomerIdentificationFailedEvent, CustomerIdentificationSuccessEvent, PaystackChargeSuccessWebhook, RawBodyRequest } from '../types';
import type { FastifyReply } from 'fastify';
import { env } from '../../../config/env';
import { AppError } from '../../../utils/ErrorHandler';
import { queueCapturePayment, queueKycWebhookVerification } from '../../pub-sub';
import { processIdempodentKycWebhook, processIdempotentChargeWebhook } from '../repository/webhook.repository';
import { PaymentProvider } from '@prisma/client';

enum PaystackWebhookEvent {
  // PAYMENTS
  CHARGE_SUCCESS = 'charge.success',
  //TRANSFERS
  TRANSFER_SUCCESS = 'transfer.success',
  TRANSFER_FAILED = 'transfer.failed',
  TRANSFER_REVERSED = 'transfer.reversed',
  // CUSTOMER / KYC VERIFICATION
  CUSTOMER_IDENTIFICATION_SUCCESS = 'customeridentification.success',
  CUSTOMER_IDENTIFICATION_FAILED = 'customeridentification.failed'
}

export async function webHookController(request: RawBodyRequest, reply: FastifyReply) {
  verifyPaystackSignature(request);

  switch (request.body.event) {
    case PaystackWebhookEvent.CHARGE_SUCCESS:
      const chargeSuccessEventType = request.body.event;
      const chargeSuccessPayload = request.body.data as PaystackChargeSuccessWebhook['data'];
      const chargeWebhookResult = await processIdempotentChargeWebhook({
        providerEventId: String(chargeSuccessPayload.id),
        payload: chargeSuccessPayload,
        eventType: chargeSuccessEventType
      });

      if (chargeWebhookResult.duplicated) {
        return reply.status(200).send({
          success: true,
          duplicated: true
        });
      }

      await queueCapturePayment({
        provider: PaymentProvider.PAYSTACK,
        eventType: chargeSuccessEventType,
        providerEventId: String(chargeSuccessPayload.id),
        reference: chargeSuccessPayload.reference,
        payload: chargeSuccessPayload
      });

      return reply.status(200).send({ success: 'true' });

    case PaystackWebhookEvent.CUSTOMER_IDENTIFICATION_SUCCESS:
      const identificationSuccessEventType = request.body.event;
      const identificationSuccessPayload = request.body.data as CustomerIdentificationSuccessEvent['data'];
      const idempodentKycResult = await processIdempodentKycWebhook({
        customerId: identificationSuccessPayload.customer_id,
        payload: identificationSuccessPayload,
        eventType: identificationSuccessEventType
      });

      if (idempodentKycResult.duplicated) {
        return reply.status(200).send({
          success: true,
          duplicated: true
        });
      }
      await queueKycWebhookVerification({
        provider: 'PAYSTACK',
        eventType: identificationSuccessEventType,
        payload: identificationSuccessPayload
      });

      return reply.status(200).send({ success: 'true' });

    case PaystackWebhookEvent.CUSTOMER_IDENTIFICATION_FAILED:
      const identificationFailedPayload = request.body.data as unknown as CustomerIdentificationFailedEvent['data'];
      return reply.status(200).send({ success: 'false' });

    case PaystackWebhookEvent.TRANSFER_SUCCESS:
      return reply.status(200).send({ success: 'false' });

    case PaystackWebhookEvent.TRANSFER_FAILED:
      return reply.status(200).send({ success: 'false' });

    case PaystackWebhookEvent.TRANSFER_REVERSED:
      return reply.status(200).send({ success: 'false' });
    default:
      console.log(request.body);
      break;
  }
}

function verifyPaystackSignature(request: RawBodyRequest): void {
  const signatureHeader = request.headers['x-paystack-signature'];
  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

  if (!signature || !request.rawBody) {
    console.error('[-] MISSING SIGNATURE OR RAW BODY');
    throw AppError.webHookFailure();
  }

  const computedSignature = createHmac('sha512', env.PAYSTACK_SECRET_KEY).update(request.rawBody).digest('hex');

  const receivedBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(computedSignature, 'hex');

  if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) {
    console.error('[-] WEBHOOK FORGERY DETECTED: Signatures do not match');
    throw AppError.webHookFailure();
  }

  console.log('[+] WEBHOOK VERIFIED: Paystack Signature is valid');
}

function log(b: any) {
  console.dir(b, { depth: null });
}
