import { z } from 'zod';

export const updateProfileSchema = z.object({
  avatarUrl: z.string().url('Invalid avatar URL')
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
