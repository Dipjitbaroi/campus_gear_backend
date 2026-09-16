import { z } from "zod";

const categoryNameSchema = z
  .string()
  .trim()
  .min(2, "Category name must be at least 2 characters")
  .max(255, "Category name cannot exceed 255 characters");

const createOrUpdateCategoryValidationSchema = z.object({
  body: z.object({
    name: categoryNameSchema,
  }),
});

const categoryIdValidationSchema = z.object({
  params: z.object({
    id: z.uuid("Category ID must be a valid UUID"),
  }),
});

const getAllCategoriesValidationSchema = z.object({
  query: z.object({
    search: z
      .string()
      .trim()
      .min(1, "Search cannot be empty")
      .max(100, "Search cannot exceed 100 characters")
      .optional(),
  }),
});

const updateCategoryValidationSchema = z.object({
  params: z.object({
    id: z.uuid("Category ID must be a valid UUID"),
  }),
  body: z.object({
    name: categoryNameSchema,
  }),
});

export const categoryValidation = {
  createOrUpdateCategoryValidationSchema,
  getAllCategoriesValidationSchema,
  categoryIdValidationSchema,
  updateCategoryValidationSchema,
};
