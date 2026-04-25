import { z } from "zod";

const decimalAmountSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine((value) => /^\d+(\.\d+)?$/.test(value), {
    message: "amount must be a valid decimal value.",
  })
  .refine((value) => Number(value) > 0, {
    message: "amount must be greater than zero.",
  });

export const subscribeSchema = z.object({
  planKey: z.enum(["FLEX_DAILY", "FIXED_LOCK", "WEALTH_MONTHLY"]),
  amount: decimalAmountSchema,
});

export const withdrawParamsSchema = z.object({
  id: z.uuid(),
});

export const portfolioQuerySchema = z.object({
  status: z.enum(["ACTIVE", "MATURED", "CANCELLED"]).optional(),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;
export type WithdrawParamsInput = z.infer<typeof withdrawParamsSchema>;
export type PortfolioQueryInput = z.infer<typeof portfolioQuerySchema>;

export const plansRouteSchema = {
  tags: ["Invest"],
  summary: "List available investment plans and their terms.",
};

export const subscribeRouteSchema = {
  tags: ["Invest"],
  summary: "Subscribe to an investment plan.",
  // body: z.toJSONSchema(subscribeSchema), // Commented: Transforms cannot be represented in JSON Schema
};

export const portfolioRouteSchema = {
  tags: ["Invest"],
  summary: "Get the authenticated user's investment portfolio.",
  // querystring: z.toJSONSchema(portfolioQuerySchema), // Commented: Transforms cannot be represented in JSON Schema
};

export const withdrawRouteSchema = {
  tags: ["Invest"],
  summary: "Withdraw or liquidate an investment if the strategy allows it.",
  // params: z.toJSONSchema(withdrawParamsSchema), // Commented: Transforms cannot be represented in JSON Schema
};
