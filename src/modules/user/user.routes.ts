import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { userController } from "./user.controller.js";
import { userValidation } from "./user.validation.js";

const router = Router();

router.use(auth(Role.ADMIN));

router.get(
  "/",
  validateRequest(userValidation.getAllUsersValidationSchema),
  userController.getAllUsers,
);

router.post(
  "/admins",
  validateRequest(userValidation.createAdminValidationSchema),
  userController.createAdmin,
);

router.get(
  "/:id",
  validateRequest(userValidation.userIdValidationSchema),
  userController.getUserById,
);

router.patch(
  "/:id/status",
  validateRequest(userValidation.updateUserStatusValidationSchema),
  userController.updateUserStatus,
);

router.patch(
  "/:id",
  validateRequest(userValidation.updateUserValidationSchema),
  userController.updateUser,
);

export const userRoute = router;
