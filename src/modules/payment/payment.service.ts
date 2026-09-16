import httpStatus from "http-status";
import type Stripe from "stripe";
import { Prisma } from "../../../generated/prisma/client.js";
import {
  PaymentStatus,
  RentalOrderStatus,
} from "../../../generated/prisma/enums.js";
import config from "../../config/index.js";
import { AppError } from "../../errors/AppError.js";
import { prisma } from "../../lib/prisma.js";
import { stripe } from "../../lib/stripe.js";
import type {
  ICheckoutCustomer,
  IPaymentActor,
  IPaymentFilters,
} from "./payment.interface.js";

const PAYMENT_INCLUDE = {
  rentalOrder: {
    include: {
      gearItem: {
        include: {
          category: true,
          provider: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      customer: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
  },
} satisfies Prisma.PaymentInclude;

const getPaymentAccessWhere = (
  actor: IPaymentActor,
): Prisma.PaymentWhereInput => {
  switch (actor.role) {
    case "CUSTOMER":
      return { rentalOrder: { customerId: actor.id } };
    case "PROVIDER":
      return {
        rentalOrder: { gearItem: { providerId: actor.id } },
      };
    case "ADMIN":
      return {};
  }
};

const cancelOrderAfterCheckoutFailure = async (
  orderId: string,
  paymentId: string,
) => {
  await prisma.$transaction(async (tx) => {
    const failedPayment = await tx.payment.updateMany({
      where: {
        id: paymentId,
        rentalOrderId: orderId,
        status: PaymentStatus.PENDING,
      },
      data: { status: PaymentStatus.FAILED },
    });

    if (failedPayment.count > 0) {
      await tx.rentalOrder.updateMany({
        where: {
          id: orderId,
          status: RentalOrderStatus.CONFIRMED,
        },
        data: { status: RentalOrderStatus.CANCELLED },
      });
    }
  });
};

const createCheckoutSessionService = async (
  orderId: string,
  customer: ICheckoutCustomer,
) => {
  const order = await prisma.rentalOrder.findFirst({
    where: { id: orderId, customerId: customer.id },
    select: {
      id: true,
      status: true,
      totalPrice: true,
      quantity: true,
      startDate: true,
      endDate: true,
      gearItem: { select: { name: true } },
      payment: {
        select: {
          id: true,
          status: true,
          stripeSessionId: true,
        },
      },
    },
  });

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Order not found");
  }

  if (order.status !== RentalOrderStatus.CONFIRMED) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Checkout is only available for confirmed orders",
    );
  }

  if (!order.payment) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Payment record could not be found",
    );
  }

  if (order.payment.status !== PaymentStatus.PENDING) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Payment is already ${order.payment.status.toLowerCase()}`,
    );
  }

  if (order.payment.stripeSessionId) {
    let existingSession: Stripe.Checkout.Session;

    try {
      existingSession = await stripe.checkout.sessions.retrieve(
        order.payment.stripeSessionId,
      );
    } catch (_error) {
      throw new AppError(
        httpStatus.BAD_GATEWAY,
        "Unable to retrieve the existing Stripe Checkout Session",
      );
    }

    if (existingSession.status === "open" && existingSession.url) {
      return {
        orderId: order.id,
        paymentId: order.payment.id,
        paymentStatus: order.payment.status,
        stripeSessionId: existingSession.id,
        checkoutUrl: existingSession.url,
        reused: true,
      };
    }

    if (existingSession.status === "expired") {
      await cancelOrderAfterCheckoutFailure(order.id, order.payment.id);
      throw new AppError(
        httpStatus.CONFLICT,
        "The Checkout Session expired and the order has been cancelled",
      );
    }

    throw new AppError(
      httpStatus.CONFLICT,
      "The Checkout Session is complete and its payment is being processed",
    );
  }

  const stripeAmount = Number(order.totalPrice.mul(100).toFixed(0));
  let checkoutSession: Stripe.Checkout.Session;

  try {
    checkoutSession = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer_email: customer.email,
        line_items: [
          {
            price_data: {
              currency: config.stripe_currency.toLowerCase(),
              product_data: {
                name: order.gearItem.name,
                description: `${order.startDate.toISOString().slice(0, 10)} to ${order.endDate.toISOString().slice(0, 10)}, quantity ${order.quantity}`,
              },
              unit_amount: stripeAmount,
            },
            quantity: 1,
          },
        ],
        metadata: {
          orderId: order.id,
          paymentId: order.payment.id,
        },
        payment_intent_data: {
          metadata: {
            orderId: order.id,
            paymentId: order.payment.id,
          },
        },
        success_url: `${config.app_url}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.app_url}/payment/cancel?order_id=${order.id}`,
      },
      { idempotencyKey: order.payment.id },
    );
  } catch (_error) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "Unable to create Stripe Checkout Session. Please try again.",
    );
  }

  if (!checkoutSession.url) {
    if (checkoutSession.status === "open") {
      await stripe.checkout.sessions.expire(checkoutSession.id).catch(() => {});
    }
    await cancelOrderAfterCheckoutFailure(order.id, order.payment.id);
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "Stripe Checkout Session did not include a checkout URL",
    );
  }

  try {
    const updatedPayment = await prisma.payment.updateMany({
      where: {
        id: order.payment.id,
        rentalOrderId: order.id,
        status: PaymentStatus.PENDING,
        stripeSessionId: null,
      },
      data: { stripeSessionId: checkoutSession.id },
    });

    if (updatedPayment.count === 0) {
      const currentPayment = await prisma.payment.findUnique({
        where: { id: order.payment.id },
        select: { stripeSessionId: true },
      });

      if (currentPayment?.stripeSessionId !== checkoutSession.id) {
        throw new Error("Payment changed while creating Checkout Session");
      }
    }
  } catch (_error) {
    if (checkoutSession.status === "open") {
      await stripe.checkout.sessions.expire(checkoutSession.id).catch(() => {});
    }
    await cancelOrderAfterCheckoutFailure(order.id, order.payment.id);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Unable to save the Stripe Checkout Session",
    );
  }

  return {
    orderId: order.id,
    paymentId: order.payment.id,
    paymentStatus: order.payment.status,
    stripeSessionId: checkoutSession.id,
    checkoutUrl: checkoutSession.url,
    reused: false,
  };
};

const getAllPaymentsService = async (
  filters: IPaymentFilters,
  actor: IPaymentActor,
) => {
  const andFilters: Prisma.PaymentWhereInput[] = [getPaymentAccessWhere(actor)];

  if (filters.status) andFilters.push({ status: filters.status });
  if (filters.orderStatus) {
    andFilters.push({ rentalOrder: { is: { status: filters.orderStatus } } });
  }
  if (filters.search) {
    const searchFilters: Prisma.PaymentWhereInput[] = [
      {
        stripeSessionId: { contains: filters.search, mode: "insensitive" },
      },
      {
        stripePaymentIntentId: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
      {
        rentalOrder: {
          is: {
            gearItem: {
              name: { contains: filters.search, mode: "insensitive" },
            },
          },
        },
      },
      {
        rentalOrder: {
          is: {
            customer: {
              name: { contains: filters.search, mode: "insensitive" },
            },
          },
        },
      },
      {
        rentalOrder: {
          is: {
            customer: {
              email: { contains: filters.search, mode: "insensitive" },
            },
          },
        },
      },
      {
        rentalOrder: {
          is: {
            gearItem: {
              provider: {
                name: { contains: filters.search, mode: "insensitive" },
              },
            },
          },
        },
      },
    ];

    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        filters.search,
      )
    ) {
      searchFilters.push(
        { id: filters.search },
        { rentalOrderId: filters.search },
      );
    }
    andFilters.push({ OR: searchFilters });
  }

  const where: Prisma.PaymentWhereInput = { AND: andFilters };
  const skip = (filters.page - 1) * filters.limit;

  const [payments, total] = await prisma.$transaction([
    prisma.payment.findMany({
      where,
      skip,
      take: filters.limit,
      include: PAYMENT_INCLUDE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    data: payments,
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
    },
  };
};

const getPaymentByIdService = async (id: string, actor: IPaymentActor) => {
  const payment = await prisma.payment.findFirst({
    where: { id, ...getPaymentAccessWhere(actor) },
    include: PAYMENT_INCLUDE,
  });

  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
  }

  return payment;
};

export const paymentService = {
  createCheckoutSessionService,
  getAllPaymentsService,
  getPaymentByIdService,
};
