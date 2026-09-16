import httpStatus from "http-status";
import { Prisma } from "../../../generated/prisma/client.js";
import { Role, UserStatus } from "../../../generated/prisma/enums.js";
import { RentalOrderStatus } from "../../../generated/prisma/enums.js";
import { AppError } from "../../errors/AppError.js";
import { prisma } from "../../lib/prisma.js";
import {
  IGearItemActor,
  IGearItemCreate,
  IGearItemFilters,
  IGearItemUpdate,
} from "./gearItem.interface.js";

const normalizeGearImages = (payload: IGearItemCreate | IGearItemUpdate) => {
  if (payload.imageUrls !== undefined) {
    return {
      ...payload,
      imageUrls: payload.imageUrls,
      imageUrl: payload.imageUrls[0] ?? payload.imageUrl ?? null,
    };
  }

  if (payload.imageUrl !== undefined) {
    return {
      ...payload,
      imageUrls: payload.imageUrl ? [payload.imageUrl] : [],
    };
  }

  return payload;
};

const createGearItemService = async (
  payload: IGearItemCreate,
  actor: IGearItemActor,
) => {
  const { providerId: requestedProviderId, ...gearItemData } =
    normalizeGearImages(payload) as IGearItemCreate;
  let providerId: string;

  if (actor.role === Role.ADMIN) {
    if (!requestedProviderId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Provider ID is required when an admin creates a gear item",
      );
    }

    if (requestedProviderId === actor.id) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "An admin cannot create a gear item using their own ID as the provider",
      );
    }

    providerId = requestedProviderId;
  } else if (actor.role === Role.PROVIDER) {
    if (requestedProviderId && requestedProviderId !== actor.id) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Providers can only create gear items for themselves",
      );
    }

    providerId = actor.id;
  } else {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only providers and admins can create gear items",
    );
  }

  const provider = await prisma.user.findUnique({
    where: { id: providerId },
    select: { role: true, status: true },
  });

  if (!provider) {
    throw new AppError(httpStatus.NOT_FOUND, "Provider not found");
  }

  if (provider.role !== Role.PROVIDER) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "The supplied provider ID must belong to a provider account",
    );
  }

  if (provider.status !== UserStatus.ACTIVE) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Gear items cannot be created for an inactive or suspended provider",
    );
  }

  const category = await prisma.category.findUnique({
    where: { id: payload.categoryId },
    select: { id: true },
  });

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Category not found");
  }

  return prisma.gearItem.create({
    data: {
      ...gearItemData,
      providerId,
    },
    include: {
      category: true,
      provider: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

const getAllGearItemsService = async (filters: IGearItemFilters) => {
  const where: Prisma.GearItemWhereInput = {};
  const skip = (filters.page - 1) * filters.limit;
  const andFilters: Prisma.GearItemWhereInput[] = [];

  if (filters.providerId) {
    where.providerId = filters.providerId;
  }

  if (filters.category) {
    andFilters.push({ OR: [
      { categoryId: filters.category },
      {
        category: {
          name: { equals: filters.category, mode: "insensitive" },
        },
      },
    ] });
  }

  if (filters.search) {
    andFilters.push({
      OR: [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { brand: { contains: filters.search, mode: "insensitive" } },
        {
          category: {
            name: { contains: filters.search, mode: "insensitive" },
          },
        },
        {
          provider: {
            name: { contains: filters.search, mode: "insensitive" },
          },
        },
      ],
    });
  }

  if (filters.brand) {
    where.brand = { equals: filters.brand, mode: "insensitive" };
  }

  if (
    filters.price !== undefined ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined
  ) {
    where.pricePerDay = {
      ...(filters.price !== undefined && { equals: filters.price }),
      ...(filters.minPrice !== undefined && { gte: filters.minPrice }),
      ...(filters.maxPrice !== undefined && { lte: filters.maxPrice }),
    };
  }

  if (filters.isAvailable !== undefined) {
    where.isAvailable = filters.isAvailable;
  }

  if (filters.inStock !== undefined) {
    where.stock = filters.inStock ? { gt: 0 } : 0;
  }

  if (andFilters.length > 0) {
    where.AND = andFilters;
  }

  const include = {
    category: true,
    provider: {
      select: {
        id: true,
        name: true,
      },
    },
  } satisfies Prisma.GearItemInclude;

  if (filters.startDate && filters.endDate) {
    const startDate = new Date(`${filters.startDate}T00:00:00.000Z`);
    const endDate = new Date(`${filters.endDate}T00:00:00.000Z`);
    const candidates = await prisma.gearItem.findMany({
      where,
      include: {
        ...include,
        rentalOrders: {
          where: {
            status: {
              in: [
                RentalOrderStatus.CONFIRMED,
                RentalOrderStatus.PAID,
                RentalOrderStatus.PICKED_UP,
              ],
            },
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
          select: { quantity: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const availableItems = candidates
      .filter((item) => {
        const reserved = item.rentalOrders.reduce(
          (total, order) => total + order.quantity,
          0,
        );
        return item.isAvailable && item.stock - reserved > 0;
      })
      .map(({ rentalOrders: _rentalOrders, ...item }) => item);

    return {
      data: availableItems.slice(skip, skip + filters.limit),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total: availableItems.length,
      },
    };
  }

  const [gearItems, total] = await prisma.$transaction([
    prisma.gearItem.findMany({
      where,
      skip,
      take: filters.limit,
      include,
      orderBy: { createdAt: "desc" },
    }),
    prisma.gearItem.count({ where }),
  ]);

  return {
    data: gearItems,
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
    },
  };
};

const getGearPriceRangeService = async () => {
  const range = await prisma.gearItem.aggregate({
    _min: { pricePerDay: true },
    _max: { pricePerDay: true },
  });

  return {
    minPrice: range._min.pricePerDay,
    maxPrice: range._max.pricePerDay,
  };
};

const getGearItemByIdService = async (id: string) => {
  const gearItem = await prisma.gearItem.findUnique({
    where: { id },
    include: {
      category: true,
      provider: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      reviews: {
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!gearItem) {
    throw new AppError(httpStatus.NOT_FOUND, "Gear item not found");
  }

  return gearItem;
};

const ensureGearItemAccess = async (id: string, actor: IGearItemActor) => {
  const gearItem = await prisma.gearItem.findUnique({
    where: { id },
    select: { id: true, providerId: true },
  });

  if (!gearItem) {
    throw new AppError(httpStatus.NOT_FOUND, "Gear item not found");
  }

  if (actor.role === "PROVIDER" && gearItem.providerId !== actor.id) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only manage your own gear items",
    );
  }
};

const updateGearItemService = async (
  id: string,
  payload: IGearItemUpdate,
  actor: IGearItemActor,
) => {
  await ensureGearItemAccess(id, actor);

  if (payload.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: payload.categoryId },
      select: { id: true },
    });

    if (!category) {
      throw new AppError(httpStatus.NOT_FOUND, "Category not found");
    }
  }

  return prisma.gearItem.update({
    where: { id },
    data: normalizeGearImages(payload),
    include: {
      category: true,
      provider: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

const deleteGearItemService = async (id: string, actor: IGearItemActor) => {
  await ensureGearItemAccess(id, actor);

  return prisma.gearItem.delete({
    where: { id },
  });
};

export const gearItemService = {
  createGearItemService,
  getAllGearItemsService,
  getGearPriceRangeService,
  getGearItemByIdService,
  updateGearItemService,
  deleteGearItemService,
};
