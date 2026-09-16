import { Prisma } from "../../../generated/prisma/client.js";
import { RentalOrderStatus } from "../../../generated/prisma/enums.js";

export const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export const STOCK_RESERVING_STATUSES = [
  RentalOrderStatus.CONFIRMED,
  RentalOrderStatus.PAID,
  RentalOrderStatus.PICKED_UP,
];

export const ORDER_INCLUDE = {
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
  payment: true,
} satisfies Prisma.RentalOrderInclude;

export const ORDER_STATUS_TRANSITIONS: Record<
  RentalOrderStatus,
  RentalOrderStatus[]
> = {
  [RentalOrderStatus.PLACED]: [
    RentalOrderStatus.CONFIRMED,
    RentalOrderStatus.CANCELLED,
  ],
  [RentalOrderStatus.CONFIRMED]: [RentalOrderStatus.CANCELLED],
  [RentalOrderStatus.PAID]: [RentalOrderStatus.PICKED_UP],
  [RentalOrderStatus.PICKED_UP]: [RentalOrderStatus.RETURNED],
  [RentalOrderStatus.RETURNED]: [],
  [RentalOrderStatus.CANCELLED]: [],
};
