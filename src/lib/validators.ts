import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const signupSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  role: z.enum(["ADMIN", "CLINICIAN", "FRONT_DESK", "RESEARCHER"]),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  active: z.boolean().optional(),
});
