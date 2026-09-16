import { z } from "zod";

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Date must be a valid calendar date");

const queryBooleanSchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const createGearItemValidationSchema = z.object({
  body: z.object({
    categoryId: z.uuid("Category ID must be a valid UUID"),
    providerId: z.uuid("Provider ID must be a valid UUID").optional(),
    name: z
      .string()
      .trim()
      .min(2, "Gear item name must be at least 2 characters")
      .max(255, "Gear item name cannot exceed 255 characters"),
    description: z
      .string()
      .trim()
      .min(10, "Description must be at least 10 characters"),
    stock: z
      .number()
      .int("Stock must be an integer")
      .nonnegative("Stock cannot be negative")
      .optional(),
    isAvailable: z.boolean().optional(),
    pricePerDay: z
      .number()
      .positive("Price per day must be greater than 0")
      .max(99999999.99, "Price per day is too large"),
    imageUrl: z.url("Image URL must be a valid URL").nullable().optional(),
    imageUrls: z
      .array(z.url("Each gallery image must be a valid URL"))
      .max(4, "A gear item can have at most 4 gallery images")
      .optional(),
    brand: z
      .string()
      .trim()
      .min(1, "Brand cannot be empty")
      .max(255, "Brand cannot exceed 255 characters")
      .nullable()
      .optional(),
  }),
});

const getAllGearItemsValidationSchema = z.object({
  query: z
    .object({
      providerId: z.uuid("Provider ID must be a valid UUID").optional(),
      search: z
        .string()
        .trim()
        .min(1, "Search cannot be empty")
        .max(255, "Search cannot exceed 255 characters")
        .optional(),
      category: z.string().trim().min(1, "Category cannot be empty").optional(),
      brand: z.string().trim().min(1, "Brand cannot be empty").optional(),
      price: z.coerce
        .number()
        .nonnegative("Price cannot be negative")
        .optional(),
      minPrice: z.coerce
        .number()
        .nonnegative("Minimum price cannot be negative")
        .optional(),
      maxPrice: z.coerce
        .number()
        .nonnegative("Maximum price cannot be negative")
        .optional(),
      isAvailable: queryBooleanSchema.optional(),
      inStock: queryBooleanSchema.optional(),
      startDate: dateOnlySchema.optional(),
      endDate: dateOnlySchema.optional(),
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
    })
    .refine(
      ({ minPrice, maxPrice }) =>
        minPrice === undefined ||
        maxPrice === undefined ||
        minPrice <= maxPrice,
      {
        message: "Minimum price cannot be greater than maximum price",
        path: ["minPrice"],
      },
    )
    .refine(
      ({ startDate, endDate }) => Boolean(startDate) === Boolean(endDate),
      {
        message: "Start date and end date must be provided together",
        path: ["startDate"],
      },
    )
    .refine(
      ({ startDate, endDate }) =>
        !startDate || !endDate || startDate <= endDate,
      {
        message: "Start date cannot be after end date",
        path: ["startDate"],
      },
    ),
});

const getGearItemByIdValidationSchema = z.object({
  params: z.object({
    id: z.uuid("Gear item ID must be a valid UUID"),
  }),
});

const updateGearItemValidationSchema = z.object({
  params: z.object({
    id: z.uuid("Gear item ID must be a valid UUID"),
  }),
  body: z
    .object({
      categoryId: z.uuid("Category ID must be a valid UUID").optional(),
      name: z
        .string()
        .trim()
        .min(2, "Gear item name must be at least 2 characters")
        .max(255, "Gear item name cannot exceed 255 characters")
        .optional(),
      description: z
        .string()
        .trim()
        .min(10, "Description must be at least 10 characters")
        .optional(),
      stock: z
        .number()
        .int("Stock must be an integer")
        .nonnegative("Stock cannot be negative")
        .optional(),
      isAvailable: z.boolean().optional(),
      pricePerDay: z
        .number()
        .positive("Price per day must be greater than 0")
        .max(99999999.99, "Price per day is too large")
        .optional(),
      imageUrl: z.url("Image URL must be a valid URL").nullable().optional(),
      imageUrls: z
        .array(z.url("Each gallery image must be a valid URL"))
        .max(4, "A gear item can have at most 4 gallery images")
        .optional(),
      brand: z
        .string()
        .trim()
        .min(1, "Brand cannot be empty")
        .max(255, "Brand cannot exceed 255 characters")
        .nullable()
        .optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field is required to update a gear item",
    }),
});

export const gearItemValidation = {
  createGearItemValidationSchema,
  getAllGearItemsValidationSchema,
  getGearItemByIdValidationSchema,
  updateGearItemValidationSchema,
};
