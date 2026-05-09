import { env } from '../../../../config/env';

export interface KycRequest {
  country: string;
  type: string;
  account_number: string;
  bvn: string;
  bank_code: string;
  first_name: string;
  last_name: string;
}

// Identification data structure
interface IdentificationData {
  country: string;
  type: string;
  bvn: string;
  account_number: string;
  bank_code: string;
}

// Paystack response on success
interface PaystackSuccessResponse {
  event: 'customeridentification.success';
  data: {
    customer_id: string;
    customer_code: string;
    email: string;
    identification: IdentificationData;
  };
}

// Paystack response on failure
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

type ResponseType = { success: boolean; message: string } | { success: boolean; message: string; statusCode?: number; code?: string };

enum VerificationEvent {
  success = 'customeridentification.success',
  fail = 'customeridentification.failed'
}

export class PaystackKycVerificator {
  async verify(input: {
    accountNumber: string;
    bvn: string;
    bankCode: string;
    customerCode: string;
    firstName: string;
    lastName: string;
  }): Promise<ResponseType> {
    // Validate environment
    if (!env.PAYSTACK_SECRET_KEY) {
      return {
        success: false,
        message: 'Paystack configuration missing',
        statusCode: 500,
        code: 'INTERNAL_SERVER'
      };
    }

    const url = `https://api.paystack.co/customer/${input.customerCode}/identification`;

    const request: KycRequest = {
      country: 'NG',
      type: 'bank_account',
      account_number: input.accountNumber,
      bvn: input.bvn,
      bank_code: input.bankCode,
      first_name: input.firstName,
      last_name: input.lastName
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        // Read error response from Paystack
        const errorData = (await response.json()) as any;
        const errorMessage = errorData?.message || 'Verification Failed';

        console.error('[Paystack KYC Error]', {
          statusCode: response.status,
          statusText: response.statusText,
          body: errorData
        });

        return {
          success: false,
          message: errorMessage,
          statusCode: response.status,
          code: response.statusText
        };
      }

      const paystackResponse = (await response.json()) as PaystackResponse;

      // Type guard for failure response
      if (paystackResponse.event === VerificationEvent.fail) {
        const failResponse = paystackResponse as PaystackFailureResponse;
        return {
          success: false,
          message: failResponse.data.reason || 'Verification failed',
          statusCode: 400,
          code: 'BAD_REQUEST'
        };
      }

      // Type guard for success response
      if (paystackResponse.event === VerificationEvent.success) {
        return {
          success: true,
          message: 'Verification Successful'
        };
      }

      // Fallback for unexpected event
      return {
        success: false,
        message: 'Unexpected verification response',
        statusCode: 400,
        code: 'BAD_REQUEST'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('KYC Verification Error:', errorMessage);

      return {
        success: false,
        message: 'Something went wrong',
        statusCode: 500,
        code: 'INTERNAL_SERVER'
      };
    }
  }
}
