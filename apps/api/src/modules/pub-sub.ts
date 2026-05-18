import { dispatchJob, QUEUE_NAMES, JOB_NAMES } from '../queues/queue.registry';
import { PaystackChargeSuccessWebhook } from './webhooks/types';

export interface PublishEmailJob {
  to: string;
  subject: string;
  body: string;
}

export interface CapturePaymentJob {
  provider: 'PAYSTACK';
  eventType: string;
  providerEventId: string;
  reference: string;
  payload: PaystackChargeSuccessWebhook['data'];
}

export async function queuePublishEmail(input: PublishEmailJob) {
  return dispatchJob(QUEUE_NAMES.EMAIL, JOB_NAMES.EMAIL.SEND, input);
}

export async function queueCapturePayment(input: CapturePaymentJob) {
  return dispatchJob(QUEUE_NAMES.PAYMENT, JOB_NAMES.PAYMENT.CAPTURE, input);
}

export async function queueKycWebhookVerification(payload: unknown) {
  return dispatchJob(QUEUE_NAMES.KYC_PROFILE_VERIFICATION, JOB_NAMES.KYC_PROFILE_VERIFICATION.VERIFY, payload);
}
