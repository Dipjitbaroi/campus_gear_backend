import { z } from "zod";
import { Role } from "../../../generated/prisma/enums.js";

const loginUserValidationSchema = z.object({
  body: z.object({
    email: z.email("Invalid email address").trim().toLowerCase(),
    password: z.string().min(6, "Password must be at least 6 characters"),
  }),
});

const registerUserValidationSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Name is required"),
    email: z.email("Invalid email address").trim().toLowerCase(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s-]{7,20}$/, "Invalid phone number"),
    role: z.enum(Role).default(Role.CUSTOMER),
  }),
});

const refreshTokenValidationSchema = z.object({
  body: z.object({
    refreshToken: z.string().trim().min(1, "Refresh token cannot be empty").optional(),
  }),
  cookies: z.object({
    refreshToken: z.string().trim().min(1, "Refresh token cannot be empty").optional(),
  }),
});

const updateAuthUserValidationSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters")
        .max(255, "Name cannot exceed 255 characters")
        .optional(),
      phone: z
        .string()
        .trim()
        .regex(/^\+?[0-9\s-]{7,20}$/, "Invalid phone number")
        .optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field must be provided",
    }),
});

export const authValidation = {
  loginUserValidationSchema,
  updateAuthUserValidationSchema,
  registerUserValidationSchema,
  refreshTokenValidationSchema,
};
