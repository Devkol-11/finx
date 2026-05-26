import type { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify';
import { ZodError, type ZodTypeAny } from 'zod';

type RequestPart = 'body' | 'params' | 'query';

export const validateRequest =
  <TSchema extends ZodTypeAny>(part: RequestPart, schema: TSchema) =>
  (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction): void => {
    try {
      const parsedValue = schema.parse(request[part]);
      Object.assign(request, { [part]: parsedValue });
      done();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
          expected: 'expected' in issue ? issue.expected : undefined,
          received: 'received' in issue ? issue.received : undefined
        }));

        // Build a frontend-friendly error map
        const fieldErrors: Record<string, string> = {};
        for (const issue of issues) {
          fieldErrors[issue.field] = issue.message;
        }

        reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Validation failed',
          code: 'ZOD_VALIDATION_ERROR',
          details: issues,
          fieldErrors: fieldErrors,
          timestamp: new Date().toISOString()
        });
        return;
      }

      done(error as Error);
    }
  };
