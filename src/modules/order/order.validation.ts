import { z } from "zod";
import {
  PaymentStatus,
  RentalOrderStatus,
} from "../../../generated/prisma/enums.js";

const createOrderValidationSchema = z.object({
  body: z
    .object({
      gearItemId: z.uuid("Gear item ID must be a valid UUID"),
      startDate: z.iso.date("Start date must use YYYY-MM-DD format"),
      endDate: z.iso.date("End date must use YYYY-MM-DD format"),
      quantity: z
        .number()
        .int("Quantity must be an integer")
        .positive("Quantity must be greater than 0")
        .default(1),
    })
    .refine(({ startDate, endDate }) => startDate <= endDate, {
      message: "End date cannot be earlier than start date",
      path: ["endDate"],
    }),
});

const orderIdValidationSchema = z.object({
  params: z.object({
    id: z.uuid("Order ID must be a valid UUID"),
  }),
});

const getAllOrdersValidationSchema = z.object({
  query: z.object({
    search: z
      .string()
      .trim()
      .min(1, "Search cannot be empty")
      .max(100, "Search cannot exceed 100 characters")
      .optional(),
    status: z.enum(RentalOrderStatus).optional(),
    paymentStatus: z.enum(PaymentStatus).optional(),
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

const updateOrderStatusValidationSchema = z.object({
  params: z.object({
    id: z.uuid("Order ID must be a valid UUID"),
  }),
  body: z.object({
    status: z.enum([
      RentalOrderStatus.CONFIRMED,
      RentalOrderStatus.PICKED_UP,
      RentalOrderStatus.RETURNED,
      RentalOrderStatus.CANCELLED,
    ]),
  }),
});

export const orderValidation = {
  createOrderValidationSchema,
  orderIdValidationSchema,
  getAllOrdersValidationSchema,
  updateOrderStatusValidationSchema,
};
