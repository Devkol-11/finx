import { FastifyReply, FastifyRequest } from 'fastify';
import { ProfileService } from '../profile.service';
import { UpdateProfileInput } from './profile.schema';

export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  public getProfile = async (request: FastifyRequest, reply: FastifyReply) => {
    const response = await this.profileService.getProfile(request.user.userId);
    return reply.status(200).send(response);
  };
  public updateProfile = async (request: FastifyRequest<{ Body: UpdateProfileInput }>, reply: FastifyReply) => {
    const response = await this.profileService.updateProfile(request.user.userId, request.body);
    return reply.status(201).send(response);
  };
}
