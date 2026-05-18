export interface KycProvider {
  verifyBvn(input: { accountNumber?: string; bvn: string; customerCode?: string; firstName: string; lastName: string }): Promise<VerificationResult>;
}

type VerificationSuccess = {
  success: true;
  code: 'VERIFIED';
  message: string;
};

type VerificationFailure = {
  success: false;
  code: 'BVN_MISMATCH' | 'ACCOUNT_MISMATCH' | 'INVALID_BVN' | 'VERIFICATION_FAILED';
  message: string;
};

export type VerificationResult = VerificationSuccess | VerificationFailure;
