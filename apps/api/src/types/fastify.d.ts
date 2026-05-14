import 'fastify';
import '@fastify/jwt';
import type { Prisma } from '@prisma/client';
import type { FastifyReply, FastifyRequest } from 'fastify';

type AuthSession = Prisma.SessionGetPayload<{
  include: {
    user: true;
  };
}>;

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string;
      email?: string;
      sessionId: string;
      type?: string;
    };
    user: {
      userId: string;
      email: string;
      sessionId: string;
      type?: string;
    };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    authSession: AuthSession | null;
    rawBody?: string;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    rawbody?: string;
  }
}
