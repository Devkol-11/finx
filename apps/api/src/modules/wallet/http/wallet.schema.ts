import { z } from 'zod';

const decimalAmountSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine((value) => /^\d+(\.\d+)?$/.test(value), {
    message: 'amount must be a valid decimal value.'
  })
  .refine((value) => Number(value) > 0, {
    message: 'amount must be greater than zero.'
  })
  .refine(
    (value) => {
      const [, fraction = ''] = value.split('.');
      return fraction.length <= 2;
    },
    {
      message: 'amount must not have more than two decimal places.'
    }
  );

export const balanceQuerySchema = z.object({
  currency: z.enum(['NGN', 'USD', 'USDT', 'USDC', 'ETH', 'BTC']).default('NGN'),
  activityLimit: z.coerce.number().int().min(1).max(50).default(10)
});

export const transferSchema = z.object({
  finxTag: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9]+$/, 'finxTag must be alphanumeric.'),
  amount: decimalAmountSchema,
  narration: z.string().trim().min(3).max(255).optional(),
  currency: z.enum(['NGN']).default('NGN')
});

export const depositSchema = z.object({
  amount: decimalAmountSchema,
  currency: z.enum(['NGN']).default('NGN'),
  callbackUrl: z.url().optional()
});

export const withdrawSchema = z.object({
  amount: decimalAmountSchema,
  currency: z.enum(['NGN']).default('NGN'),
  bankCode: z.string().trim().min(2).max(16),
  accountNumber: z.string().trim().min(6).max(20),
  accountName: z.string().trim().min(2).max(120),
  narration: z.string().trim().min(3).max(255).optional()
});

export const transactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  currency: z.enum(['NGN', 'USD', 'USDT', 'USDC', 'ETH', 'BTC']).optional()
});

export const paymentReferenceParamsSchema = z.object({
  reference: z
    .string()
    .trim()
    .min(6)
    .max(128)
    .regex(/^[a-zA-Z0-9._=-]+$/, 'reference contains unsupported characters.')
});

export type BalanceQueryInput = z.infer<typeof balanceQuerySchema>;
export type TransferInput = z.infer<typeof transferSchema>;
export type DepositInput = z.infer<typeof depositSchema>;
export type WithdrawInput = z.infer<typeof withdrawSchema>;
export type TransactionsQueryInput = z.infer<typeof transactionsQuerySchema>;
export type PaymentReferenceParams = z.infer<typeof paymentReferenceParamsSchema>;

export const balanceRouteSchema = {
  tags: ['Wallet'],
  summary: 'Get wallet balance and recent activity.'
  // querystring: z.toJSONSchema(balanceQuerySchema), // Commented: Transforms cannot be represented in JSON Schema
};

export const transferRouteSchema = {
  tags: ['Wallet'],
  summary: 'Transfer funds to another FINX user by FinxTag.'
  // body: z.toJSONSchema(transferSchema), // Commented: Transforms cannot be represented in JSON Schema
};

export const depositRouteSchema = {
  tags: ['Wallet'],
  summary: 'Initialize a fiat deposit with the configured payment provider.'
  // body: z.toJSONSchema(depositSchema), // Commented: Transforms cannot be represented in JSON Schema
};

export const withdrawRouteSchema = {
  tags: ['Wallet'],
  summary: 'Withdraw fiat funds to a bank account.'
  // body: z.toJSONSchema(withdrawSchema), // Commented: Transforms cannot be represented in JSON Schema
};

export const transactionsRouteSchema = {
  tags: ['Wallet'],
  summary: 'Get paginated wallet ledger activity.'
  // querystring: z.toJSONSchema(transactionsQuerySchema), // Commented: Transforms cannot be represented in JSON Schema
};
