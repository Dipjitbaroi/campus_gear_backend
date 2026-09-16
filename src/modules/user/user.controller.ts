import { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../errors/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import type { IUserFilters } from "./user.interface.js";
import { userService } from "./user.service.js";

const getAllUsers = catchAsync(async (_req: Request, res: Response) => {
  const result = await userService.getAllUsersService(
    res.locals.validatedQuery as IUserFilters,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Users retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.getUserByIdService(req.params.id as string);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "User retrieved successfully",
    data: user,
  });
});

const createAdmin = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.createAdminService(req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Admin created successfully",
    data: user,
  });
});

const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication is required");
  }

  const user = await userService.updateUserStatusService(
    req.params.id as string,
    req.body,
    req.user.id,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "User status updated successfully",
    data: user,
  });
});

const updateUser = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication is required");
  }

  const user = await userService.updateUserService(
    req.params.id as string,
    req.body,
    req.user.id,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "User updated successfully",
    data: user,
  });
});

export const userController = {
  getAllUsers,
  getUserById,
  createAdmin,
  updateUserStatus,
  updateUser,
};
