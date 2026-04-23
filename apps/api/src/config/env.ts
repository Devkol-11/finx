import { config as loadEnvironmentVariables } from "dotenv";
import { z } from "zod";

loadEnvironmentVariables();

/**
 * Runtime environment contract for the API process.
 *
 * This file is intentionally loaded at startup so that configuration problems
 * fail fast and loudly before the server opens a socket or touches the database.
 */
const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  DATABASE_URL: z.url().min(1, "DATABASE_URL is required."),
  PORT: z.coerce.number().int().min(1).max(65535),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long."),
  PAYSTACK_SECRET_KEY: z.string().min(1, "PAYSTACK_SECRET_KEY is required."),
  REDIS_URL: z.url().min(1, "REDIS_URL is required."),
  CORS_ORIGIN: z.string().trim().optional(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .optional(),
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  const formattedErrors = parsedEnvironment.error.issues
    .map((issue) => `${issue.path.join(".") || "process.env"}: ${issue.message}`)
    .join("\n");

  throw new Error(
    `Environment validation failed. The API cannot start with an invalid configuration.\n${formattedErrors}`,
  );
}

const allowedOrigins =
  parsedEnvironment.data.CORS_ORIGIN?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ??
  (parsedEnvironment.data.NODE_ENV === "production"
    ? []
    : ["http://localhost:3000", "http://localhost:5173"]);

export const env = {
  ...parsedEnvironment.data,
  CORS_ORIGIN_LIST: allowedOrigins,
} as const;

export type Environment = typeof env;
