import { KycVerificationStatus } from '@prisma/client';
import { AppError } from '../../utils/ErrorHandler';

type transitionGraph = Record<KycVerificationStatus, KycVerificationStatus[]>;

export const allowedTransitions: transitionGraph = {
  PENDING: ['APPROVED', 'REJECTED', 'FAILED'],
  APPROVED: [],
  REJECTED: [],
  FAILED: []
};

export function assertKycTransition(from: KycVerificationStatus, to: KycVerificationStatus) {
  if (from === to) {
    console.error('[WARNING] : Illegal (SAME TRANSITION) transition in Kyc Service');
    return;
  }

  if (!allowedTransitions[from].includes(to)) {
    throw AppError.badRequest('ILLEGAL TRANSIITON : Attempted Transition is not allowed ', {
      code: 'ILLEGAL_PAYMENT_STATE_TRANSITION',
      details: {
        from,
        to
      }
    });
  }
}
