import express from "express";
import { getRequisitionsByUser } from "../controllers/requisition.controller";
import { protect } from "../middleware/auth.middleware";

const router = express.Router({ mergeParams: true });

// Apply protection to all routes
router.use(protect);


/**
 * @swagger
 * /api/users/{userId}/requisitions:
 *   get:
 *     summary: Get requisitions by user
 *     description: Retrieve a list of requisitions for a specific user
 *     tags: [Requisitions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, submitted, department_approved, department_rejected, vendor_bidding, hr_review, hr_approved, hr_rejected, accounts_approved, accounts_rejected, po_generated, vendor_acknowledged, delivered, completed, cancelled]
 *         description: Filter by requisition status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date
 *     responses:
 *       200:
 *         description: List of requisitions for the user
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.get(
  "/", 
  getRequisitionsByUser
);

export default router;
