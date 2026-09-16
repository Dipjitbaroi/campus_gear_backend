import { Role } from "../../../generated/prisma/enums.js";

export interface ICreateReviewPayload {
  orderId: string;
  rating: number;
  comment?: string;
}

export interface IUpdateReviewPayload {
  rating?: number;
  comment?: string | null;
}

export interface IReviewFilters {
  search?: string;
  gearItemId?: string;
  rating?: number;
  page: number;
  limit: number;
}

export interface IReviewActor {
  id: string;
  role: Role;
}
