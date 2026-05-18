import { createHmac, timingSafeEqual } from 'node:crypto';
import { PaystackChargeSuccessWebhook, RawBodyRequest } from '../types';
import type { FastifyReply } from 'fastify';
import { env } from '../../../config/env';
import { AppError } from '../../../utils/ErrorHandler';
import { queueCapturePayment } from '../../pub-sub';
import { processIdempotentWebhook } from '../repository/webhook.repository';
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

  const eventType = request.body.event;
  const providerEventId = String(request.body.data?.id);
  const reference = request.body.data?.reference as string;
  const payload = request.body.data;

  const result = await processIdempotentWebhook({ providerEventId, payload, eventType });

  if (result.duplicated) {
    return reply.status(200).send({
      success: true,
      deduplicated: true
    });
  }

  switch (request.body.event) {
    case PaystackWebhookEvent.CHARGE_SUCCESS:
      const payload = request.body.data as PaystackChargeSuccessWebhook['data'];
      await queueCapturePayment({
        provider: PaymentProvider.PAYSTACK,
        eventType,
        providerEventId,
        reference,
        payload
      });

      return reply.status(200).send({ success: 'true' });

    case PaystackWebhookEvent.CUSTOMER_IDENTIFICATION_SUCCESS:

    case PaystackWebhookEvent.CUSTOMER_IDENTIFICATION_FAILED:
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
