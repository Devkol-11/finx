import { FastifyPluginAsync } from "fastify";
import { submitBvnSchema } from "./kyc.schema";
import { validateRequest } from "../../../utils/validateRequest";

export const kycRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/bvn",
    {
      schema: {
        body: submitBvnSchema,
      },
      preHandler: [
        validateRequest("body", submitBvnSchema),
        fastify.authenticate,
      ],
    },
    async (request, reply) => {}
  );

  fastify.get(
    "/status",
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {}
  );
};
