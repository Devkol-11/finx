import { z } from 'zod';

export const paystackWebhookSchema = z.object({
  event: z.enum([
    'charge.success',
    'transfer.success',
    'transfer.failed',
    'transfer.reversed',
    'customeridentification.success',
    'customeridentification.failed'
  ]),

  data: z
    .object({
      id: z.union([z.number(), z.string()])
    })
    .catchall(z.unknown())
});

export type PaystackWebhookInput = z.infer<typeof paystackWebhookSchema>;
