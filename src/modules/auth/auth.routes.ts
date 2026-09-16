import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { authController } from "./auth.controller.js";
import { authValidation } from "./auth.validation.js";

const router = Router();

router.post(
  "/login",
  validateRequest(authValidation.loginUserValidationSchema),
  authController.loginUser,
);
router.post(
  "/register",
  validateRequest(authValidation.registerUserValidationSchema),
  authController.registerUser,
);
router.post("/logout", authController.logoutUser);
router.post(
  "/refresh-token",
  validateRequest(authValidation.refreshTokenValidationSchema),
  authController.refreshAccessToken,
);
router.get("/me", auth(), authController.getAuthUser);
router.patch(
  "/me",
  auth(),
  validateRequest(authValidation.updateAuthUserValidationSchema),
  authController.updateAuthUser,
);

export const authRoutes = router;
