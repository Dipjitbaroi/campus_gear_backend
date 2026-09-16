import httpStatus from "http-status";
import type Stripe from "stripe";
import {
  PaymentStatus,
  RentalOrderStatus,
} from "../../../generated/prisma/enums.js";
import config from "../../config/index.js";
import { AppError } from "../../errors/AppError.js";
import { prisma } from "../../lib/prisma.js";
import { stripe } from "../../lib/stripe.js";

const getCheckoutMetadata = (session: Stripe.Checkout.Session) => {
  const orderId = session.metadata?.orderId;
  const paymentId = session.metadata?.paymentId;

  if (!orderId || !paymentId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Stripe Checkout Session is missing order metadata",
    );
  }

  return { orderId, paymentId };
};

const getPaymentIntentId = (session: Stripe.Checkout.Session) => {
  if (typeof session.payment_intent === "string") {
    return session.payment_intent;
  }

  return session.payment_intent?.id;
};

const completeCheckoutPayment = async (session: Stripe.Checkout.Session) => {
  if (session.payment_status !== "paid") {
    return;
  }

  const { orderId, paymentId } = getCheckoutMetadata(session);
  const paymentIntentId = getPaymentIntentId(session);

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: {
        id: paymentId,
        rentalOrderId: orderId,
        stripeSessionId: session.id,
      },
      select: { status: true },
    });

    if (!payment) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Stripe Checkout Session does not match a payment",
      );
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      return;
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new AppError(httpStatus.CONFLICT, "Payment is no longer pending");
    }

    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.COMPLETED,
        stripePaymentIntentId: paymentIntentId,
      },
    });

    const updatedOrder = await tx.rentalOrder.updateMany({
      where: {
        id: orderId,
        status: RentalOrderStatus.CONFIRMED,
      },
      data: { status: RentalOrderStatus.PAID },
    });

    if (updatedOrder.count === 0) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Order cannot be marked as paid in its current state",
      );
    }
  });
};

const failCheckoutPayment = async (session: Stripe.Checkout.Session) => {
  const { orderId, paymentId } = getCheckoutMetadata(session);

  await prisma.$transaction(async (tx) => {
    const failedPayment = await tx.payment.updateMany({
      where: {
        id: paymentId,
        rentalOrderId: orderId,
        stripeSessionId: session.id,
        status: PaymentStatus.PENDING,
      },
      data: { status: PaymentStatus.FAILED },
    });

    if (failedPayment.count > 0) {
      await tx.rentalOrder.updateMany({
        where: {
          id: orderId,
          status: {
            in: [RentalOrderStatus.PLACED, RentalOrderStatus.CONFIRMED],
          },
        },
        data: { status: RentalOrderStatus.CANCELLED },
      });
    }
  });
};

const handleWebhook = async (payload: Buffer, signature: string) => {
  const endpointSecret = config.stripe_webhook_secret;

  if (!endpointSecret) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Stripe webhook secret is not configured",
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
  } catch (_error) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Invalid Stripe webhook signature",
    );
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await completeCheckoutPayment(event.data.object);
      break;
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired":
      await failCheckoutPayment(event.data.object);
      break;
    default:
      break;
  }
};

export const orderWebhookService = {
  handleWebhook,
};
