import express from "express";
import {
  createGRNFromPO,
  getGRNsByPO,
  getGRNById,
  receiverConfirmGRN,
  receiverRejectGRN,
  pmConfirmGRN,
  updateGRN,
  getAllGRNs,
  deleteGRN,
  generateGRNPDF,
} from "../controllers/grn.controller";
import { protect } from "../middleware/auth.middleware";
import { authorize } from "../middleware/roleAccess.middleware";
import { UserRole } from "../types/enums";

const router = express.Router({ mergeParams: true });

// Apply protection to all routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: GRN
 *   description: Goods Received Note management
 */

/**
 * @swagger
 * /api/grns:
 *   get:
 *     summary: Get all GRNs
 *     description: Retrieve all GRNs with optional filtering
 *     tags: [GRN]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by GRN status
 *       - in: query
 *         name: purchaseOrder
 *         schema:
 *           type: string
 *         description: Filter by purchase order ID
 *       - in: query
 *         name: requisition
 *         schema:
 *           type: string
 *         description: Filter by requisition ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of GRNs retrieved successfully
 */
router.get(
  "/grns",
  authorize(
    UserRole.PROCUREMENT_MANAGER,
    UserRole.STORE_MANAGER,
    UserRole.WAREHOUSE_MANAGER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  ),
  getAllGRNs
);

/**
 * @swagger
 * /api/grns/{grnId}:
 *   get:
 *     summary: Get single GRN
 *     description: Retrieve a specific GRN by ID
 *     tags: [GRN]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grnId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: GRN retrieved successfully
 *       404:
 *         description: GRN not found
 */
router.get("/grns/:grnId", getGRNById);

/**
 * @swagger
 * /api/grns/{grnId}/pdf:
 *   get:
 *     summary: Download completed GRN PDF
 *     description: Generates the Goods Received Note in the approved GRN format after both GRN approvals are complete.
 *     tags: [GRN]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grnId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: GRN PDF stream
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: GRN has not completed delivery approval
 */
router.get("/grns/:grnId/pdf", generateGRNPDF);

/**
 * @swagger
 * /api/grns/{grnId}:
 *   put:
 *     summary: Update GRN
 *     description: Update an existing GRN (only before receiver confirmation)
 *     tags: [GRN]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grnId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: GRN updated successfully
 */
router.put(
  "/grns/:grnId",
  authorize(UserRole.STORE_MANAGER, UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  updateGRN,
);

/**
 * @swagger
 * /api/grns/{grnId}:
 *   delete:
 *     summary: Delete GRN
 *     description: Delete a draft or rejected GRN
 *     tags: [GRN]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grnId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: GRN deleted successfully
 */
router.delete(
  "/grns/:grnId",
  authorize(UserRole.STORE_MANAGER, UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  deleteGRN,
);

/**
 * @swagger
 * /api/grns/{grnId}/receiver-confirm:
 *   post:
 *     summary: Receiver confirms GRN
 *     description: The assigned receiver confirms receipt of items
 *     tags: [GRN]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grnId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: GRN confirmed by receiver
 */
router.post("/grns/:grnId/receiver-confirm", receiverConfirmGRN);

/**
 * @swagger
 * /api/grns/{grnId}/receiver-reject:
 *   post:
 *     summary: Receiver rejects GRN
 *     description: The assigned receiver rejects the delivery
 *     tags: [GRN]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grnId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: GRN rejected by receiver
 */
router.post("/grns/:grnId/receiver-reject", receiverRejectGRN);

/**
 * @swagger
 * /api/grns/{grnId}/pm-confirm:
 *   post:
 *     summary: PM provides final GRN confirmation
 *     description: Procurement Manager provides final confirmation of delivery
 *     tags: [GRN]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grnId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: GRN confirmed by PM, delivery complete
 */
router.post(
  "/grns/:grnId/pm-confirm",
  authorize(UserRole.PROCUREMENT_MANAGER),
  pmConfirmGRN
);

/**
 * @swagger
 * /api/purchase-orders/{poId}/grn:
 *   post:
 *     summary: Create GRN from Purchase Order
 *     description: Store Manager creates a GRN for delivered items
 *     tags: [GRN]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: poId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemId:
 *                       type: string
 *                     itemDescription:
 *                       type: string
 *                     quantityOrdered:
 *                       type: number
 *                     quantityReceived:
 *                       type: number
 *                     uom:
 *                       type: string
 *                     condition:
 *                       type: string
 *                       enum: [Good, Damaged, Partial, Other]
 *                     remarks:
 *                       type: string
 *               generalRemarks:
 *                 type: string
 *               receiverId:
 *                 type: string
 *                 description: Optional - defaults to requester
 *     responses:
 *       201:
 *         description: GRN created successfully
 */
router.post(
  "/purchase-orders/:poId/grn",
  authorize(UserRole.STORE_MANAGER, UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  createGRNFromPO,
);

/**
 * @swagger
 * /api/purchase-orders/{poId}/grns:
 *   get:
 *     summary: Get all GRNs for a Purchase Order
 *     description: Retrieve all GRNs for a specific purchase order
 *     tags: [GRN]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: poId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: GRNs retrieved successfully
 */
router.get(
  "/purchase-orders/:poId/grns",
  authorize(
    UserRole.PROCUREMENT_MANAGER,
    UserRole.STORE_MANAGER,
    UserRole.WAREHOUSE_MANAGER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  ),
  getGRNsByPO,
);

export default router;
