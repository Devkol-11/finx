import { FastifyRequest } from 'fastify';
import { PaystackWebhookInput } from './http/webhooks.schema';

export type RawBodyRequest = FastifyRequest<{ Body: PaystackWebhookInput }> & {
  rawBody?: string;
};

export interface dedicatedVirtualAccountWebhookBody {}
