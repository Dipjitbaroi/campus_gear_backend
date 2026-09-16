import { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../errors/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { paymentService } from "../payment/payment.service.js";
import type { IOrderFilters } from "./order.interface.js";
import { orderService } from "./order.service.js";
import { orderWebhookService } from "./order.webhook.service.js";

const getActor = (req: Request) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication is required");
  }

  return { id: req.user.id, role: req.user.role, email: req.user.email };
};

const createOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await orderService.createOrderService(
    req.body,
    getActor(req).id,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Order placed successfully and is awaiting confirmation",
    data: result,
  });
});

const createCheckoutSession = catchAsync(
  async (req: Request, res: Response) => {
    const result = await paymentService.createCheckoutSessionService(
      req.params.id as string,
      getActor(req),
    );

    sendResponse(res, {
      success: true,
      statusCode: result.reused ? httpStatus.OK : httpStatus.CREATED,
      message: result.reused
        ? "Existing checkout session retrieved successfully"
        : "Checkout session created successfully",
      data: result,
    });
  },
);

const getAllOrders = catchAsync(async (req: Request, res: Response) => {
  const result = await orderService.getAllOrdersService(
    res.locals.validatedQuery as IOrderFilters,
    getActor(req),
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Orders retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getOrderById = catchAsync(async (req: Request, res: Response) => {
  const order = await orderService.getOrderByIdService(
    req.params.id as string,
    getActor(req),
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Order retrieved successfully",
    data: order,
  });
});

const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
  const order = await orderService.updateOrderStatusService(
    req.params.id as string,
    req.body,
    getActor(req),
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Order status updated successfully",
    data: order,
  });
});

const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"];

  if (typeof signature !== "string") {
    throw new AppError(httpStatus.BAD_REQUEST, "Missing Stripe signature");
  }

  if (!Buffer.isBuffer(req.body)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Stripe webhook body must be raw",
    );
  }

  await orderWebhookService.handleWebhook(req.body, signature);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Webhook processed successfully",
    data: null,
  });
});

export const orderController = {
  createOrder,
  createCheckoutSession,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  handleWebhook,
};
