import {
  PaymentStatus,
  RentalOrderStatus,
  Role,
} from "../../../generated/prisma/enums.js";

export interface IPaymentActor {
  id: string;
  role: Role;
}

export interface ICheckoutCustomer {
  id: string;
  email: string;
}

export interface IPaymentFilters {
  search?: string;
  status?: PaymentStatus;
  orderStatus?: RentalOrderStatus;
  page: number;
  limit: number;
}
