import { dispatchJob, QUEUE_NAMES, JOB_NAMES } from '../queues/queue.registry';

export async function queuePublishEmail(to: string, subject: string, body: string) {
  return dispatchJob(QUEUE_NAMES.EMAIL, JOB_NAMES.EMAIL.SEND, {
    to,
    subject,
    body
  });
}

export async function queueCapturePayment() {
  return dispatchJob(QUEUE_NAMES.PAYMENT, JOB_NAMES.PAYMENT.CAPTURE, {});
}

export async function queueVirtualAccountCreation(input: {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}) {
  return dispatchJob(QUEUE_NAMES.VIRTUAL_ACCOUNT_CREATION, JOB_NAMES.VIRTUAL_ACCOUNT_CREATION.CREATE, input);
}

async function queueKycVerification(payload: unknown) {
  return dispatchJob(QUEUE_NAMES.KYC_PROFILE_VERIFICATION, JOB_NAMES.KYC_PROFILE_VERIFICATION.VERIFY, payload);
}
