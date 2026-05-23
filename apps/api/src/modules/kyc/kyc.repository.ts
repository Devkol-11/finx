import { KycVerificationStatus, KycVerificationType, KycProvider, KycStatus, Prisma } from '@prisma/client';

import { prisma } from '../../lib/prisma';
export class KycRepository {
  async verifyUserExistsWithFreshProfile(userId: string) {
    return await prisma.kycProfile.findFirst({
      where: { userId, status: KycStatus.NOT_STARTED },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });
  }

  async createVerificationIntent(
    userId: string,
    data: {
      type: KycVerificationType;
      kycProfileId: string;
      provider: KycProvider;
      submittedData: Prisma.InputJsonValue;
    }
  ) {
    return prisma.kycVerification.create({
      data: {
        userId,
        kycProfileId: data.kycProfileId,
        type: data.type,
        provider: data.provider,
        submittedData: data.submittedData ?? null
      }
    });
  }

  async updateVerificationIntent(verificationId: string, status: KycVerificationStatus) {
    await prisma.kycVerification.update({
      where: { id: verificationId },
      data: {
        status
      }
    });
  }

  async completeSuccessfulKycVerification(kycVerificationId: string, kycProfileId: string) {
    return prisma.$transaction(async (transaction) => {
      await transaction.kycVerification.update({
        where: { id: kycVerificationId },
        data: { status: KycVerificationStatus.APPROVED }
      });

      await transaction.kycProfile.update({
        where: { id: kycProfileId },
        data: {
          verified: true,
          status: KycStatus.VERIFIED,
          lastVerifiedAt: new Date()
        }
      });
    });
  }

  async getStatus(userId: string) {
    const profile = await prisma.kycProfile.findUnique({ where: { userId } });
    if (!profile?.verified) {
      return {
        status: false
      };
    }
    return {
      status: true
    };
  }
}
