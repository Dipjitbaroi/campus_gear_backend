import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { reviewController } from "./review.controller.js";
import { reviewValidation } from "./review.validation.js";

const router = Router();

router.get(
  "/",
  validateRequest(reviewValidation.getAllReviewsValidationSchema),
  reviewController.getAllReviews,
);

router.post(
  "/",
  auth(Role.CUSTOMER),
  validateRequest(reviewValidation.createReviewValidationSchema),
  reviewController.createReview,
);

router.get(
  "/:id",
  validateRequest(reviewValidation.reviewIdValidationSchema),
  reviewController.getReviewById,
);

router.patch(
  "/:id",
  auth(Role.CUSTOMER),
  validateRequest(reviewValidation.updateReviewValidationSchema),
  reviewController.updateReview,
);

router.delete(
  "/:id",
  auth(Role.CUSTOMER, Role.ADMIN),
  validateRequest(reviewValidation.reviewIdValidationSchema),
  reviewController.deleteReview,
);

export const reviewRoute = router;
