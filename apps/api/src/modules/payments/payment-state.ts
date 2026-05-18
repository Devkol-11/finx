import { PaymentStatus } from '@prisma/client';
import { AppError } from '../../utils/ErrorHandler';

const TERMINAL_PAYMENT_STATUSES = new Set<PaymentStatus>([
  PaymentStatus.SUCCEEDED,
  PaymentStatus.FAILED,
  PaymentStatus.ABANDONED,
  PaymentStatus.CANCELLED,
  PaymentStatus.REVERSED
]);

const ALLOWED_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  [PaymentStatus.INITIATED]: [PaymentStatus.AWAITING_CUSTOMER, PaymentStatus.PROCESSING, PaymentStatus.FAILED, PaymentStatus.CANCELLED],
  [PaymentStatus.AWAITING_CUSTOMER]: [
    PaymentStatus.PROCESSING,
    PaymentStatus.SUCCEEDED,
    PaymentStatus.FAILED,
    PaymentStatus.ABANDONED,
    PaymentStatus.CANCELLED
  ],
  [PaymentStatus.PROCESSING]: [PaymentStatus.SUCCEEDED, PaymentStatus.FAILED, PaymentStatus.REVERSED],
  [PaymentStatus.SUCCEEDED]: [PaymentStatus.REVERSED],
  [PaymentStatus.FAILED]: [],
  [PaymentStatus.ABANDONED]: [],
  [PaymentStatus.CANCELLED]: [],
  [PaymentStatus.REVERSED]: []
};

export const isTerminalPaymentStatus = (status: PaymentStatus): boolean => TERMINAL_PAYMENT_STATUSES.has(status);

export const assertPaymentTransition = (from: PaymentStatus, to: PaymentStatus): void => {
  if (from === to) {
    return;
  }

  if (!(ALLOWED_TRANSITIONS[from] ?? []).includes(to)) {
    throw new AppError(`Illegal payment state transition from ${from} to ${to}.`, 409, {
      code: 'ILLEGAL_PAYMENT_STATE_TRANSITION',
      details: {
        from,
        to
      }
    });
  }
};
