import { createHmac, timingSafeEqual } from 'node:crypto';
import { RawBodyRequest } from '../types';
import type { FastifyReply } from 'fastify';
import { env } from '../../../config/env';
import { AppError } from '../../../utils/ErrorHandler';
import { PaystackWebhookInput } from './webhooks.schema';

export enum PaystackWebhookEvent {
  // PAYMENTS
  CHARGE_SUCCESS = 'charge.success',

  //TRANSFERS
  TRANSFER_SUCCESS = 'transfer.success',
  TRANSFER_FAILED = 'transfer.failed',
  TRANSFER_REVERSED = 'transfer.reversed',

  // CUSTOMER / KYC VERIFICATION
  CUSTOMER_IDENTIFICATION_SUCCESS = 'customeridentification.success',
  CUSTOMER_IDENTIFICATION_FAILED = 'customeridentification.failed',

  //DEDICATED VIRTUAL ACCOUNTS
  DEDICATED_ACCOUNT_ASSIGN_SUCCESS = 'dedicatedaccount.assign.success',
  DEDICATED_ACCOUNT_ASSIGN_FAILED = 'dedicatedaccount.assign.failed'
}

export async function webHookController(request: RawBodyRequest, reply: FastifyReply) {
  verifyPaystackSignature(request);

  switch (request.body.event) {
    case PaystackWebhookEvent.DEDICATED_ACCOUNT_ASSIGN_SUCCESS:
      console.log(request.body);

      break;

    default:
      console.log(request.body);
      break;
  }
}

function verifyPaystackSignature(request: RawBodyRequest): void {
  const signatureHeader = request.headers['x-paystack-signature'];
  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

  if (!signature || !request.rawBody) {
    throw AppError.webHookFailure();
  }

  const computedSignature = createHmac('sha512', env.PAYSTACK_SECRET_KEY).update(request.rawBody).digest('hex');
  console.log(computedSignature);

  const received = Buffer.from(signature, 'hex');
  const expected = Buffer.from(computedSignature, 'hex');
  console.log(received);
  console.log(expected);

  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw AppError.webHookFailure();
  }
  console.log('WEBHOOK VERIFICATION SUCCESS');
  return;
}
