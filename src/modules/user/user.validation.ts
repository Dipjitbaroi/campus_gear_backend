import { z } from "zod";
import {
  Role,
  UserStatus,
} from "../../../generated/prisma/enums.js";

const getAllUsersValidationSchema = z.object({
  query: z.object({
    search: z
      .string()
      .trim()
      .min(1, "Search cannot be empty")
      .max(100, "Search cannot exceed 100 characters")
      .optional(),
    role: z.enum(Role).optional(),
    status: z.enum(UserStatus).optional(),
    page: z.coerce
      .number()
      .int("Page must be an integer")
      .positive("Page must be greater than 0")
      .default(1),
    limit: z.coerce
      .number()
      .int("Limit must be an integer")
      .positive("Limit must be greater than 0")
      .max(100, "Limit cannot exceed 100")
      .default(10),
  }),
});

const userIdValidationSchema = z.object({
  params: z.object({
    id: z.uuid("User ID must be a valid UUID"),
  }),
});

const createAdminValidationSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(255, "Name cannot exceed 255 characters"),
    email: z.email("Invalid email address").trim().toLowerCase(),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s-]{7,20}$/, "Invalid phone number"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  }),
});

const updateUserStatusValidationSchema = z.object({
  params: z.object({
    id: z.uuid("User ID must be a valid UUID"),
  }),
  body: z.object({
    status: z.enum(UserStatus),
  }),
});

const updateUserValidationSchema = z.object({
  params: z.object({
    id: z.uuid("User ID must be a valid UUID"),
  }),
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters")
        .max(255, "Name cannot exceed 255 characters")
        .optional(),
      email: z.email("Invalid email address").trim().toLowerCase().optional(),
      phone: z
        .string()
        .trim()
        .regex(/^\+?[0-9\s-]{7,20}$/, "Invalid phone number")
        .optional(),
      role: z.enum(Role).optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field must be provided",
    }),
});

export const userValidation = {
  getAllUsersValidationSchema,
  userIdValidationSchema,
  createAdminValidationSchema,
  updateUserStatusValidationSchema,
  updateUserValidationSchema,
};
