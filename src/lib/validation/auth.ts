import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  role: z.enum(["CLIENT", "BUSINESS"]),
  // Optional: used to persist BUSINESS timezone for availability calculations.
  tzOffsetMin: z.coerce.number().int().min(-840).max(840).optional()
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});
