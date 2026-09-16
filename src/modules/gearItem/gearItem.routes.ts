import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { gearItemController } from "./gearItem.controller.js";
import { gearItemValidation } from "./gearItem.validation.js";

const router = Router();

router.get(
  "/",
  validateRequest(gearItemValidation.getAllGearItemsValidationSchema),
  gearItemController.getAllGearItems,
);
router.get("/price-range", gearItemController.getGearPriceRange);
router.get(
  "/:id",
  validateRequest(gearItemValidation.getGearItemByIdValidationSchema),
  gearItemController.getGearItemById,
);
router.post(
  "/",
  auth(Role.PROVIDER, Role.ADMIN),
  validateRequest(gearItemValidation.createGearItemValidationSchema),
  gearItemController.createGearItem,
);
router.patch(
  "/:id",
  auth(Role.PROVIDER, Role.ADMIN),
  validateRequest(gearItemValidation.updateGearItemValidationSchema),
  gearItemController.updateGearItem,
);
router.delete(
  "/:id",
  auth(Role.PROVIDER, Role.ADMIN),
  validateRequest(gearItemValidation.getGearItemByIdValidationSchema),
  gearItemController.deleteGearItem,
);

export const gearItemRoute = router;
