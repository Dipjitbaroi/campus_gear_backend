import { z } from "zod";
import {
  PaymentStatus,
  RentalOrderStatus,
} from "../../../generated/prisma/enums.js";

const getAllPaymentsValidationSchema = z.object({
  query: z.object({
    search: z
      .string()
      .trim()
      .min(1, "Search cannot be empty")
      .max(100, "Search cannot exceed 100 characters")
      .optional(),
    status: z.enum(PaymentStatus).optional(),
    orderStatus: z.enum(RentalOrderStatus).optional(),
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

const paymentIdValidationSchema = z.object({
  params: z.object({
    id: z.uuid("Payment ID must be a valid UUID"),
  }),
});

export const paymentValidation = {
  getAllPaymentsValidationSchema,
  paymentIdValidationSchema,
};
