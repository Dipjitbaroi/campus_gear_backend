import { Role } from "../../../generated/prisma/enums.js";

export interface ILoginUser {
  email: string;
  password: string;
}
export interface IRegisterUser {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: Role;
}

export interface IUpdateAuthUserPayload {
  name?: string;
  phone?: string;
}
