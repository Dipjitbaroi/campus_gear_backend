import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { orderController } from "./order.controller.js";
import { orderValidation } from "./order.validation.js";

const router = Router();

router.post("/webhook", orderController.handleWebhook);

router.get(
  "/",
  auth(Role.CUSTOMER, Role.PROVIDER, Role.ADMIN),
  validateRequest(orderValidation.getAllOrdersValidationSchema),
  orderController.getAllOrders,
);

router.post(
  "/",
  auth(Role.CUSTOMER),
  validateRequest(orderValidation.createOrderValidationSchema),
  orderController.createOrder,
);

router.post(
  "/:id/checkout-session",
  auth(Role.CUSTOMER),
  validateRequest(orderValidation.orderIdValidationSchema),
  orderController.createCheckoutSession,
);

router.get(
  "/:id",
  auth(Role.CUSTOMER, Role.PROVIDER, Role.ADMIN),
  validateRequest(orderValidation.orderIdValidationSchema),
  orderController.getOrderById,
);

router.patch(
  "/:id/status",
  auth(Role.CUSTOMER, Role.PROVIDER, Role.ADMIN),
  validateRequest(orderValidation.updateOrderStatusValidationSchema),
  orderController.updateOrderStatus,
);

export const orderRoute = router;
