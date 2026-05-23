import { apiClient } from '@/lib/api-client';

type BvnVerificationResponse = {
  success: boolean;
  alreadyVerified: boolean;
  message: string;
};

type KycStatusResponse = {
  success: boolean;
  verified: boolean;
  message: string;
};

export const kycApi = {
  verifyBvn: async (bvn: string) => {
    const { data } = await apiClient.post<BvnVerificationResponse>('/kyc/bvn', { bvn });
    return data;
  },
  getStatus: async () => {
    const { data } = await apiClient.get<KycStatusResponse>('/kyc/status');
    return data;
  }
};
