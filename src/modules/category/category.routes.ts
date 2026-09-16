import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { categoryController } from "./category.controller.js";
import { categoryValidation } from "./category.validation.js";

const router = Router();

router.get(
  "/",
  validateRequest(categoryValidation.getAllCategoriesValidationSchema),
  categoryController.getAllCategories,
);
router.post(
  "/",
  auth(Role.ADMIN),
  validateRequest(categoryValidation.createOrUpdateCategoryValidationSchema),
  categoryController.createCategory,
);
router.patch(
  "/:id",
  auth(Role.ADMIN),
  validateRequest(categoryValidation.updateCategoryValidationSchema),
  categoryController.updateCategory,
);
router.delete(
  "/:id",
  auth(Role.ADMIN),
  validateRequest(categoryValidation.categoryIdValidationSchema),
  categoryController.deleteCategory,
);
export const categoryRoute = router;
