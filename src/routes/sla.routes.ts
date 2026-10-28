import express from "express";
import {
  getSLAs,
  getSLAById,
  createSLA,
  updateSLA,
  deleteSLA,
} from "../controllers/sla.controller";
import { protect, authorize } from "../middleware/auth.middleware";
import { UserRole } from "../types/enums";

const router = express.Router();

router.use(protect);

router.get("/", getSLAs);
router.get("/:id", getSLAById);

router.post(
  "/",
  authorize(UserRole.PROCUREMENT_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  createSLA,
);

router.put(
  "/:id",
  authorize(UserRole.PROCUREMENT_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  updateSLA,
);

router.delete(
  "/:id",
  authorize(UserRole.PROCUREMENT_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  deleteSLA,
);

export default router;
