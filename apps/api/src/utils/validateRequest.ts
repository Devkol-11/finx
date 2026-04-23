import type { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from "fastify";
import type { ZodTypeAny } from "zod";

type RequestPart = "body" | "params" | "query";

/**
 * Reusable request validator that parses a specific Fastify request segment
 * and replaces it with the validated/normalized Zod output.
 */
export const validateRequest =
  <TSchema extends ZodTypeAny>(part: RequestPart, schema: TSchema) =>
  (request: FastifyRequest, _reply: FastifyReply, done: HookHandlerDoneFunction): void => {
    const parsedValue = schema.parse(request[part]);

    Object.assign(request, {
      [part]: parsedValue,
    });

    done();
  };
