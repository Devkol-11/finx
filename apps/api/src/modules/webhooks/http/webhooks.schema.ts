import { z } from 'zod';

export const paystackWebhookSchema = z
  .object({
    event: z.string().trim().min(1),

    data: z
      .object({
        reference: z.string().trim().min(1).optional(),
        transfer_code: z.string().trim().min(1).optional()
      })
      .catchall(z.unknown())
  })
  .catchall(z.unknown());

export type PaystackWebhookInput = z.infer<typeof paystackWebhookSchema>;
