import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { JwtPayload } from "jsonwebtoken";
import { Role } from "../../generated/prisma/enums.js";
import config from "../config/index.js";
import { AppError } from "../errors/AppError.js";
import { prisma } from "../lib/prisma.js";
import { catchAsync } from "../utils/catchAsync.js";
import { jwtUtils } from "../utils/jwt.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        role: Role;
      };
    }
  }
}

export const auth = (...requiredRoles: Role[]) =>
  catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const authorization = req.headers.authorization;
    const bearerToken = authorization?.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : authorization;
    const token = req.cookies?.accessToken || bearerToken;

    if (!token) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "You are not logged in. Please log in to access this resource.",
      );
    }

    const verifiedToken = jwtUtils.verifyToken(token, config.jwt_access_secret);

    if (!verifiedToken.success) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "Invalid or expired access token. Please log in again.",
      );
    }

    const payload = verifiedToken.data as JwtPayload;
    const userId = payload.id;

    if (typeof userId !== "string") {
      throw new AppError(httpStatus.UNAUTHORIZED, "Invalid access token.");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    if (requiredRoles.length && !requiredRoles.includes(user.role)) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You do not have permission to access this resource.",
      );
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  });
