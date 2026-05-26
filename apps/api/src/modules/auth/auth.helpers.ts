import { FastifyReply, FastifyRequest } from 'fastify';
import { RegisterInput } from './http/auth.schema';

function maskPhone(phone: string): string {
  return phone.slice(0, 4) + '*'.repeat(4) + phone.slice(-3);
}

function normalizePhone(phoneNumber: string): string {
  const stripped = phoneNumber.replace(/\D/g, '');
  if (stripped.startsWith('234') && stripped.length === 13) return '0' + stripped.slice(3);
  if (stripped.startsWith('0') && stripped.length === 11) return stripped;
  return stripped;
}

function inferNigerianNetwork(normalized: string): string {
  const prefix = normalized.slice(0, 4);

  const networkMap: Record<string, string> = {
    '0803': 'MTN Nigeria',
    '0806': 'MTN Nigeria',
    '0813': 'MTN Nigeria',
    '0814': 'MTN Nigeria',
    '0816': 'MTN Nigeria',
    '0903': 'MTN Nigeria',
    '0906': 'MTN Nigeria',
    '0703': 'MTN Nigeria',
    '0706': 'MTN Nigeria',
    '0802': 'Airtel Nigeria',
    '0808': 'Airtel Nigeria',
    '0812': 'Airtel Nigeria',
    '0701': 'Airtel Nigeria',
    '0708': 'Airtel Nigeria',
    '0902': 'Airtel Nigeria',
    '0907': 'Airtel Nigeria',
    '0901': 'Airtel Nigeria',
    '0805': 'Glo Mobile',
    '0807': 'Glo Mobile',
    '0811': 'Glo Mobile',
    '0815': 'Glo Mobile',
    '0905': 'Glo Mobile',
    '0705': 'Glo Mobile',
    '0809': '9mobile',
    '0817': '9mobile',
    '0818': '9mobile',
    '0908': '9mobile',
    '0909': '9mobile'
  };

  return networkMap[prefix] ?? 'Unknown Network';
}

export interface PhoneVerificationResult {
  verified: boolean;
  normalizedNumber?: string;
  network?: string;
  countryCode?: string;
  country?: string;
  maskedPhone: string;
  verifiedAt: string;
  reason?: string;
}

export function mockVerifyPhoneNumber(phoneNumber: string): PhoneVerificationResult {
  const verifiedAt = new Date().toISOString();
  const normalized = normalizePhone(phoneNumber);

  if (!/^\d{11}$/.test(normalized)) {
    return {
      verified: false,
      maskedPhone: normalized.length >= 7 ? maskPhone(normalized) : '*******',
      verifiedAt,
      reason: 'Phone number must be 11 digits. Accepted formats: 080XXXXXXXX, +23480XXXXXXXX.'
    };
  }

  if (!normalized.startsWith('0')) {
    return {
      verified: false,
      maskedPhone: maskPhone(normalized),
      verifiedAt,
      reason: 'Phone number does not match a valid Nigerian number pattern.'
    };
  }

  if (!/^0[789]/.test(normalized)) {
    return {
      verified: false,
      maskedPhone: maskPhone(normalized),
      verifiedAt,
      reason: 'Phone number does not belong to a recognized Nigerian mobile range.'
    };
  }

  const network = inferNigerianNetwork(normalized);

  if (network === 'Unknown Network') {
    return {
      verified: false,
      maskedPhone: maskPhone(normalized),
      verifiedAt,
      reason: 'Phone number prefix does not match any registered Nigerian network.'
    };
  }

  if (/^0(\d)\1{9}$/.test(normalized)) {
    return {
      verified: false,
      maskedPhone: maskPhone(normalized),
      verifiedAt,
      reason: 'Phone number is not valid.'
    };
  }

  return {
    verified: true,
    normalizedNumber: normalized,
    network,
    countryCode: '+234',
    country: 'Nigeria',
    maskedPhone: maskPhone(normalized),
    verifiedAt
  };
}

export function validateRegisterRequest(request: FastifyRequest<{ Body: RegisterInput }>, reply: FastifyReply) {
  const body = request.body;
}
