import { z } from "zod";

/**
 * Shared Zod contracts for the Auth bounded context.
 *
 * These schemas are the single source of truth for request validation and for
 * the controller/service method argument types.
 */
export const registerSchema = z.object({
  firstName: z.string().trim().min(2).max(100),
  lastName: z.string().trim().min(2).max(100),
  email: z.email().transform((value) => value.trim().toLowerCase()),
  phoneNumber: z
    .string()
    .trim()
    .min(10)
    .max(32)
    .regex(/^\+?[0-9]+$/, "phoneNumber must contain only digits and an optional leading plus sign.")
    .optional(),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, "password must contain at least one uppercase letter.")
    .regex(/[a-z]/, "password must contain at least one lowercase letter.")
    .regex(/[0-9]/, "password must contain at least one number.")
    .regex(/[^A-Za-z0-9]/, "password must contain at least one special character."),
});

export const loginSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(128),
});

export const forgotSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
});

export const resetSchema = z
  .object({
    token: z.string().trim().min(32).max(256),
    newPassword: z
      .string()
      .min(8)
      .max(128)
      .regex(/[A-Z]/, "newPassword must contain at least one uppercase letter.")
      .regex(/[a-z]/, "newPassword must contain at least one lowercase letter.")
      .regex(/[0-9]/, "newPassword must contain at least one number.")
      .regex(/[^A-Za-z0-9]/, "newPassword must contain at least one special character."),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "confirmPassword must match newPassword.",
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotInput = z.infer<typeof forgotSchema>;
export type ResetInput = z.infer<typeof resetSchema>;

export const registerRouteSchema = {
  tags: ["Auth"],
  summary: "Register a new FINX user.",
  body: z.toJSONSchema(registerSchema),
};

export const loginRouteSchema = {
  tags: ["Auth"],
  summary: "Authenticate a FINX user and issue a JWT.",
  body: z.toJSONSchema(loginSchema),
};

export const forgotRouteSchema = {
  tags: ["Auth"],
  summary: "Start the password reset flow for a FINX user.",
  body: z.toJSONSchema(forgotSchema),
};

export const resetRouteSchema = {
  tags: ["Auth"],
  summary: "Reset a FINX user password using a valid reset token.",
  body: z.toJSONSchema(resetSchema),
};
