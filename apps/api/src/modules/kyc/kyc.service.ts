import { KycRepository } from './kyc.repository';
import { KycProvider as External } from './external/interface';
import { PaystackKycVerificator } from './external/paystack/paystack.kyc.client';
import { AppError } from '../../utils/ErrorHandler';
import { KycProvider, KycStatus, KycVerificationStatus, KycVerificationType } from '@prisma/client';
import { assertKycTransition } from './kyc.state';
import { mockVerifyBvn } from './kyc.helpers';

export class KycService {
  constructor(private readonly kycRepo: KycRepository, private readonly kycProvider?: External) {
    this.kycRepo = new KycRepository();
    this.kycProvider = new PaystackKycVerificator();
  }

  // async startUserVerification(userId: string, data: { bvn: string; accountNumber: string }) {
  //   const kycProfile = await this.kycRepo.verifyUserExistsWithFreshProfile(userId);
  //   if (!kycProfile) {
  //     throw AppError.notFound('User not found');
  //   }

  //   const submittedData: Record<string, string> = { bvn: data.bvn };

  //   const input = {
  //     type: KycVerificationType.BVN,
  //     kycProfileId: kycProfile.id,
  //     provider: KycProvider.PAYSTACK,
  //     submittedData
  //   };

  //   const verificationIntent = await this.kycRepo.createVerificationIntent(kycProfile.userId, input);

  //   const result = await this.kycProvider.verifyBvn({
  //     bvn: data.bvn,
  //     accountNumber: data.accountNumber,
  //     firstName: kycProfile.user.firstName,
  //     lastName: kycProfile.user.lastName
  //   });

  //   if (
  //     !result.success &&
  //     (result.code === 'ACCOUNT_MISMATCH' || result.code === 'BVN_MISMATCH' || result.code === 'INVALID_BVN' || result.code === 'VERIFICATION_FAILED')
  //   ) {
  //     assertKycTransition(verificationIntent.status, KycVerificationStatus.FAILED);
  //     throw AppError.badRequest('Unable to verify Kyc , please check and make sure your credentials are correct');
  //   }

  //   return {
  //     success: result.success,
  //     message: result.message
  //   };
  // }

  async verifyMockKyc(userId: string, bvn: string) {
    const kycProfile = await this.kycRepo.verifyUserExistsWithFreshProfile(userId);
    if (!kycProfile) {
      throw AppError.notFound('User not found');
    }
    const submittedData: Record<string, string> = { bvn: bvn };

    const input = {
      type: KycVerificationType.BVN,
      kycProfileId: kycProfile.id,
      provider: KycProvider.PAYSTACK,
      submittedData
    };

    const verificationIntent = await this.kycRepo.createVerificationIntent(kycProfile.userId, input);

    const result = await mockVerifyBvn(bvn);

    if (!result.verified) {
      await this.kycRepo.updateVerificationIntent(verificationIntent.id, KycVerificationStatus.FAILED);
      return {
        success: 'false',
        reason: result.reason
      };
    }

    await this.kycRepo.completeSuccessfulKycVerification(verificationIntent.id, kycProfile.id);

    return {
      success: 'true',
      message: 'Kyc verification successful',
      reason: result.reason ?? null
    };
  }

  async getKycStatus(userId: string) {
    const profile = await this.kycRepo.getStatus(userId);
    if (!profile.status) {
      return {
        status: false,
        message: 'Kyc not verified , Please start Kyc verification '
      };
    }

    return {
      status: true,
      message: 'Kyc Verified'
    };
  }
}
