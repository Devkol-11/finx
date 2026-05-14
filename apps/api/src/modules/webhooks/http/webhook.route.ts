import type { FastifyPluginAsync } from 'fastify';
import { RawBodyRequest } from '../types';
import { webHookController } from './webhooks.controllers';
import type { FastifyRequest } from 'fastify';

export const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addContentTypeParser(
    'application/json',
    {
      parseAs: 'buffer'
    },
    (request: FastifyRequest & { rawBody?: string }, body, done) => {
      console.log(['REQUEST BODY AT /webhook/paystack : ', request]);
      const rawBody = body.toString('utf8');
      request.rawBody = rawBody;

      try {
        done(null, rawBody.length > 0 ? JSON.parse(rawBody) : {});
      } catch (error) {
        done(error as Error, undefined);
      }
    }
  );

  fastify.post('/webhook/paystack', (req, reply) => {
    webHookController(req as RawBodyRequest, reply);
  });
};
