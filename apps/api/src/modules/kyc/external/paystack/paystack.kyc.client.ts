import { env } from '../../../../config/env';
import { AppError } from '../../../../utils/ErrorHandler';
import { KycProvider, VerificationResult } from '../interface';

interface VerifyBvnInput {
  accountNumber: string;
  bvn: string;
  bankCode: string;
  customerCode: string;
  firstName: string;
  lastName: string;
}

interface KycRequest {
  country: string;
  type: string;
  account_number: string;
  bvn: string;
  bank_code: string;
  first_name: string;
  last_name: string;
}

interface IdentificationData {
  country: string;
  type: string;
  bvn: string;
  account_number: string;
  bank_code: string;
}

interface PaystackSuccessResponse {
  event: 'customeridentification.success';
  data: {
    customer_id: string;
    customer_code: string;
    email: string;
    identification: IdentificationData;
  };
}

interface PaystackFailureResponse {
  event: 'customeridentification.failed';
  data: {
    customer_id: number;
    customer_code: string;
    email: string;
    identification: IdentificationData;
    reason: string;
  };
}

type PaystackResponse = PaystackSuccessResponse | PaystackFailureResponse;

enum VerificationEvent {
  SUCCESS = 'customeridentification.success',
  FAILED = 'customeridentification.failed'
}

export class PaystackKycVerificator implements KycProvider {
  private readonly TIMEOUT_MS = 5000;

  async verifyBvn(input: VerifyBvnInput): Promise<VerificationResult> {
    if (!env.PAYSTACK_SECRET_KEY) {
      console.error('[PAYSTACK_KYC]: PAYSTACK_SECRET_KEY missing');

      throw AppError.internal('Verification service unavailable');
    }

    const url = `https://api.paystack.co/customer/${input.customerCode}/identification`;

    const requestBody: KycRequest = {
      country: 'NG',
      type: 'bank_account',
      account_number: input.accountNumber,
      bvn: input.bvn,
      bank_code: input.bankCode,
      first_name: input.firstName,
      last_name: input.lastName
    };

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`
    };

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, this.TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeout);

      // HANDLE HTTP FAILURES
      if (!response.ok) {
        const errorData: unknown = await response.json();

        console.error('[PAYSTACK_KYC_HTTP_ERROR]', {
          status: response.status,
          statusText: response.statusText,
          body: errorData
        });

        // 4xx usually means request/business issue
        if (response.status >= 400 && response.status < 500) {
          return {
            success: false,
            code: 'VERIFICATION_FAILED',
            message: 'Verification failed'
          };
        }
        throw AppError.internal('Verification provider unavailable');
      }

      const responseData: unknown = await response.json();

      if (typeof responseData !== 'object' || responseData === null || !('event' in responseData)) {
        console.error('[PAYSTACK_KYC_INVALID_RESPONSE]', responseData);

        throw AppError.internal('Invalid verification response received');
      }

      const paystackResponse = responseData as PaystackResponse;

      if (paystackResponse.event === VerificationEvent.FAILED) {
        return {
          success: false,
          code: 'VERIFICATION_FAILED',
          message: paystackResponse.data.reason
        };
      }
      // SUCCESS

      if (paystackResponse.event === VerificationEvent.SUCCESS) {
        return {
          success: true,
          code: 'VERIFIED',
          message: 'Verification successful'
        };
      }
      // UNEXPECTED EVENT

      throw AppError.internal('Unknown verification event received');
    } catch (error) {
      clearTimeout(timeout);

      // TIMEOUT ERROR
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[PAYSTACK_KYC_TIMEOUT]', error.message);

        throw AppError.gatewayTimeout('Verification request timed out');
      }

      // NETWORK ERRORS

      if (error instanceof TypeError) {
        console.error('[PAYSTACK_KYC_NETWORK_ERROR]', error.message);

        throw AppError.internal('Unable to reach verification provider');
      }
      // APP ERRORS
      if (error instanceof AppError) {
        throw error;
      }
      // UNKNOWN ERRORS
      console.error('[PAYSTACK_KYC_UNKNOWN_ERROR]', error);
      throw AppError.internal('Unexpected verification error occurred');
    }
  }
}
