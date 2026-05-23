import { randomUUID } from 'node:crypto';

function simulateNetworkDelay(): Promise<void> {
  const delay = Math.floor(Math.random() * 300) + 100;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

function maskBvn(bvn: string): string {
  return bvn.slice(0, 3) + '*'.repeat(5) + bvn.slice(-3);
}

export interface BvnVerificationResult {
  verified: boolean;
  maskedBvn: string;
  verificationReference: string;
  verifiedAt: string;
  reason?: string;
}

export async function mockVerifyBvn(bvn: string): Promise<BvnVerificationResult> {
  await simulateNetworkDelay();

  const verificationReference = `bvn_vrfy_${randomUUID()}`;
  const verifiedAt = new Date().toISOString();
  const trimmed = bvn.trim();

  if (!/^\d{11}$/.test(trimmed)) {
    return {
      verified: false,
      maskedBvn: trimmed.length >= 11 ? maskBvn(trimmed) : '***********',
      verificationReference,
      verifiedAt,
      reason: 'BVN must be exactly 11 digits with no letters or special characters.'
    };
  }

  if (/^(\d)\1{10}$/.test(trimmed)) {
    return {
      verified: false,
      maskedBvn: maskBvn(trimmed),
      verificationReference,
      verifiedAt,
      reason: 'BVN is not valid.'
    };
  }

  if (!trimmed.startsWith('2')) {
    return {
      verified: false,
      maskedBvn: maskBvn(trimmed),
      verificationReference,
      verifiedAt,
      reason: 'BVN does not match a recognized issuance pattern.'
    };
  }

  return {
    verified: true,
    maskedBvn: maskBvn(trimmed),
    verificationReference,
    verifiedAt
  };
}
