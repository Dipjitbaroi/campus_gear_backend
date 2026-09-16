import { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../errors/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { IGearItemFilters } from "./gearItem.interface.js";
import { gearItemService } from "./gearItem.service.js";

const createGearItem = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication is required");
  }

  const gearItem = await gearItemService.createGearItemService(req.body, {
    id: req.user.id,
    role: req.user.role,
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Gear item created successfully",
    data: gearItem,
  });
});

const getAllGearItems = catchAsync(async (req: Request, res: Response) => {
  const result = await gearItemService.getAllGearItemsService(
    res.locals.validatedQuery as IGearItemFilters,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Gear items retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getGearPriceRange = catchAsync(async (_req: Request, res: Response) => {
  const range = await gearItemService.getGearPriceRangeService();

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Gear price range retrieved successfully",
    data: range,
  });
});

const getGearItemById = catchAsync(async (req: Request, res: Response) => {
  const gearItem = await gearItemService.getGearItemByIdService(
    req.params.id as string,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Gear item retrieved successfully",
    data: gearItem,
  });
});

const updateGearItem = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication is required");
  }

  const gearItem = await gearItemService.updateGearItemService(
    req.params.id as string,
    req.body,
    { id: req.user.id, role: req.user.role },
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Gear item updated successfully",
    data: gearItem,
  });
});

const deleteGearItem = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication is required");
  }

  const gearItem = await gearItemService.deleteGearItemService(
    req.params.id as string,
    { id: req.user.id, role: req.user.role },
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Gear item deleted successfully",
    data: gearItem,
  });
});

export const gearItemController = {
  createGearItem,
  getAllGearItems,
  getGearPriceRange,
  getGearItemById,
  updateGearItem,
  deleteGearItem,
};
