import httpStatus from "http-status";
import type Stripe from "stripe";
import { Prisma } from "../../../generated/prisma/client.js";
import {
  PaymentStatus,
  RentalOrderStatus,
} from "../../../generated/prisma/enums.js";
import { AppError } from "../../errors/AppError.js";
import { prisma } from "../../lib/prisma.js";
import { stripe } from "../../lib/stripe.js";
import {
  MILLISECONDS_PER_DAY,
  ORDER_INCLUDE,
  ORDER_STATUS_TRANSITIONS,
  STOCK_RESERVING_STATUSES,
} from "./order.constants.js";
import type {
  ICreateOrderPayload,
  IOrderActor,
  IOrderFilters,
  IUpdateOrderStatusPayload,
} from "./order.interface.js";

const getOrderAccessWhere = (
  actor: IOrderActor,
): Prisma.RentalOrderWhereInput => {
  switch (actor.role) {
    case "CUSTOMER":
      return { customerId: actor.id };
    case "PROVIDER":
      return { gearItem: { providerId: actor.id } };
    case "ADMIN":
      return {};
  }
};

const toUtcDate = (date: string) => new Date(`${date}T00:00:00.000Z`);

const expireCheckoutBeforeCancellation = async (sessionId: string) => {
  let session: Stripe.Checkout.Session;

  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (_error) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "Unable to verify the Stripe Checkout Session",
    );
  }

  if (session.payment_status === "paid") {
    throw new AppError(httpStatus.CONFLICT, "A paid order cannot be cancelled");
  }

  if (session.status === "complete") {
    throw new AppError(
      httpStatus.CONFLICT,
      "This order cannot be cancelled while its payment is processing",
    );
  }

  if (session.status === "open") {
    try {
      await stripe.checkout.sessions.expire(sessionId);
    } catch (_error) {
      const latestSession = await stripe.checkout.sessions
        .retrieve(sessionId)
        .catch(() => null);

      if (latestSession?.payment_status === "paid") {
        throw new AppError(
          httpStatus.CONFLICT,
          "A paid order cannot be cancelled",
        );
      }

      if (latestSession?.status === "complete") {
        throw new AppError(
          httpStatus.CONFLICT,
          "This order cannot be cancelled while its payment is processing",
        );
      }

      if (latestSession?.status !== "expired") {
        throw new AppError(
          httpStatus.BAD_GATEWAY,
          "Unable to cancel the Stripe Checkout Session",
        );
      }
    }
  }
};

const getAllOrdersService = async (
  filters: IOrderFilters,
  actor: IOrderActor,
) => {
  const searchFilters: Prisma.RentalOrderWhereInput[] = filters.search
    ? [
        {
          gearItem: {
            name: { contains: filters.search, mode: "insensitive" },
          },
        },
        {
          gearItem: {
            brand: { contains: filters.search, mode: "insensitive" },
          },
        },
        {
          customer: {
            name: { contains: filters.search, mode: "insensitive" },
          },
        },
        {
          customer: {
            email: { contains: filters.search, mode: "insensitive" },
          },
        },
        {
          gearItem: {
            provider: {
              name: { contains: filters.search, mode: "insensitive" },
            },
          },
        },
        {
          gearItem: {
            provider: {
              email: { contains: filters.search, mode: "insensitive" },
            },
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
      { gearItemId: filters.search },
      { customerId: filters.search },
    );
  }

  const where: Prisma.RentalOrderWhereInput = {
    ...getOrderAccessWhere(actor),
    ...(filters.status && { status: filters.status }),
    ...(filters.paymentStatus && {
      payment: { is: { status: filters.paymentStatus } },
    }),
    ...(searchFilters.length > 0 && { OR: searchFilters }),
  };
  const skip = (filters.page - 1) * filters.limit;

  const [orders, total] = await prisma.$transaction([
    prisma.rentalOrder.findMany({
      where,
      skip,
      take: filters.limit,
      include: ORDER_INCLUDE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.rentalOrder.count({ where }),
  ]);

  return {
    data: orders,
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
    },
  };
};

const getOrderByIdService = async (id: string, actor: IOrderActor) => {
  const order = await prisma.rentalOrder.findFirst({
    where: { id, ...getOrderAccessWhere(actor) },
    include: ORDER_INCLUDE,
  });

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Order not found");
  }

  return order;
};

const updateOrderStatusService = async (
  id: string,
  payload: IUpdateOrderStatusPayload,
  actor: IOrderActor,
) => {
  const order = await prisma.rentalOrder.findFirst({
    where: { id, ...getOrderAccessWhere(actor) },
    select: {
      id: true,
      status: true,
      gearItemId: true,
      startDate: true,
      endDate: true,
      quantity: true,
      payment: { select: { stripeSessionId: true } },
    },
  });

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Order not found");
  }

  if (
    actor.role === "CUSTOMER" &&
    payload.status !== RentalOrderStatus.CANCELLED
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Customers can only cancel their own unpaid orders",
    );
  }

  if (!ORDER_STATUS_TRANSITIONS[order.status].includes(payload.status)) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Order status cannot change from ${order.status} to ${payload.status}`,
    );
  }

  if (
    payload.status === RentalOrderStatus.CANCELLED &&
    order.payment?.stripeSessionId
  ) {
    await expireCheckoutBeforeCancellation(order.payment.stripeSessionId);
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        if (payload.status === RentalOrderStatus.CONFIRMED) {
          const gearItem = await tx.gearItem.findUnique({
            where: { id: order.gearItemId },
            select: { stock: true, isAvailable: true },
          });

          if (!gearItem) {
            throw new AppError(httpStatus.NOT_FOUND, "Gear item not found");
          }

          if (!gearItem.isAvailable || gearItem.stock === 0) {
            throw new AppError(
              httpStatus.CONFLICT,
              "Gear item is not available for rent",
            );
          }

          const overlappingOrders = await tx.rentalOrder.aggregate({
            where: {
              id: { not: order.id },
              gearItemId: order.gearItemId,
              status: { in: STOCK_RESERVING_STATUSES },
              startDate: { lte: order.endDate },
              endDate: { gte: order.startDate },
            },
            _sum: { quantity: true },
          });

          const reservedQuantity = overlappingOrders._sum.quantity ?? 0;
          const availableQuantity = gearItem.stock - reservedQuantity;

          if (order.quantity > availableQuantity) {
            throw new AppError(
              httpStatus.CONFLICT,
              `Only ${Math.max(availableQuantity, 0)} item(s) are available for the selected dates`,
            );
          }
        }

        const updatedOrder = await tx.rentalOrder.updateMany({
          where: {
            id: order.id,
            status: order.status,
          },
          data: { status: payload.status },
        });

        if (updatedOrder.count === 0) {
          throw new AppError(
            httpStatus.CONFLICT,
            "Order status changed while this request was being processed",
          );
        }

        if (payload.status === RentalOrderStatus.CANCELLED) {
          await tx.payment.updateMany({
            where: {
              rentalOrderId: order.id,
              status: PaymentStatus.PENDING,
            },
            data: { status: PaymentStatus.FAILED },
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Gear availability changed while confirming the order. Please try again.",
      );
    }

    throw error;
  }

  return getOrderByIdService(id, actor);
};

const createOrderRecord = async (
  payload: ICreateOrderPayload,
  customerId: string,
) => {
  const startDate = toUtcDate(payload.startDate);
  const endDate = toUtcDate(payload.endDate);
  const rentalDays =
    Math.floor(
      (endDate.getTime() - startDate.getTime()) / MILLISECONDS_PER_DAY,
    ) + 1;

  try {
    return await prisma.$transaction(
      async (tx) => {
        const gearItem = await tx.gearItem.findUnique({
          where: { id: payload.gearItemId },
          select: {
            id: true,
            name: true,
            stock: true,
            isAvailable: true,
            pricePerDay: true,
          },
        });

        if (!gearItem) {
          throw new AppError(httpStatus.NOT_FOUND, "Gear item not found");
        }

        if (!gearItem.isAvailable || gearItem.stock === 0) {
          throw new AppError(
            httpStatus.CONFLICT,
            "Gear item is not available for rent",
          );
        }

        const overlappingOrders = await tx.rentalOrder.aggregate({
          where: {
            gearItemId: gearItem.id,
            status: { in: STOCK_RESERVING_STATUSES },
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
          _sum: { quantity: true },
        });

        const reservedQuantity = overlappingOrders._sum.quantity ?? 0;
        const availableQuantity = gearItem.stock - reservedQuantity;

        if (payload.quantity > availableQuantity) {
          throw new AppError(
            httpStatus.CONFLICT,
            `Only ${Math.max(availableQuantity, 0)} item(s) are available for the selected dates`,
          );
        }

        const totalPrice = gearItem.pricePerDay
          .mul(rentalDays)
          .mul(payload.quantity);

        const order = await tx.rentalOrder.create({
          data: {
            gearItemId: gearItem.id,
            customerId,
            startDate,
            endDate,
            quantity: payload.quantity,
            totalPrice,
            payment: {
              create: {
                amount: totalPrice,
              },
            },
          },
          include: { payment: true },
        });

        return { order, rentalDays };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new AppError(
        httpStatus.CONFLICT,
        "The selected gear availability changed. Please try again.",
      );
    }

    throw error;
  }
};

const createOrderService = async (
  payload: ICreateOrderPayload,
  customerId: string,
) => {
  const { order, rentalDays } = await createOrderRecord(payload, customerId);

  if (!order.payment) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Payment record could not be created",
    );
  }

  return {
    orderId: order.id,
    status: order.status,
    startDate: order.startDate,
    endDate: order.endDate,
    rentalDays,
    quantity: order.quantity,
    totalPrice: order.totalPrice,
    paymentStatus: order.payment.status,
  };
};

export const orderService = {
  createOrderService,
  getAllOrdersService,
  getOrderByIdService,
  updateOrderStatusService,
};
