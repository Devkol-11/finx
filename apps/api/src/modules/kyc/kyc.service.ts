import { KycRepository } from './kyc.repository';
import { KycProvider as External } from './external/interface';
import { PaystackKycVerificator } from './external/paystack/paystack.kyc.client';
import { AppError } from '../../utils/ErrorHandler';
import { KycProvider, KycVerificationStatus, KycVerificationType } from '@prisma/client';
import { assertKycTransition } from './kyc.state';

export class KycService {
  constructor(private readonly kycRepo: KycRepository, private readonly kycProvider: External) {
    this.kycRepo = new KycRepository();
    this.kycProvider = new PaystackKycVerificator();
  }

  async startUserVerification(userId: string, data: { bvn: string; accountNumber: string }) {
    const kycProfile = await this.kycRepo.verifyUserExistsWithFreshProfile(userId);
    if (!kycProfile) {
      throw AppError.notFound('User not found');
    }

    const submittedData: Record<string, string> = { bvn: data.bvn };

    const input = {
      type: KycVerificationType.BVN,
      kycProfileId: kycProfile.id,
      provider: KycProvider.PAYSTACK,
      submittedData
    };

    const verificationIntent = await this.kycRepo.createVerificationIntent(kycProfile.userId, input);

    const result = await this.kycProvider.verifyBvn({
      bvn: data.bvn,
      accountNumber: data.accountNumber,
      firstName: kycProfile.user.firstName,
      lastName: kycProfile.user.lastName
    });

    if (
      !result.success &&
      (result.code === 'ACCOUNT_MISMATCH' || result.code === 'BVN_MISMATCH' || result.code === 'INVALID_BVN' || result.code === 'VERIFICATION_FAILED')
    ) {
      assertKycTransition(verificationIntent.status, KycVerificationStatus.FAILED);
      await this.kycRepo.updateVerificationIntent(verificationIntent.id, KycVerificationStatus.FAILED);
      return result;
    }

    assertKycTransition(verificationIntent.status, KycVerificationStatus.APPROVED);
    await this.kycRepo.updateVerificationIntent(verificationIntent.id, KycVerificationStatus.APPROVED);
    return {
      success: result.success,
      message: result.message
    };
  }
}
