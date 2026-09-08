import express from "express";
import { checkVendorCategories } from "../controllers/diagnostic.controller";
import { protect } from "../middleware/auth.middleware";
import { authorize } from "../middleware/roleAccess.middleware";
import { UserRole } from "../types/enums";

const router = express.Router();

// Apply protection to all routes
router.use(protect);

// Check vendor categories assignment
router.get(
  "/vendor-categories",
  authorize(UserRole.ADMIN, UserRole.PROCUREMENT_MANAGER),
  checkVendorCategories
);

export default router;
