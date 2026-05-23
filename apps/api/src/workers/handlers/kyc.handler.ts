import { KycVerificationJob } from '../../modules/pub-sub';

enum KycVerificationStatus {
  SUCCESS = 'customeridentification.success',
  FAILED = 'customeridentification.failed'
}

export async function handleKycJob(data: unknown) {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid Payment job payload');
  }

  const job = data as KycVerificationJob;

  switch (job.eventType) {
    case KycVerificationStatus.SUCCESS:
      break;

    default:
      break;
  }
}
