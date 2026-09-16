import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import type { ICategoryFilters } from "./category.interface.js";
import { categoryService } from "./category.service.js";

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const category = await categoryService.createCategoryService(payload);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Category created successfully",
    data: category,
  });
});
const getAllCategories = catchAsync(async (_req: Request, res: Response) => {
  const categories = await categoryService.getAllCategoriesService(
    res.locals.validatedQuery as ICategoryFilters,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "All category fetch successfully",
    data: categories,
  });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const { name } = req.body;
  const { id } = req.params;
  const category = await categoryService.updateCategoryService({
    name,
    id: id as string,
  });
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Successfully update category",
    data: category,
  });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const category = await categoryService.deleteCategoryService(
    req.params.id as string,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Category deleted successfully",
    data: category,
  });
});

export const categoryController = {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
};
