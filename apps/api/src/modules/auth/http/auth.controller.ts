import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../../../config/env";
import type { AuthService } from "../auth.service";
import type {
  ForgotInput,
  LoginInput,
  RegisterInput,
  ResetInput,
} from "./auth.schema";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  public register = async (
    request: FastifyRequest<{ Body: RegisterInput }>,
    reply: FastifyReply
  ): Promise<void> => {
    const result = await this.authService.register(request.body, {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });
    const response = this.attachRefreshCookie(reply, result);

    void reply.status(201).send(response);
  };

  public login = async (
    request: FastifyRequest<{ Body: LoginInput }>,
    reply: FastifyReply
  ): Promise<void> => {
    const result = await this.authService.login(request.body, {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });
    const response = this.attachRefreshCookie(reply, result);

    void reply.status(200).send(response);
  };

  public refresh = async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const refreshToken = request.cookies[env.REFRESH_TOKEN_COOKIE_NAME];

    if (!refreshToken) {
      this.clearRefreshCookie(reply);
      void reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Refresh token is missing.",
        code: "INVALID_REFRESH_TOKEN",
      });
      return;
    }

    try {
      const result = await this.authService.refreshSession(refreshToken, {
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });
      const response = this.attachRefreshCookie(reply, result);

      void reply.status(200).send(response);
    } catch (error) {
      this.clearRefreshCookie(reply);
      throw error;
    }
  };

  public logout = async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    await this.authService.logout(request.user.sessionId);
    this.clearRefreshCookie(reply);

    void reply.status(200).send({
      message: "Logout completed successfully.",
    });
  };

  public forgotPassword = async (
    request: FastifyRequest<{ Body: ForgotInput }>,
    reply: FastifyReply
  ): Promise<void> => {
    const result = await this.authService.forgotPassword(request.body);

    void reply.status(200).send(result);
  };

  public resetPassword = async (
    request: FastifyRequest<{ Body: ResetInput }>,
    reply: FastifyReply
  ): Promise<void> => {
    const result = await this.authService.resetPassword(request.body);

    void reply.status(200).send(result);
  };

  private attachRefreshCookie<T extends { meta: { refreshToken: string } }>(
    reply: FastifyReply,
    result: T
  ): Omit<T, "meta"> {
    reply.setCookie(env.REFRESH_TOKEN_COOKIE_NAME, result.meta.refreshToken, {
      httpOnly: true,
      secure: env.IS_PRODUCTION,
      sameSite: "strict",
      path: "/api/v1/auth",
      maxAge: 7 * 24 * 60 * 60,
      ...(env.COOKIE_DOMAIN
        ? {
            domain: env.COOKIE_DOMAIN,
          }
        : {}),
    });

    const { meta: _meta, ...response } = result;

    return response;
  }

  private clearRefreshCookie(reply: FastifyReply): void {
    reply.clearCookie(env.REFRESH_TOKEN_COOKIE_NAME, {
      path: "/api/v1/auth",
      ...(env.COOKIE_DOMAIN
        ? {
            domain: env.COOKIE_DOMAIN,
          }
        : {}),
    });
  }
}
