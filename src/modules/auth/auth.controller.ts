import { CookieOptions, NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../errors/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { authService } from "./auth.service.js";

const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
};

const loginUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const payload = req.body;

    const { accessToken, refreshToken } =
      await authService.loginUserService(payload);

    res.cookie("accessToken", accessToken, {
      ...authCookieOptions,
      maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
    });

    res.cookie("refreshToken", refreshToken, {
      ...authCookieOptions,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 day
    });

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "User logged in successfully",
      data: { accessToken, refreshToken },
    });
  },
);
const registerUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const payload = req.body;

    const { accessToken, refreshToken } =
      await authService.registerUserService(payload);

    res.cookie("accessToken", accessToken, {
      ...authCookieOptions,
      maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
    });

    res.cookie("refreshToken", refreshToken, {
      ...authCookieOptions,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 day
    });

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "User registered successfully",
      data: { accessToken, refreshToken },
    });
  },
);
const getAuthUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;

    if (!userId) {
      return next(new AppError(httpStatus.UNAUTHORIZED, "Unauthorized"));
    }

    const user = await authService.getAuthUserService(userId);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Authenticated user retrieved successfully",
      data: user,
    });
  },
);

const updateAuthUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;

    if (!userId) {
      return next(new AppError(httpStatus.UNAUTHORIZED, "Unauthorized"));
    }

    const user = await authService.updateAuthUserService(userId, req.body);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Profile updated successfully",
      data: user,
    });
  },
);

const logoutUser = catchAsync(async (_req: Request, res: Response) => {
  res.clearCookie("accessToken", authCookieOptions);
  res.clearCookie("refreshToken", authCookieOptions);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "User logged out successfully",
    data: null,
  });
});

const refreshAccessToken = catchAsync(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

  if (typeof refreshToken !== "string") {
    throw new AppError(httpStatus.UNAUTHORIZED, "Refresh token is required");
  }

  const result = await authService.refreshAccessTokenService(refreshToken);

  res.cookie("accessToken", result.accessToken, {
    ...authCookieOptions,
    maxAge: 1000 * 60 * 60 * 24,
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Access token refreshed successfully",
    data: result,
  });
});

export const authController = {
  loginUser,
  registerUser,
  getAuthUser,
  updateAuthUser,
  logoutUser,
  refreshAccessToken,
};
