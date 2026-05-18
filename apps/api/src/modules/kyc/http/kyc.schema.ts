import { z } from "zod";

export const submitBvnSchema = z.object({
  bvn: z
    .string()
    .trim()
    .regex(/^\d{11}$/, "BVN must be 11 digits"),
});

export type SubmitBvnInput = z.infer<typeof submitBvnSchema>;
