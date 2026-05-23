import { FastifyRequest } from 'fastify';
import { PaystackWebhookInput } from './http/webhooks.schema';

export type RawBodyRequest = FastifyRequest<{ Body: PaystackWebhookInput }> & {
  rawBody?: string;
};

export interface PaystackChargeSuccessWebhook {
  event: 'charge.success';

  data: {
    id: number;
    status: 'success' | 'failed' | 'pending';
    reference: string;
    amount: number;
    currency: string;
    gateway_response?: string | null;
    paid_at?: string | null;
    channel?: string | null;
    fees?: number | null;
    metadata?: Record<string, unknown> | null;
    authorization?: {
      authorization_code?: string | null;
      reusable?: boolean | null;
    } | null;
    customer?: {
      email?: string | null;
    } | null;
  };
}

export interface CustomerIdentificationSuccessEvent {
  event: 'customeridentification.success';
  data: {
    customer_id: string;
    customer_code: string;
    email: string;
    identification: {
      country: string;
      type: string;
      value: string;
    };
  };
}

export interface CustomerIdentificationFailedEvent {
  event: 'customeridentification.failed';
  data: {
    customer_id: number;
    customer_code: string;
    email: string;
    identification: {
      country: string;
      type: string;
      bvn: string;
      account_number: string;
      bank_code: string;
    };
    reason: string;
  };
}
