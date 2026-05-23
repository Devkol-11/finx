import { z } from 'zod';

const moneyRegex = /^\d+(\.\d{1,2})?$/;

export const createSavingsPlanSchema = z
  .object({
    type: z.enum(['FLEXIBLE', 'LOCKED', 'TARGET']),

    name: z.string().trim().min(2).max(100),

    description: z.string().trim().max(500).optional().nullable(),

    targetAmount: z.string().trim().regex(moneyRegex, 'Invalid target amount format.').optional(),

    unlockDate: z
      .string()
      .trim()
      .pipe(z.iso.datetime({ message: 'Invalid ISO date string.' }))
      .optional(),

    locked: z.boolean().optional(),

    currency: z.enum(['NGN', 'USD', 'USDT', 'USDC', 'ETH', 'BTC'])
  })
  .refine((data) => data.type !== 'TARGET' || !!data.targetAmount, {
    path: ['targetAmount'],
    message: 'targetAmount is required for TARGET savings plans.'
  })
  .refine((data) => data.type !== 'LOCKED' || !!data.unlockDate, {
    path: ['unlockDate'],
    message: 'unlockDate is required for LOCKED savings plans.'
  });

export const fundSavingsPlanSchema = z.object({
  amount: z.string().trim().regex(moneyRegex, 'Invalid amount format.'),

  reference: z.string().trim().min(1)
});

export const withdrawFromSavingsPlanSchema = z.object({
  amount: z.string().trim().regex(moneyRegex, 'Invalid amount format.'),
  reference: z.string().trim().min(1)
});

export const cancelSavingsPlanSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional()
});

export const planIdParamsSchema = z.object({
  planId: z.string().trim().min(1)
});

export const walletIdParamsSchema = z.object({
  walletId: z.string().trim().min(1)
});

export type FundSavingsPlanInput = z.infer<typeof fundSavingsPlanSchema>;

export type CreateSavingsPlanInput = z.infer<typeof createSavingsPlanSchema>;

export type WithdrawFromSavingsPlanInput = z.infer<typeof withdrawFromSavingsPlanSchema>;

export type CancelSavingsPlanInput = z.infer<typeof cancelSavingsPlanSchema>;

export type planIdParamsInput = z.infer<typeof planIdParamsSchema>;

export type walletParamsInput = z.infer<typeof walletIdParamsSchema>;
