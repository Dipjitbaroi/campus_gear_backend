import { z } from "zod";

const ratingSchema = z
  .number()
  .min(1, "Rating must be at least 1")
  .max(5, "Rating cannot exceed 5")
  .multipleOf(0.1, "Rating can have at most one decimal place");

const commentSchema = z
  .string()
  .trim()
  .min(3, "Comment must be at least 3 characters")
  .max(2000, "Comment cannot exceed 2000 characters");

const createReviewValidationSchema = z.object({
  body: z.object({
    orderId: z.uuid("Order ID must be a valid UUID"),
    rating: ratingSchema,
    comment: commentSchema.optional(),
  }),
});

const getAllReviewsValidationSchema = z.object({
  query: z.object({
    search: z
      .string()
      .trim()
      .min(1, "Search cannot be empty")
      .max(100, "Search cannot exceed 100 characters")
      .optional(),
    gearItemId: z.uuid("Gear item ID must be a valid UUID").optional(),
    rating: z.coerce
      .number()
      .min(1, "Rating must be at least 1")
      .max(5, "Rating cannot exceed 5")
      .multipleOf(0.1, "Rating can have at most one decimal place")
      .optional(),
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

const reviewIdValidationSchema = z.object({
  params: z.object({
    id: z.uuid("Review ID must be a valid UUID"),
  }),
});

const updateReviewValidationSchema = z.object({
  params: z.object({
    id: z.uuid("Review ID must be a valid UUID"),
  }),
  body: z
    .object({
      rating: ratingSchema.optional(),
      comment: commentSchema.nullable().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field is required to update a review",
    }),
});

export const reviewValidation = {
  createReviewValidationSchema,
  getAllReviewsValidationSchema,
  reviewIdValidationSchema,
  updateReviewValidationSchema,
};
