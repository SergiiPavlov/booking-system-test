import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  role: z.enum(["CLIENT", "BUSINESS", "ADMIN"])
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).max(200).optional(),
  role: z.enum(["CLIENT", "BUSINESS", "ADMIN"]).optional()
});
