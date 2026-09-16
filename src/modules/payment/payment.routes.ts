import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { paymentController } from "./payment.controller.js";
import { paymentValidation } from "./payment.validation.js";

const router = Router();

router.get(
  "/",
  auth(Role.CUSTOMER, Role.PROVIDER, Role.ADMIN),
  validateRequest(paymentValidation.getAllPaymentsValidationSchema),
  paymentController.getAllPayments,
);

router.get(
  "/:id",
  auth(Role.CUSTOMER, Role.PROVIDER, Role.ADMIN),
  validateRequest(paymentValidation.paymentIdValidationSchema),
  paymentController.getPaymentById,
);

export const paymentRoute = router;
