import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthService } from "../auth.service";
import type { ForgotInput, LoginInput, RegisterInput, ResetInput } from "./auth.schema";

/**
 * Controller keeps HTTP concerns thin and delegates business logic to the service.
 *
 * Validation is intentionally handled in route pre-handlers so controllers only
 * coordinate transport concerns and typed service calls.
 */
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  public register = async (
    request: FastifyRequest<{ Body: RegisterInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const result = await this.authService.register(request.body);

    void reply.status(201).send(result);
  };

  public login = async (
    request: FastifyRequest<{ Body: LoginInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const result = await this.authService.login(request.body);

    void reply.status(200).send(result);
  };

  public forgotPassword = async (
    request: FastifyRequest<{ Body: ForgotInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const result = await this.authService.forgotPassword(request.body);

    void reply.status(200).send(result);
  };

  public resetPassword = async (
    request: FastifyRequest<{ Body: ResetInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const result = await this.authService.resetPassword(request.body);

    void reply.status(200).send(result);
  };
}
