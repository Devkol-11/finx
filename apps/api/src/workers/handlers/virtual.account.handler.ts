import { env } from '../../config/env';

interface jobPayload {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

interface requestPayload {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  preferred_bank: string;
  country: string;
  account_number?: string;
  bvn?: string;
  bank_code?: string;
  subaccount?: string;
  split_code?: string;
}

interface PaystackVirtualAccountResponse {
  status: boolean;
  message: string;
}

export async function handleVirtualAccountJob(input: unknown) {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Invalid virtual account job payload');
  }
  const url = 'https://api.paystack.co/dedicated_account/assign';
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`
  };
  const payload = input as jobPayload;

  const request: requestPayload = {
    email: payload.email,
    first_name: payload.firstName,
    last_name: payload.lastName,
    phone: payload.phoneNumber,
    preferred_bank: 'wema-bank',
    country: 'NG'
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.log('[VIRTUAL ACCOUNT CREATION ERROR , THE REQUEST WAS NOT PROCESSED] : ', {
        statusCode: response.status,
        message: response.statusText,
        body: errorData
      });
    }

    const data = (await response.json()) as PaystackVirtualAccountResponse;

    if (!data.status) {
      console.error('[VIRTUAL ACCOUNT CREATION ERROR ==== THE REQUEST WAS PROCESSED BUT NOT SUCCESSFUL', {
        message: data.message
      });
    }

    console.log('VIRTUAL ACCOUNT CREATION IN PROGRESS ========= AWAITING WEB_HOOK');
  } catch (error) {}
}
