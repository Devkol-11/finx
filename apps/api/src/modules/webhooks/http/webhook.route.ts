import type { FastifyPluginAsync } from 'fastify';
// import { RawBodyRequest } from '../types';
import { PaystackWebhookInput } from './webhooks.schema';
import { webHookController } from './webhooks.controllers';
import type { FastifyRequest } from 'fastify';

export type RawBodyRequest = FastifyRequest<{ Body: PaystackWebhookInput }> & {
  rawBody?: string;
};

export const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addContentTypeParser(
    'application/json',
    {
      parseAs: 'buffer'
    },
    (request: FastifyRequest & { rawBody?: string }, body, done) => {
      const rawBody = body.toString('utf8');
      request.rawBody = rawBody;

      try {
        done(null, rawBody.length > 0 ? JSON.parse(rawBody) : {});
      } catch (error) {
        done(error as Error, undefined);
      }
    }
  );

  fastify.post('/paystack', (req, reply) => {
    webHookController(req as RawBodyRequest, reply);
  });
};
