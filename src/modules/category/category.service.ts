import httpStatus from "http-status";
import { AppError } from "../../errors/AppError.js";
import { prisma } from "../../lib/prisma.js";
import type {
  ICategoryCreate,
  ICategoryFilters,
  ICategoryUpdate,
} from "./category.interface.js";

const createCategoryService = (payload: ICategoryCreate) => {
  const { name } = payload;
  const category = prisma.category.create({
    data: {
      name,
    },
  });
  return category;
};

const getAllCategoriesService = (filters: ICategoryFilters) => {
  const categories = prisma.category.findMany({
    where: filters.search
      ? { name: { contains: filters.search, mode: "insensitive" } }
      : undefined,
    orderBy: { name: "asc" },
  });
  return categories;
};
const updateCategoryService = (payload: ICategoryUpdate) => {
  const { name, id } = payload;
  const category = prisma.category.update({
    where: {
      id,
    },
    data: {
      name,
    },
  });
  return category;
};

const deleteCategoryService = async (id: string) => {
  const category = await prisma.category.findUnique({
    where: { id },
    select: {
      id: true,
      _count: {
        select: { gearItems: true },
      },
    },
  });

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Category not found");
  }

  if (category._count.gearItems > 0) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Cannot delete category because ${category._count.gearItems} gear item(s) are associated with it. Delete those items or change their category first.`,
    );
  }

  return prisma.category.delete({
    where: { id },
  });
};

export const categoryService = {
  createCategoryService,
  getAllCategoriesService,
  updateCategoryService,
  deleteCategoryService,
};
