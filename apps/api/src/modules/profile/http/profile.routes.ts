import { FastifyPluginAsync } from 'fastify';
import { ProfileController } from './profile.controller';
import { ProfileService } from '../profile.service';
import { ProfileRepository } from '../profile.repository';
import { validateRequest } from '../../../utils/validateRequest';
import { UpdateProfileInput, updateProfileSchema } from './profile.schema';

export const profileRoutes: FastifyPluginAsync = async (fastify) => {
  const profileController = new ProfileController(new ProfileService(new ProfileRepository()));
  fastify.get(
    '/me',
    {
      config: {
        rateLimit: {
          max: 15,
          timeWindow: '1 minute'
        }
      },
      preHandler: [(request, reply) => fastify.authenticate(request, reply)]
    },
    profileController.getProfile
  );
  fastify.patch<{ Body: UpdateProfileInput }>(
    '/me',
    {
      config: {
        rateLimit: {
          max: 15,
          timeWindow: '1 minute'
        }
      },
      preHandler: [(request, reply) => fastify.authenticate(request, reply), validateRequest('body', updateProfileSchema)]
    },
    profileController.updateProfile
  );
};
