import express from "express";
import {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrderFromRFQ,
  updatePurchaseOrder,
  acknowledgePurchaseOrder,
  cancelPurchaseOrder,
  uploadAttachment,
  generatePurchaseOrderPDF,
  getPurchaseOrdersByVendor,
  getPurchaseOrdersByRequisition,
  // PO Submission and Approval functions
  submitPurchaseOrder,
  hofApprovePO,
  hhrApprovePO,
  hofRejectPO,
  hhrRejectPO,
  rejectPO,
} from "../controllers/purchaseOrder.controller";
import { protect } from "../middleware/auth.middleware";
import { authorize } from "../middleware/roleAccess.middleware";
import { UserRole } from "../types/enums";
import { upload } from "../middleware/upload.middleware";

const router = express.Router({ mergeParams: true });

// Apply protection to all routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Purchase Orders
 *   description: Purchase order management
 */

/**
 * @swagger
 * /api/purchase-orders:
 *   get:
 *     summary: Get all purchase orders
 *     description: Retrieve a list of all purchase orders based on user role and permissions
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *           enum: [draft, issued, acknowledged, fulfilled, cancelled]
 *         description: Filter by purchase order status
 *     responses:
 *       200:
 *         description: List of purchase orders
 *       401:
 *         description: Not authorized
 */
router.get("/", getPurchaseOrders);

/**
 * @swagger
 * /api/purchase-orders/{id}:
 *   get:
 *     summary: Get single purchase order
 *     description: Retrieve details of a specific purchase order by ID
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Purchase order ID
 *     responses:
 *       200:
 *         description: Purchase order data
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Purchase order not found
 */
router.get("/:id", getPurchaseOrder);

/**
 * @swagger
 * /api/purchase-orders/{id}:
 *   put:
 *     summary: Update purchase order items and details
 *     description: The creating Procurement Manager or Administrator may update a draft, submitted, or rejected purchase order before approvals are finalized. Updating a submitted or rejected PO resets prior approvals.
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Purchase order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemId:
 *                       type: string
 *                     itemDescription:
 *                       type: string
 *                     detailsSpecification:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     uom:
 *                       type: string
 *                     brand:
 *                       type: string
 *                     unitPrice:
 *                       type: number
 *                     totalPrice:
 *                       type: number
 *                     lineType:
 *                       type: string
 *               deliveryLocation:
 *                 type: string
 *               deliveryDate:
 *                 type: string
 *                 format: date
 *               deliveryContact:
 *                 type: string
 *               shipping:
 *                 type: string
 *               generalTerms:
 *                 type: string
 *               termsOfService:
 *                 type: string
 *               paymentTerms:
 *                 type: string
 *               discount:
 *                 type: number
 *               discountType:
 *                 type: string
 *                 enum: [fixed, percentage]
 *               vat:
 *                 type: number
 *     responses:
 *       200:
 *         description: Purchase order updated successfully
 *       400:
 *         description: Invalid input or cannot update purchase order in current status
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Purchase order not found
 */
router.put(
  "/:id",
  authorize(UserRole.PROCUREMENT_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  updatePurchaseOrder,
);

/**
 * @swagger
 * /api/purchase-orders/{id}/acknowledge:
 *   put:
 *     summary: Acknowledge purchase order
 *     description: Acknowledge a purchase order as a vendor
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Purchase order ID
 *     responses:
 *       200:
 *         description: Purchase order acknowledged
 *       400:
 *         description: Purchase order is not in issued status
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Purchase order not found
 */
router.put(
  "/:id/acknowledge",
  // authorize(UserRole.VENDOR), // DEPRECATED: Vendor role removed
  authorize(UserRole.PROCUREMENT_MANAGER, UserRole.ADMIN, UserRole.HEAD_OF_FINANCE),
  acknowledgePurchaseOrder,
);

/**
 * @swagger
 * /api/purchase-orders/{id}/cancel:
 *   put:
 *     summary: Cancel purchase order
 *     description: Cancel a purchase order
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Purchase order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Vendor unable to fulfill order
 *     responses:
 *       200:
 *         description: Purchase order cancelled
 *       400:
 *         description: Purchase order is already fulfilled or cancelled
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Purchase order not found
 */
router.put(
  "/:id/cancel",
  authorize(UserRole.PROCUREMENT_MANAGER),
  cancelPurchaseOrder,
);

/**
 * @swagger
 * /api/purchase-orders/{id}/submit:
 *   put:
 *     summary: Submit purchase order for approval
 *     description: Submit a draft purchase order for HoF/HHR approval. Changes status from DRAFT to SUBMITTED and records who submitted it and when.
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Purchase order ID
 *     responses:
 *       200:
 *         description: Purchase order submitted successfully
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
 *       400:
 *         description: Purchase order must be in DRAFT status or is missing required data
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Only Procurement Manager can submit
 *       404:
 *         description: Purchase order not found
 */
router.put(
  "/:id/submit",
  authorize(UserRole.PROCUREMENT_MANAGER),
  submitPurchaseOrder,
);

/**
 * @swagger
 * /api/purchase-orders/{id}/hof-approve:
 *   put:
 *     summary: HoF approve purchase order (First approval)
 *     description: Head of Finance approves a purchase order. This is the first required approval before HHR can approve.
 *     tags: [Purchase Orders - Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Purchase order ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               feedback:
 *                 type: string
 *                 example: Budget approved for this procurement
 *     responses:
 *       200:
 *         description: Purchase order approved by HoF
 *       400:
 *         description: Purchase order must be in SUBMITTED status or HoF already approved
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Only Head of Finance can approve
 *       404:
 *         description: Purchase order not found
 */
router.put(
  "/:id/hof-approve",
  authorize(UserRole.HEAD_OF_FINANCE, UserRole.DEPARTMENT_HEAD),
  hofApprovePO,
);

/**
 * @swagger
 * /api/purchase-orders/{id}/hhr-approve:
 *   put:
 *     summary: HHR approve purchase order (Final approval)
 *     description: Head of HR provides final approval for a purchase order. Requires HoF approval first.
 *     tags: [Purchase Orders - Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Purchase order ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               feedback:
 *                 type: string
 *                 example: Final approval granted for procurement
 *     responses:
 *       200:
 *         description: Purchase order fully approved
 *       400:
 *         description: Purchase order must be approved by HoF first or HHR already approved
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Only Head of HR can approve
 *       404:
 *         description: Purchase order not found
 */
router.put(
  "/:id/hhr-approve",
  authorize(UserRole.HEAD_OF_HR, UserRole.DEPARTMENT_HEAD, UserRole.HHRA),
  hhrApprovePO,
);

/**
 * @swagger
 * /api/purchase-orders/{id}/hof-reject:
 *   put:
 *     summary: HoF reject purchase order
 *     description: Reject a submitted purchase order as Head of Finance. A reason or feedback is required and recorded in the approval audit trail.
 *     tags: [Purchase Orders - Approval]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string, example: Budget is not available for this request. }
 *               feedback: { type: string, example: Budget is not available for this request. }
 *     responses:
 *       200: { description: Purchase order rejected by HoF }
 *       400: { description: Reason missing or PO is not awaiting HoF decision }
 *       403: { description: Actor is not an eligible HoF }
 *       404: { description: Purchase order not found }
 */
router.put(
  "/:id/hof-reject",
  authorize(UserRole.HEAD_OF_FINANCE, UserRole.DEPARTMENT_HEAD),
  hofRejectPO,
);

/**
 * @swagger
 * /api/purchase-orders/{id}/hhr-reject:
 *   put:
 *     summary: HHR reject purchase order
 *     description: Reject a purchase order as Head of HR after a valid HoF approval. A reason or feedback is required and recorded in the approval audit trail.
 *     tags: [Purchase Orders - Approval]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string, example: Required HR clearance is incomplete. }
 *               feedback: { type: string, example: Required HR clearance is incomplete. }
 *     responses:
 *       200: { description: Purchase order rejected by HHR }
 *       400: { description: Reason missing or PO is not awaiting HHR decision }
 *       403: { description: Actor is not an eligible HHR }
 *       404: { description: Purchase order not found }
 */
router.put(
  "/:id/hhr-reject",
  authorize(UserRole.HEAD_OF_HR, UserRole.HHRA, UserRole.DEPARTMENT_HEAD),
  hhrRejectPO,
);

/**
 * @swagger
 * /api/purchase-orders/{id}/reject:
 *   put:
 *     summary: Reject purchase order (Shared sequential endpoint)
 *     description: Head of Finance or Head of HR can reject a purchase order with reason or feedback. HoF rejects submitted POs; HHR rejects hofApproved POs.
 *     tags: [Purchase Orders - Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Purchase order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Budget constraints - procurement not approved at this time
 *               feedback:
 *                 type: string
 *                 example: Budget constraints - procurement not approved at this time
 *     responses:
 *       200:
 *         description: Purchase order rejected
 *       400:
 *         description: Purchase order cannot be rejected or reason is required
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Only HoF or HHR can reject
 *       404:
 *         description: Purchase order not found
 */
router.put(
  "/:id/reject",
  authorize(
    UserRole.HEAD_OF_FINANCE,
    UserRole.HEAD_OF_HR,
    UserRole.DEPARTMENT_HEAD,
    UserRole.HHRA,
  ),
  rejectPO,
);

/**
 * @swagger
 * /api/purchase-orders/{id}/attachments:
 *   post:
 *     summary: Upload purchase order attachment
 *     description: Upload an attachment for a purchase order
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Purchase order ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Attachment uploaded
 *       400:
 *         description: Please upload a file
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Purchase order not found
 */
router.post(
  "/:id/attachments",
  authorize(UserRole.PROCUREMENT_MANAGER),
  upload.single("file"),
  uploadAttachment,
);

/**
 * @swagger
 * /api/purchase-orders/{id}/pdf:
 *   get:
 *     summary: Generate purchase order PDF
 *     description: Generate and download a PDF version of a fully approved purchase order. Both HoF and HHR approvals are required; the endpoint does not approve a PO as a side effect.
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Purchase order ID
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Purchase order is not fully approved
 *       404:
 *         description: Purchase order not found
 */
router.get("/:id/pdf", generatePurchaseOrderPDF);

/**
 * @swagger
 * /api/vendors/{vendorId}/purchase-orders:
 *   get:
 *     summary: Get purchase orders by vendor
 *     description: Retrieve a list of purchase orders for a specific vendor
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
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
 *           enum: [draft, issued, acknowledged, fulfilled, cancelled]
 *         description: Filter by purchase order status
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
 *         description: List of purchase orders for the vendor
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vendor not found
 */
router.get("/vendors/:vendorId/purchase-orders", getPurchaseOrdersByVendor);

/**
 * @swagger
 * /api/requisitions/{requisitionId}/purchase-orders:
 *   get:
 *     summary: Get purchase orders by requisition
 *     description: Retrieve a list of purchase orders for a specific requisition
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requisitionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Requisition ID
 *     responses:
 *       200:
 *         description: List of purchase orders for the requisition
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Requisition not found
 */
router.get("/:requisitionId/purchase-orders", getPurchaseOrdersByRequisition);

/**
 * @swagger
 * /api/rfqs/{rfqId}/purchase-order:
 *   post:
 *     summary: Create Purchase Order from RFQ (NEW WORKFLOW)
 *     description: |
 *       Create a Purchase Order from a selected RFQ with received quote.
 *       PM can select specific items from the RFQ to bundle into the PO.
 *       This replaces the old bid-based workflow.
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rfqId
 *         required: true
 *         schema:
 *           type: string
 *         description: RFQ ID with received quote
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               selectedItemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional - Array of item IDs to include. If omitted, all RFQ items are included.
 *               deliveryDate:
 *                 type: string
 *                 format: date
 *                 description: Delivery date (defaults to RFQ expected delivery date)
 *               deliveryLocation:
 *                 type: string
 *                 description: Delivery location ID (defaults to RFQ location)
 *               deliveryContact:
 *                 type: string
 *                 description: Delivery contact user ID
 *               shipping:
 *                 type: string
 *                 description: Shipping method
 *                 default: Vendor Delivery
 *               generalTerms:
 *                 type: string
 *                 description: General terms and conditions
 *               termsOfService:
 *                 type: string
 *                 description: Terms of service (defaults to RFQ termsAndConditions)
 *               paymentTerms:
 *                 type: string
 *                 description: Payment terms
 *               discount:
 *                 type: number
 *                 description: Discount value (percentage or fixed amount)
 *                 example: 5
 *               discountType:
 *                 type: string
 *                 enum: [fixed, percentage]
 *                 default: fixed
 *                 example: percentage
 *               vat:
 *                 type: number
 *                 description: VAT rate percentage
 *                 example: 7.5
 *               vendorQuote:
 *                 type: string
 *                 description: Vendor quote document URL (defaults to RFQ quoteDocument)
 *               vendorQuotes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     url:
 *                       type: string
 *               serviceClassificationOverride:
 *                 type: string
 *                 enum: [product, service]
 *                 description: Force PO classification
 *               serviceClassificationReason:
 *                 type: string
 *                 description: Rationale when overriding classification
 *               items:
 *                 type: array
 *                 description: Custom items or line modifications
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemId:
 *                       type: string
 *                       description: Optional for custom / service charge lines
 *                     itemDescription:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     uom:
 *                       type: string
 *                     unitPrice:
 *                       type: number
 *                     totalPrice:
 *                       type: number
 *                     lineType:
 *                       type: string
 *                       enum: [requisition, service_charge, service, custom]
 *               totalAmount:
 *                 type: number
 *                 description: Override calculated total amount; validated against subtotal - discount + VAT
 *     responses:
 *       201:
 *         description: Purchase order created successfully from RFQ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Created purchase order
 *                 message:
 *                   type: string
 *                   example: Purchase order created successfully from RFQ. Submit for approval.
 *       400:
 *         description: Invalid input or RFQ doesn't have quote received
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Only Procurement Managers can create POs
 *       404:
 *         description: RFQ not found
 */
router.post(
  "/:rfqId/purchase-order",
  authorize(UserRole.PROCUREMENT_MANAGER),
  createPurchaseOrderFromRFQ,
);

export default router;
