import {
  PaymentStatus,
  RentalOrderStatus,
  Role,
} from "../../../generated/prisma/enums.js";

export interface ICreateOrderPayload {
  gearItemId: string;
  startDate: string;
  endDate: string;
  quantity: number;
}

export interface IOrderActor {
  id: string;
  role: Role;
}

export interface IOrderFilters {
  search?: string;
  status?: RentalOrderStatus;
  paymentStatus?: PaymentStatus;
  page: number;
  limit: number;
}

export interface IUpdateOrderStatusPayload {
  status:
    | typeof RentalOrderStatus.CONFIRMED
    | typeof RentalOrderStatus.PICKED_UP
    | typeof RentalOrderStatus.RETURNED
    | typeof RentalOrderStatus.CANCELLED;
}
