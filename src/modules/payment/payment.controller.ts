import { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../errors/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import type { IPaymentFilters } from "./payment.interface.js";
import { paymentService } from "./payment.service.js";

const getActor = (req: Request) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication is required");
  }

  return { id: req.user.id, role: req.user.role };
};

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentService.getAllPaymentsService(
    res.locals.validatedQuery as IPaymentFilters,
    getActor(req),
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Payments retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getPaymentById = catchAsync(async (req: Request, res: Response) => {
  const payment = await paymentService.getPaymentByIdService(
    req.params.id as string,
    getActor(req),
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Payment retrieved successfully",
    data: payment,
  });
});

export const paymentController = {
  getAllPayments,
  getPaymentById,
};
