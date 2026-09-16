import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import { JwtPayload, SignOptions } from "jsonwebtoken";
import { Prisma } from "../../../generated/prisma/client.js";
import config from "../../config/index.js";
import { AppError } from "../../errors/AppError.js";
import { prisma } from "../../lib/prisma.js";
import { jwtUtils } from "../../utils/jwt.js";
import {
  ILoginUser,
  IRegisterUser,
  IUpdateAuthUserPayload,
} from "./auth.interface.js";

const loginUserService = async (payload: ILoginUser) => {
  const { email, password } = payload;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Invalid Credentials. Please try again.",
    );
  }

  if (user.status === "SUSPENDED") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Your account has been suspended. Please contact support.",
    );
  }
  if (user.status === "INACTIVE") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Your account is inactive. Please contact support.",
    );
  }

  const isPasswordMatched = await bcrypt.compare(password, user.password);

  if (!isPasswordMatched) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Invalid Credentials. Please try again.",
    );
  }

  const jwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};

const registerUserService = async (payload: IRegisterUser) => {
  const { email, password, name, phone, role } = payload;

  if (role === "ADMIN") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized to register as an admin",
    );
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { phone }],
    },
  });

  if (user?.email === email) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User already exists with this email",
    );
  }

  if (user?.phone === phone) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User already exists with this phone number",
    );
  }

  const hashedPassword = await bcrypt.hash(
    password,
    Number(config.bcrypt_salt_rounds),
  );

  const newUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      phone,
      role,
    },
  });

  const jwtPayload = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};

const getAuthUserService = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    omit: {
      password: true,
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  return user;
};

/**
 * Self-service profile edit. Deliberately limited to `name` and `phone`: email
 * is the login identity and role/status are administrative, so those stay with
 * the admin endpoints. Phone is unique, so a number held by another account is
 * reported as a conflict rather than surfacing a raw Prisma error.
 */
const updateAuthUserService = async (
  userId: string,
  payload: IUpdateAuthUserPayload,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, phone: true },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (payload.phone && payload.phone !== user.phone) {
    const existingUser = await prisma.user.findFirst({
      where: { id: { not: user.id }, phone: payload.phone },
      select: { id: true },
    });

    if (existingUser) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Another user already exists with this phone number",
      );
    }
  }

  try {
    return await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(payload.name !== undefined && { name: payload.name }),
        ...(payload.phone !== undefined && { phone: payload.phone }),
      },
      omit: { password: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Another user already exists with this phone number",
      );
    }

    throw error;
  }
};

const refreshAccessTokenService = async (refreshToken: string) => {
  const verifiedToken = jwtUtils.verifyToken(
    refreshToken,
    config.jwt_refresh_secret,
  );

  if (!verifiedToken.success) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Invalid or expired refresh token. Please log in again.",
    );
  }

  const payload = verifiedToken.data as JwtPayload;

  if (typeof payload.id !== "string") {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid refresh token");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  });

  if (!user) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "User no longer exists. Please log in again.",
    );
  }

  if (user.status === "SUSPENDED") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Your account has been suspended. Please contact support.",
    );
  }

  if (user.status === "INACTIVE") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Your account is inactive. Please contact support.",
    );
  }

  const accessToken = jwtUtils.createToken(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  return { accessToken };
};

export const authService = {
  loginUserService,
  registerUserService,
  getAuthUserService,
  updateAuthUserService,
  refreshAccessTokenService,
};
