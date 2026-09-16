import { Role } from "../../../generated/prisma/enums.js";

export interface IGearItemCreate {
  categoryId: string;
  providerId?: string;
  name: string;
  description: string;
  stock?: number;
  isAvailable?: boolean;
  pricePerDay: number;
  imageUrl?: string | null;
  imageUrls?: string[];
  brand?: string | null;
}

export interface IGearItemFilters {
  providerId?: string;
  search?: string;
  category?: string;
  brand?: string;
  price?: number;
  minPrice?: number;
  maxPrice?: number;
  isAvailable?: boolean;
  inStock?: boolean;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
}

export type IGearItemUpdate = Partial<
  Omit<IGearItemCreate, "providerId">
>;

export interface IGearItemActor {
  id: string;
  role: Role;
}
