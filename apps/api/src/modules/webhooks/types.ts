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
