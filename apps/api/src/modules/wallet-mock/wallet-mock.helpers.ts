import { prisma } from '../../lib/prisma';

interface response {
  verified: boolean;
  message?: string;
}

export async function verifyUserKycProfile(userId: string): Promise<response> {
  const kycProfile = await prisma.kycProfile.findUnique({ where: { userId } });
  if (!kycProfile) {
    return {
      verified: false,
      message: 'No Kyc profile found for this user'
    };
  }
  if (!kycProfile.verified) {
    return {
      verified: false,
      message: 'Unable to process request , Kyc not verified'
    };
  }

  return {
    verified: true
  };
}
