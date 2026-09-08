import express from "express";
import {
  generateRFQsFromRequisition,
  getRFQsByRequisition,
  getRFQById,
  updateRFQ,
  issueRFQ,
  issueMultipleRFQs,
  deleteRFQ,
  getAllRFQs,
  uploadVendorQuote,
  downloadRFQs,
} from "../controllers/rfq.controller";
import { protect } from "../middleware/auth.middleware";
import { authorize } from "../middleware/roleAccess.middleware";
import { UserRole } from "../types/enums";

const router = express.Router({ mergeParams: true });

// Apply protection to all routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: RFQ
 *   description: Request for Quotation management
 */

/**
 * @swagger
 * /api/rfqs:
 *   get:
 *     summary: Get all RFQs
 *     description: Retrieve all RFQs with optional filtering
 *     tags: [RFQ]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by RFQ status
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
 *         description: List of RFQs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       vendors:
 *                         type: array
 *                         description: Vendor IDs only
 *                         items:
 *                           type: string
 */
router.get(
  "/rfqs",
  authorize(
    UserRole.PROCUREMENT_MANAGER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.HHRA,
    UserRole.HEAD_OF_FINANCE,
    UserRole.HEAD_OF_HR,
    UserRole.HR_APPROVER,
    UserRole.DEPARTMENT_HEAD,
  ),
  getAllRFQs,
);

/**
 * @swagger
 * /api/rfqs/{rfqId}:
 *   get:
 *     summary: Get single RFQ
 *     description: Retrieve a specific RFQ by ID
 *     tags: [RFQ]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rfqId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: RFQ retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     vendors:
 *                       type: array
 *                       description: Vendor IDs only
 *                       items:
 *                         type: string
 *       404:
 *         description: RFQ not found
 */
router.get(
  "/rfqs/:rfqId",
  authorize(
    UserRole.PROCUREMENT_MANAGER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.HHRA,
    UserRole.HEAD_OF_FINANCE,
    UserRole.HEAD_OF_HR,
    UserRole.HR_APPROVER,
    UserRole.DEPARTMENT_HEAD,
  ),
  getRFQById,
);

/**
 * @swagger
 * /api/rfqs/{rfqId}:
 *   put:
 *     summary: Update RFQ
 *     description: Update an existing RFQ (only in DRAFT status)
 *     tags: [RFQ]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rfqId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               vendors:
 *                 type: array
 *                 description: Vendor IDs
 *                 items:
 *                   type: string
 *               deliveryLocation:
 *                 type: string
 *                 description: Location ID
 *               evaluationCriteria:
 *                 type: string
 *               termsOfService:
 *                 type: string
 *                 description: Mapped to termsAndConditions in backend
 *               expectedDeliveryDate:
 *                 type: string
 *                 format: date
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     uom:
 *                       type: string
 *                     expectedDeliveryDate:
 *                       type: string
 *                       format: date
 *     responses:
 *       200:
 *         description: RFQ updated successfully
 */
router.put("/rfqs/:rfqId", authorize(UserRole.PROCUREMENT_MANAGER), updateRFQ);

/**
 * @swagger
 * /api/rfqs/{rfqId}:
 *   delete:
 *     summary: Delete RFQ
 *     description: Delete a draft or cancelled RFQ
 *     tags: [RFQ]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rfqId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: RFQ deleted successfully
 */
router.delete(
  "/rfqs/:rfqId",
  authorize(UserRole.PROCUREMENT_MANAGER),
  deleteRFQ,
);

/**
 * @swagger
 * /api/rfqs/{rfqId}/issue:
 *   post:
 *     summary: Issue RFQ to vendor
 *     description: Send RFQ to vendor (changes status from DRAFT to ISSUED)
 *     tags: [RFQ]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rfqId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: RFQ issued successfully
 */
router.post(
  "/rfqs/:rfqId/issue",
  authorize(UserRole.PROCUREMENT_MANAGER),
  issueRFQ,
);

/**
 * @swagger
 * /api/rfqs/{rfqId}/upload-quote:
 *   post:
 *     summary: Upload vendor quote for RFQ
 *     description: Upload quote details received from vendor (changes status to QUOTE_RECEIVED)
 *     tags: [RFQ]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rfqId
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
 *               - quoteTotalAmount
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemId:
 *                       type: string
 *                       description: Item ID from RFQ
 *                     quotedUnitPrice:
 *                       type: number
 *                       description: Unit price quoted by vendor
 *                     quotedTotalPrice:
 *                       type: number
 *                       description: Total price for this item
 *                     vendorComments:
 *                       type: string
 *                       description: Vendor's comments about this item
 *               quoteTotalAmount:
 *                 type: number
 *                 description: Total quoted amount for all items
 *               quoteValidUntil:
 *                 type: string
 *                 format: date
 *                 description: Quote validity/expiry date
 *               quoteNotes:
 *                 type: string
 *                 description: General notes about the quote
 *               quoteDocument:
 *                 type: string
 *                 description: S3 URL of uploaded quote document
 *     responses:
 *       200:
 *         description: Vendor quote uploaded successfully
 *       400:
 *         description: Can only upload quotes for issued RFQs
 *       404:
 *         description: RFQ not found
 */
router.post(
  "/rfqs/:rfqId/upload-quote",
  authorize(UserRole.PROCUREMENT_MANAGER),
  uploadVendorQuote,
);

/**
 * @swagger
 * /api/rfqs/issue-multiple:
 *   post:
 *     summary: Issue multiple RFQs at once
 *     description: Send multiple RFQs to vendors
 *     tags: [RFQ]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rfqIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: RFQs issued successfully
 */
router.post(
  "/rfqs/issue-multiple",
  authorize(UserRole.PROCUREMENT_MANAGER),
  issueMultipleRFQs,
);

/**
 * @swagger
 * /api/requisitions/{requisitionId}/rfqs:
 *   post:
 *     summary: Generate RFQs from requisition
 *     description: Create RFQs for selected items and vendors from a requisition. Requires prior approval by the Head of Finance (HoF) and HR review for work tools.
 *     tags: [RFQ]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requisitionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The requisition ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vendors
 *               - itemIds
 *             properties:
 *               vendors:
 *                 type: array
 *                 description: Array of vendor IDs from the Vendor Master
 *                 items:
 *                   type: string
 *                 example: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
 *               itemIds:
 *                 type: array
 *                 description: Array of item IDs from the requisition to include in RFQs
 *                 items:
 *                   type: string
 *                 example: ["507f1f77bcf86cd799439021", "507f1f77bcf86cd799439022"]
 *               title:
 *                 type: string
 *                 description: RFQ title independent of requisition title
 *               deliveryLocation:
 *                 type: string
 *                 description: Location ID; independent of requisition location
 *               evaluationCriteria:
 *                 type: string
 *                 description: Optional evaluation criteria for the RFQ
 *                 example: "Price (40%), Delivery Time (30%), Quality (30%)"
 *               termsOfService:
 *                 type: string
 *                 description: Optional terms of service (mapped to backend termsAndConditions)
 *                 example: "Payment: 50% on PO, 50% on delivery. Delivery by 30 days from PO date."
 *               expectedDeliveryDate:
 *                 type: string
 *                 format: date
 *                 description: Overall RFQ expected delivery date
 *               items:
 *                 type: array
 *                 description: Optional per-item overrides (quantity, uom, description). If omitted, values are pulled from the requisition items.
 *                 items:
 *                   type: object
 *                   required:
 *                     - itemId
 *                   properties:
 *                     itemId:
 *                       type: string
 *                       description: Item ID from the requisition
 *                     quantity:
 *                       type: number
 *                       description: Override quantity (defaults to requisition item units or 1)
 *                     uom:
 *                       type: string
 *                       description: Override unit of measure
 *                     description:
 *                       type: string
 *                       description: Override item description
 *           examples:
 *             basic:
 *               summary: Basic RFQ generation
 *               value:
 *                 vendors: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
 *                 itemIds: ["507f1f77bcf86cd799439021"]
 *             detailed:
 *               summary: RFQ generation with evaluation criteria and terms
 *               value:
 *                 vendors: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
 *                 itemIds: ["507f1f77bcf86cd799439021", "507f1f77bcf86cd799439022"]
 *                 evaluationCriteria: "Price (40%), Delivery Time (30%), Quality (30%)"
 *                 termsOfService: "Payment: 50% on PO, 50% on delivery. Delivery by 30 days from PO date."
 *                 title: "Laboratory Equipment RFQ"
 *                 deliveryLocation: "507f1f77bcf86cd799439031"
 *                 expectedDeliveryDate: "2025-02-15"
 *                 items:
 *                   - itemId: "507f1f77bcf86cd799439021"
 *                     quantity: 10
 *                   - itemId: "507f1f77bcf86cd799439022"
 *                     quantity: 5
 *                     uom: "boxes"
 *     responses:
 *       201:
 *         description: RFQ created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     requisition:
 *                       type: string
 *                     vendors:
 *                       type: array
 *                       items:
 *                         type: string
 *                     items:
 *                       type: array
 *                     status:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid request or requisition not in appropriate status
 *       403:
 *         description: User is not a Procurement Manager
 *       404:
 *         description: Requisition or vendor not found
 */
router.post(
  "/requisitions/:requisitionId/rfqs",
  authorize(UserRole.PROCUREMENT_MANAGER),
  generateRFQsFromRequisition,
);

/**
 * @swagger
 * /api/rfqs/{rfqId}/download:
 *   get:
 *     summary: Download RFQ for one/all/selected vendors
 *     description: |
 *       Download RFQ documents as PDF/ZIP with optional vendor filtering.
 *       - Single vendor (`vendorIds=<id>`) returns one PDF.
 *       - Multiple vendors (`vendorIds=id1,id2`) returns ZIP of PDFs.
 *       - No vendorIds returns ZIP for all vendors tied to the RFQ.
 *     tags: [RFQ]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rfqId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: vendorIds
 *         required: false
 *         schema:
 *           type: string
 *         description: Comma-separated vendor IDs (e.g. 507f...,507f...)
 *     responses:
 *       200:
 *         description: RFQ document(s) downloaded
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: No RFQs found for criteria
 */
router.get(
  "/rfqs/:rfqId/download",
  authorize(
    UserRole.PROCUREMENT_MANAGER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.HEAD_OF_FINANCE,
    UserRole.HEAD_OF_HR,
    UserRole.HR_APPROVER,
    UserRole.HHRA,
  ),
  downloadRFQs,
);

/**
 * @swagger
 * /api/requisitions/{requisitionId}/rfqs:
 *   get:
 *     summary: Get all RFQs for a requisition
 *     description: Retrieve all RFQs generated for a specific requisition
 *     tags: [RFQ]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requisitionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: RFQs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       vendors:
 *                         type: array
 *                         description: Vendor IDs only
 *                         items:
 *                           type: string
 */
router.get(
  "/requisitions/:requisitionId/rfqs",
  authorize(
    UserRole.PROCUREMENT_MANAGER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.HEAD_OF_FINANCE,
    UserRole.HEAD_OF_HR,
    UserRole.HR_APPROVER,
    UserRole.HHRA,
  ),
  getRFQsByRequisition,
);

export default router;
