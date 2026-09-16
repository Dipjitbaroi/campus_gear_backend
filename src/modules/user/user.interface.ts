import {
  Role,
  UserStatus,
} from "../../../generated/prisma/enums.js";

export interface IUserFilters {
  search?: string;
  role?: Role;
  status?: UserStatus;
  page: number;
  limit: number;
}

export interface ICreateAdminPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface IUpdateUserStatusPayload {
  status: UserStatus;
}

export interface IUpdateUserPayload {
  name?: string;
  email?: string;
  phone?: string;
  role?: Role;
}
