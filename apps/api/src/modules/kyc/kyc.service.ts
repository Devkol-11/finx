import { KycRepository } from './kyc.repository';
import { KycProvider, KycVerificationStatus, KycVerificationType } from '@prisma/client';
import { mockVerifyBvn } from './kyc.helpers';

export class KycService {
  constructor(private readonly kycRepo: KycRepository) {
    this.kycRepo = new KycRepository();
  }

  async verifyMockKyc(userId: string, bvn: string) {
    const kycProfile = await this.kycRepo.verifyUserExistsWithFreshProfile(userId);

    if (!kycProfile) {
      return {
        success: true,
        alreadyVerified: true,
        message: 'Your identity has already been verified.'
      };
    }

    const verificationIntent = await this.kycRepo.createVerificationIntent(userId, {
      type: KycVerificationType.BVN,
      kycProfileId: kycProfile.id,
      provider: KycProvider.PAYSTACK,
      submittedData: { bvn }
    });

    const result = await mockVerifyBvn(bvn);

    if (!result.verified) {
      await this.kycRepo.updateVerificationIntent(verificationIntent.id, KycVerificationStatus.FAILED);
      return {
        success: false,
        alreadyVerified: false,
        message: result.reason ?? 'We could not verify the BVN you provided. Please check and try again.'
      };
    }

    await this.kycRepo.completeSuccessfulKycVerification(verificationIntent.id, kycProfile.id);

    return {
      success: true,
      alreadyVerified: false,
      message: 'Your identity has been verified successfully.'
    };
  }

  async getKycStatus(userId: string) {
    const profile = await this.kycRepo.getStatus(userId);

    return {
      success: true,
      verified: profile.status ?? false,
      message: profile.status ? 'Your identity is verified.' : 'KYC verification is required to unlock full wallet access.'
    };
  }
}
