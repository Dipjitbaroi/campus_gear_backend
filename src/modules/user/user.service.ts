import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import { Prisma } from "../../../generated/prisma/client.js";
import {
  RentalOrderStatus,
  Role,
  UserStatus,
} from "../../../generated/prisma/enums.js";
import config from "../../config/index.js";
import { AppError } from "../../errors/AppError.js";
import { prisma } from "../../lib/prisma.js";
import type {
  ICreateAdminPayload,
  IUpdateUserPayload,
  IUpdateUserStatusPayload,
  IUserFilters,
} from "./user.interface.js";

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      gearItems: true,
      rentalOrders: true,
      reviews: true,
    },
  },
} satisfies Prisma.UserSelect;

const getAllUsersService = async (filters: IUserFilters) => {
  const where: Prisma.UserWhereInput = {
    ...(filters.role && { role: filters.role }),
    ...(filters.status && { status: filters.status }),
    ...(filters.search && {
      OR: [
        { name: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search, mode: "insensitive" } },
      ],
    }),
  };
  const skip = (filters.page - 1) * filters.limit;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take: filters.limit,
      select: USER_SELECT,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users,
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
    },
  };
};

const getUserByIdService = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: USER_SELECT,
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  return user;
};

const createAdminService = async (payload: ICreateAdminPayload) => {
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: payload.email }, { phone: payload.phone }],
    },
    select: { email: true, phone: true },
  });

  if (existingUser?.email === payload.email) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User already exists with this email",
    );
  }

  if (existingUser?.phone === payload.phone) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User already exists with this phone number",
    );
  }

  const password = await bcrypt.hash(
    payload.password,
    Number(config.bcrypt_salt_rounds),
  );

  try {
    return await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        password,
        role: Role.ADMIN,
      },
      select: USER_SELECT,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        httpStatus.CONFLICT,
        "A user already exists with this email or phone number",
      );
    }

    throw error;
  }
};

const updateUserStatusService = async (
  id: string,
  payload: IUpdateUserStatusPayload,
  actorId: string,
) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.id === actorId && payload.status !== UserStatus.ACTIVE) {
    throw new AppError(
      httpStatus.CONFLICT,
      "An admin cannot deactivate or suspend their own account",
    );
  }

  if (user.status === payload.status) {
    return getUserByIdService(user.id);
  }

  return prisma.user.update({
    where: { id: user.id },
    data: { status: payload.status },
    select: USER_SELECT,
  });
};

/**
 * Blocks role changes that would strand records the account can no longer
 * reach. A demoted provider's gear becomes unmanageable because gear mutations
 * require the PROVIDER or ADMIN role, and a former customer cannot pay for or
 * cancel an in-flight rental because checkout and customer transitions are
 * CUSTOMER-only. Both cases point the admin at the work to do first.
 */
const assertRoleChangeIsSafe = async (userId: string, currentRole: Role) => {
  if (currentRole === Role.PROVIDER) {
    const gearItems = await prisma.gearItem.count({
      where: { providerId: userId },
    });

    if (gearItems > 0) {
      throw new AppError(
        httpStatus.CONFLICT,
        `This provider still owns ${gearItems} gear ${
          gearItems === 1 ? "listing" : "listings"
        }. Reassign or delete them before changing the role.`,
      );
    }
  }

  if (currentRole === Role.CUSTOMER) {
    const openOrders = await prisma.rentalOrder.count({
      where: {
        customerId: userId,
        status: {
          notIn: [RentalOrderStatus.RETURNED, RentalOrderStatus.CANCELLED],
        },
      },
    });

    if (openOrders > 0) {
      throw new AppError(
        httpStatus.CONFLICT,
        `This customer has ${openOrders} rental ${
          openOrders === 1 ? "order" : "orders"
        } still in progress. Complete or cancel them before changing the role.`,
      );
    }
  }
};

/**
 * Admin edit of a user's identity fields and role. Email and phone are unique,
 * so a collision with another account is reported as a conflict on the
 * offending field; re-submitting the account's own current values is not a
 * conflict.
 */
const updateUserService = async (
  id: string,
  payload: IUpdateUserPayload,
  actorId: string,
) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, phone: true, role: true },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (payload.role && payload.role !== user.role) {
    // Mirrors the self-suspension guard: an admin must not be able to remove
    // their own access, which would leave the change irreversible for them.
    if (user.id === actorId) {
      throw new AppError(
        httpStatus.CONFLICT,
        "An admin cannot change their own role",
      );
    }

    await assertRoleChangeIsSafe(user.id, user.role);
  }

  const conflictChecks: Prisma.UserWhereInput[] = [];
  if (payload.email && payload.email !== user.email) {
    conflictChecks.push({ email: payload.email });
  }
  if (payload.phone && payload.phone !== user.phone) {
    conflictChecks.push({ phone: payload.phone });
  }

  if (conflictChecks.length > 0) {
    const existingUser = await prisma.user.findFirst({
      where: {
        id: { not: user.id },
        OR: conflictChecks,
      },
      select: { email: true, phone: true },
    });

    if (payload.email && existingUser?.email === payload.email) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Another user already exists with this email",
      );
    }

    if (payload.phone && existingUser?.phone === payload.phone) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Another user already exists with this phone number",
      );
    }
  }

  try {
    return await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(payload.name !== undefined && { name: payload.name }),
        ...(payload.email !== undefined && { email: payload.email }),
        ...(payload.phone !== undefined && { phone: payload.phone }),
        ...(payload.role !== undefined && { role: payload.role }),
      },
      select: USER_SELECT,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Another user already exists with this email or phone number",
      );
    }

    throw error;
  }
};

export const userService = {
  getAllUsersService,
  getUserByIdService,
  createAdminService,
  updateUserStatusService,
  updateUserService,
};
