import httpStatus from "http-status";
import { Prisma } from "../../../generated/prisma/client.js";
import { RentalOrderStatus, Role } from "../../../generated/prisma/enums.js";
import { AppError } from "../../errors/AppError.js";
import { prisma } from "../../lib/prisma.js";
import type {
  ICreateReviewPayload,
  IReviewActor,
  IReviewFilters,
  IUpdateReviewPayload,
} from "./review.interface.js";

const REVIEW_INCLUDE = {
  gearItem: {
    select: { id: true, name: true, imageUrl: true },
  },
  customer: {
    select: { id: true, name: true },
  },
  rentalOrder: {
    select: { id: true, status: true, startDate: true, endDate: true },
  },
} satisfies Prisma.ReviewInclude;

const createReviewService = async (
  payload: ICreateReviewPayload,
  customerId: string,
) => {
  const order = await prisma.rentalOrder.findFirst({
    where: {
      id: payload.orderId,
      customerId,
    },
    select: {
      id: true,
      gearItemId: true,
      status: true,
    },
  });

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Order not found");
  }

  if (order.status !== RentalOrderStatus.RETURNED) {
    throw new AppError(
      httpStatus.CONFLICT,
      "A review can only be submitted after the order is returned",
    );
  }

  try {
    return await prisma.review.create({
      data: {
        rentalOrderId: order.id,
        gearItemId: order.gearItemId,
        customerId,
        rating: payload.rating,
        comment: payload.comment,
      },
      include: REVIEW_INCLUDE,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        httpStatus.CONFLICT,
        "A review has already been submitted for this order",
      );
    }

    throw error;
  }
};

const getAllReviewsService = async (filters: IReviewFilters) => {
  const searchFilters: Prisma.ReviewWhereInput[] = filters.search
    ? [
        { comment: { contains: filters.search, mode: "insensitive" } },
        {
          gearItem: {
            name: { contains: filters.search, mode: "insensitive" },
          },
        },
        {
          customer: {
            name: { contains: filters.search, mode: "insensitive" },
          },
        },
      ]
    : [];

  if (
    filters.search &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      filters.search,
    )
  ) {
    searchFilters.push(
      { id: filters.search },
      { rentalOrderId: filters.search },
      { gearItemId: filters.search },
      { customerId: filters.search },
    );
  }

  const where: Prisma.ReviewWhereInput = {
    ...(filters.gearItemId && { gearItemId: filters.gearItemId }),
    ...(filters.rating !== undefined && { rating: filters.rating }),
    ...(searchFilters.length > 0 && { OR: searchFilters }),
  };
  const skip = (filters.page - 1) * filters.limit;

  const [reviews, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      skip,
      take: filters.limit,
      include: REVIEW_INCLUDE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.review.count({ where }),
  ]);

  return {
    data: reviews,
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
    },
  };
};

const getReviewByIdService = async (id: string) => {
  const review = await prisma.review.findUnique({
    where: { id },
    include: REVIEW_INCLUDE,
  });

  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, "Review not found");
  }

  return review;
};

const updateReviewService = async (
  id: string,
  payload: IUpdateReviewPayload,
  customerId: string,
) => {
  const review = await prisma.review.findFirst({
    where: { id, customerId },
    select: { id: true },
  });

  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, "Review not found");
  }

  return prisma.review.update({
    where: { id: review.id },
    data: payload,
    include: REVIEW_INCLUDE,
  });
};

const deleteReviewService = async (id: string, actor: IReviewActor) => {
  const review = await prisma.review.findUnique({
    where: { id },
    select: { id: true, customerId: true },
  });

  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, "Review not found");
  }

  if (actor.role !== Role.ADMIN && review.customerId !== actor.id) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only delete your own reviews",
    );
  }

  return prisma.review.delete({
    where: { id: review.id },
    include: REVIEW_INCLUDE,
  });
};

export const reviewService = {
  createReviewService,
  getAllReviewsService,
  getReviewByIdService,
  updateReviewService,
  deleteReviewService,
};
