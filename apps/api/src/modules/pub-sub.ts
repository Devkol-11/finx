import { dispatchJob, QUEUE_NAMES, JOB_NAMES } from "../queues/queue.registry";

export const queuePublishEmail = async (
  to: string,
  subject: string,
  body: string
) => {
  return dispatchJob(QUEUE_NAMES.EMAIL, JOB_NAMES.EMAIL.SEND, {
    to,
    subject,
    body,
  });
};

export const queueCapturePayment = async (
  bookingId: string,
  amount: number,
  currency = "NGN"
) => {
  return dispatchJob(QUEUE_NAMES.PAYMENT, JOB_NAMES.PAYMENT.CAPTURE, {
    bookingId,
    amount,
    currency,
  });
};
