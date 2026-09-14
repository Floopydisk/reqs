import express from "express";
import {
  getRequisitions,
  getRequisition,
  getEligibleApprovers,
  createRequisition,
  updateRequisition,
  deleteRequisition,
  submitRequisition,
  departmentApproval,
  departmentRejection,
  hhraApproval,
  uploadAttachment,
  getRequisitionHistory,
  cancelRequisition,
  // Item-level approval functions
  approveItem,
  rejectItem,
  bulkApproveItems,
  bulkRejectItems,
  hrApproveItem,
  hrRejectItem,
  // PM procurement review functions
  getItemsForProcurementReview,
  moveToProcurementReview,
  // Payment tracking functions
  recordPayment,
  updatePaymentStatus,
} from "../controllers/requisition.controller";
import { protect } from "../middleware/auth.middleware";
import { authorize } from "../middleware/roleAccess.middleware";
import { UserRole } from "../types/enums";
import { upload, uploadItemImage } from "../middleware/upload.middleware";
import { validate } from "../middleware/requestValidator.middleware";
import { body } from "express-validator";
import Requisition from "../models/requisition.model";
import { parseItems } from "../middleware/parseItems.middleware";
import { getItemHistory } from "../utils/itemHistory";

const router = express.Router({ mergeParams: true });

// Apply protection to all routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Requisitions
 *   description: Requisition management
 */

/**
 * @swagger
 * /api/requisitions:
 *   get:
 *     summary: Get all requisitions
 *     description: Retrieve a list of all requisitions based on user role and permissions. Supports filtering by date range, status, category (product/service), title, vendor category, and price range. Note - To filter by department, use the dedicated department endpoint instead.
 *     tags: [Requisitions]
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
 *           enum: [draft, submitted, departmentApproved, departmentRejected, hrReview, hrApproved, hrRejected, procurementReview, rfqGeneration, vendorBidding, vendorAssigned, poPendingApproval, poApproved, delivered, partiallyDelivered, completed, cancelled]
 *         description: Filter by requisition status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [product, service]
 *         description: Filter by requisition category (product or service)
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: Filter by requisition title (case-insensitive)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-01-01"
 *         description: Filter requisitions created on or after this date (ISO 8601 format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-12-31"
 *         description: Filter requisitions created on or before this date (ISO 8601 format)
 *       - in: query
 *         name: vendorCategory
 *         schema:
 *           type: string
 *         description: Filter by vendor category ID
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Filter by minimum estimated price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Filter by maximum estimated price
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order (ascending or descending)
 *     responses:
 *       200:
 *         description: List of requisitions
 *       401:
 *         description: Not authorized
 */
router.get("/", getRequisitions);

/**
 * @swagger
 * /api/requisitions/eligible-approvers:
 *   get:
 *     summary: Get eligible HOD approvers
 *     description: Retrieve all active users who possess eligible approver roles (Department Head, Head of Finance, Head of HR, HR Approver, HHRA, Admin, Super Admin) for assigning to requisitions
 *     tags: [Requisitions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of eligible approvers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 4
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 60d0fe4f5311236168a109ca
 *                       firstName:
 *                         type: string
 *                         example: Jane
 *                       lastName:
 *                         type: string
 *                         example: Doe
 *                       email:
 *                         type: string
 *                         example: jane.doe@company.com
 *                       role:
 *                         type: string
 *                         example: departmentHead
 *                       department:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                             example: IT Department
 *       401:
 *         description: Not authorized
 */
router.get("/eligible-approvers", getEligibleApprovers);

/**
 * @swagger
 * /api/requisitions/{id}:
 *   get:
 *     summary: Get single requisition
 *     description: Retrieve details of a specific requisition by ID
 *     tags: [Requisitions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Requisition ID
 *     responses:
 *       200:
 *         description: Requisition data
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Requisition not found
 */
router.get("/:id", getRequisition);

/**
 * @swagger
 * /api/requisitions:
 *   post:
 *     summary: Create requisition
 *     description: Create a new requisition
 *     tags: [Requisitions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - urgency
 *               - justification
 *               - deliveryLocation
 *               - deliveryDate
 *               - items
 *             properties:
 *               title:
 *                 type: string
 *                 default: Office Supplies
 *                 example: Office Supplies
 *               urgency:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 default: medium
 *                 example: medium
 *               justification:
 *                 type: string
 *                 default: Current stock is running low
 *                 example: Current stock is running low
 *               deliveryLocation:
 *                 type: string
 *                 default: 690332c549e85d703d429cab
 *                 example: 690332c549e85d703d429cab
 *               deliveryDate:
 *                 type: string
 *                 format: date
 *                 default: "2025-12-31"
 *                 example: "2025-12-31"
 *               items:
 *                 type: string
 *                 description: |
 *                   Preferred: repeat the 'items' field for each item (each value is a JSON object string). Swagger UI does not support pre-populating repeated fields, so this form shows a single JSON array string that the server also accepts.
 *                   You can either:
 *                   - Repeat: -F "items={...}" -F "items={...}"
 *                   - Or send: -F "items=[{...},{...}]"
 *
 *                   Item fields:
 *                   - itemName (required): string
 *                   - itemType (required): "product" or "service"
 *                   - itemDescription (required): string
 *                   - isWorkTool (required): boolean
 *                   - preferredBrand (optional): string or empty string ""
 *                   - units (optional): number
 *                   - UOM (optional): string or empty string ""
 *                   - uploadImage (optional): string or empty string ""
 *                   - recommendedVendor (optional): MongoDB ObjectId or empty string ""
 *
 *                   Note: For optional fields, you can either omit them or send empty string "". Both will be treated as undefined.
 *                 default: '[{"itemName":"Paper","itemType":"product","itemDescription":"A4 paper","preferredBrand":"HP","units":10,"UOM":"reams","isWorkTool":false,"recommendedVendor":""},{"itemName":"Printer","itemType":"product","itemDescription":"Laser printer","preferredBrand":"DELL","units":1,"UOM":"unit","isWorkTool":true,"recommendedVendor":""}]'
 *                 example: '[{"itemName":"Paper","itemType":"product","itemDescription":"A4 paper","preferredBrand":"HP","units":10,"UOM":"reams","isWorkTool":false,"recommendedVendor":""},{"itemName":"Printer","itemType":"product","itemDescription":"Laser printer","preferredBrand":"DELL","units":1,"UOM":"unit","isWorkTool":true,"recommendedVendor":""}]'
 *           encoding:
 *             items:
 *               contentType: application/json
 *     x-codeSamples:
 *       - lang: curl
 *         label: multipart with repeated items fields
 *         source: |
 *           curl -X POST \
 *             'http://localhost:3003/api/requisitions' \
 *             -H 'accept: application/json' \
 *             -H 'Authorization: Bearer <your_token>' \
 *             -H 'Content-Type: multipart/form-data' \
 *             -F 'title=Office Supplies' \
 *             -F 'urgency=medium' \
 *             -F 'justification=Current stock is running low' \
 *             -F 'deliveryLocation=690332c549e85d703d429cab' \
 *             -F 'deliveryDate=2025-12-31' \
 *             -F 'items={"itemName":"Paper","itemType":"product","itemDescription":"A4 paper","preferredBrand":"HP","units":10,"UOM":"reams","isWorkTool":false}' \
 *             -F 'items={"itemName":"Printer","itemType":"product","itemDescription":"Laser printer","preferredBrand":"DELL","units":1,"UOM":"unit","isWorkTool":true}'
 *       - lang: curl
 *         label: with empty string for optional parameters
 *         source: |
 *           curl -X POST \
 *             'http://localhost:3003/api/requisitions' \
 *             -H 'accept: application/json' \
 *             -H 'Authorization: Bearer <your_token>' \
 *             -H 'Content-Type: multipart/form-data' \
 *             -F 'title=Office Supplies' \
 *             -F 'urgency=medium' \
 *             -F 'justification=Current stock is running low' \
 *             -F 'deliveryLocation=690332c549e85d703d429cab' \
 *             -F 'deliveryDate=2025-12-31' \
 *             -F 'items={"itemName":"Paper","itemType":"product","itemDescription":"A4 paper","preferredBrand":"","units":10,"UOM":"","isWorkTool":false,"recommendedVendor":""}' \
 *             -F 'items={"itemName":"Printer","itemType":"product","itemDescription":"Laser printer","preferredBrand":"","units":1,"UOM":"","isWorkTool":true,"recommendedVendor":""}'
 *           examples:
 *             defaultAllFields:
 *               summary: Filled with all parameters (you can remove ones you don't need)
 *               value:
 *                 title: Office Supplies
 *                 urgency: medium
 *                 justification: Current stock is running low
 *                 deliveryLocation: 690332c549e85d703d429cab
 *                 deliveryDate: "2025-12-31"
 *                 items: '[{"itemName":"Paper","itemType":"product","itemDescription":"A4 paper","preferredBrand":"HP","units":10,"UOM":"reams","isWorkTool":false},{"itemName":"Printer","itemType":"product","itemDescription":"Laser printer","preferredBrand":"DELL","units":1,"UOM":"unit","isWorkTool":true}]'
 *     responses:
 *       201:
 *         description: Requisition created successfully
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
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "673a8f1e2d4e5a1b3c9d0e12"
 *                     title:
 *                       type: string
 *                       example: "Office Supplies"
 *                     urgency:
 *                       type: string
 *                       example: "medium"
 *                     justification:
 *                       type: string
 *                       example: "Current stock is running low"
 *                     deliveryLocation:
 *                       type: string
 *                       example: "690332c549e85d703d429cab"
 *                     deliveryDate:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-12-31T00:00:00.000Z"
 *                     requester:
 *                       type: string
 *                       example: "673a7e1f2c4d5b2a3d8f0c11"
 *                     department:
 *                       type: string
 *                       example: "673a6d2e1b3c4a5e6f7d9b10"
 *                     status:
 *                       type: string
 *                       example: "draft"
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "673a8f1e2d4e5a1b3c9d0e13"
 *                           itemName:
 *                             type: string
 *                             example: "Paper"
 *                           itemType:
 *                             type: string
 *                             example: "product"
 *                           itemDescription:
 *                             type: string
 *                             example: "A4 paper"
 *                           preferredBrand:
 *                             type: string
 *                             example: "HP"
 *                           units:
 *                             type: number
 *                             example: 10
 *                           UOM:
 *                             type: string
 *                             example: "reams"
 *                           isWorkTool:
 *                             type: boolean
 *                             example: false
 *                           status:
 *                             type: string
 *                             example: "pending"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-11-05T10:30:00.000Z"
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-11-05T10:30:00.000Z"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-11-05T10:30:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-11-05T10:30:00.000Z"
 *             examples:
 *               staffCreated:
 *                 summary: Requisition created by staff (draft status)
 *                 value:
 *                   success: true
 *                   data:
 *                     _id: "673a8f1e2d4e5a1b3c9d0e12"
 *                     title: "Office Supplies"
 *                     urgency: "medium"
 *                     justification: "Current stock is running low"
 *                     deliveryLocation: "690332c549e85d703d429cab"
 *                     deliveryDate: "2025-12-31T00:00:00.000Z"
 *                     requester: "673a7e1f2c4d5b2a3d8f0c11"
 *                     department: "673a6d2e1b3c4a5e6f7d9b10"
 *                     status: "draft"
 *                     items:
 *                       - _id: "673a8f1e2d4e5a1b3c9d0e13"
 *                         itemName: "Paper"
 *                         itemType: "product"
 *                         itemDescription: "A4 paper"
 *                         preferredBrand: "HP"
 *                         units: 10
 *                         UOM: "reams"
 *                         isWorkTool: false
 *                         status: "pending"
 *                         createdAt: "2025-11-05T10:30:00.000Z"
 *                         updatedAt: "2025-11-05T10:30:00.000Z"
 *                       - _id: "673a8f1e2d4e5a1b3c9d0e14"
 *                         itemName: "Printer"
 *                         itemType: "product"
 *                         itemDescription: "Laser printer"
 *                         preferredBrand: "DELL"
 *                         units: 1
 *                         UOM: "unit"
 *                         isWorkTool: true
 *                         status: "pending"
 *                         createdAt: "2025-11-05T10:30:00.000Z"
 *                         updatedAt: "2025-11-05T10:30:00.000Z"
 *                     createdAt: "2025-11-05T10:30:00.000Z"
 *                     updatedAt: "2025-11-05T10:30:00.000Z"
 *               departmentHeadCreated:
 *                 summary: Requisition created by department head (auto-approved)
 *                 value:
 *                   success: true
 *                   data:
 *                     _id: "673a8f1e2d4e5a1b3c9d0e12"
 *                     title: "Office Supplies"
 *                     urgency: "high"
 *                     justification: "Urgent need for department operations"
 *                     deliveryLocation: "690332c549e85d703d429cab"
 *                     deliveryDate: "2025-12-15T00:00:00.000Z"
 *                     requester: "673a7e1f2c4d5b2a3d8f0c11"
 *                     department: "673a6d2e1b3c4a5e6f7d9b10"
 *                     status: "departmentApproved"
 *                     approvals:
 *                       - stage: "Department"
 *                         approver: "673a7e1f2c4d5b2a3d8f0c11"
 *                         status: "approved"
 *                         timestamp: "2025-11-05T10:30:00.000Z"
 *                     items:
 *                       - _id: "673a8f1e2d4e5a1b3c9d0e13"
 *                         itemName: "Paper"
 *                         itemType: "product"
 *                         itemDescription: "A4 paper"
 *                         units: 10
 *                         UOM: "reams"
 *                         isWorkTool: false
 *                         status: "pending"
 *                         createdAt: "2025-11-05T10:30:00.000Z"
 *                         updatedAt: "2025-11-05T10:30:00.000Z"
 *                     createdAt: "2025-11-05T10:30:00.000Z"
 *                     updatedAt: "2025-11-05T10:30:00.000Z"
 *       400:
 *         description: Invalid input - validation errors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Validation Error"
 *                 errors:
 *                   type: object
 *                   example:
 *                     title: "Title is required"
 *                     items: "Items are required"
 *       401:
 *         description: Not authorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Not authorized, no token"
 */
router.post("/", uploadItemImage, parseItems, createRequisition);

/**
 * @swagger
 * /api/requisitions/{id}:
 *   put:
 *     summary: Update requisition
 *     description: Update a requisition by ID. This endpoint can also be used to add new items to a requisition.
 *     tags: [Requisitions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Requisition ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 default: Updated Office Supplies
 *                 example: Updated Office Supplies
 *               urgency:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 default: high
 *                 example: high
 *               justification:
 *                 type: string
 *                 default: Updating quantities and adding items
 *                 example: Updating quantities and adding items
 *               deliveryLocation:
 *                 type: string
 *                 default: 690332c549e85d703d429cab
 *                 example: 690332c549e85d703d429cab
 *               deliveryDate:
 *                 type: string
 *                 format: date
 *                 default: "2026-01-15"
 *                 example: "2026-01-15"
 *               items:
 *                 type: string
 *                 description: |
 *                   Preferred: repeat the 'items' field for each item (each value is a JSON object string). Swagger UI does not support pre-populating repeated fields, so this form shows a single JSON array string that the server also accepts.
 *                   You can either:
 *                   - Repeat: -F "items={...}" -F "items={...}"
 *                   - Or send: -F "items=[{...},{...}]"
 *                 default: '[{"itemName":"Paper","itemType":"product","itemDescription":"A4 paper - replenishment","preferredBrand":"HP","units":20,"UOM":"reams","isWorkTool":false},{"itemName":"Pens","itemType":"product","itemDescription":"Blue pens","units":50,"UOM":"pack","isWorkTool":false}]'
 *                 example: '[{"itemName":"Paper","itemType":"product","itemDescription":"A4 paper - replenishment","preferredBrand":"HP","units":20,"UOM":"reams","isWorkTool":false},{"itemName":"Pens","itemType":"product","itemDescription":"Blue pens","units":50,"UOM":"pack","isWorkTool":false}]'
 *           encoding:
 *             items:
 *               contentType: application/json
 *     x-codeSamples:
 *       - lang: curl
 *         label: multipart with repeated items fields
 *         source: |
 *           curl -X PUT \
 *             'http://localhost:3003/api/requisitions/{id}' \
 *             -H 'accept: application/json' \
 *             -H 'Authorization: Bearer <your_token>' \
 *             -H 'Content-Type: multipart/form-data' \
 *             -F 'title=Updated Office Supplies' \
 *             -F 'urgency=high' \
 *             -F 'justification=Updating quantities and adding items' \
 *             -F 'deliveryLocation=690332c549e85d703d429cab' \
 *             -F 'deliveryDate=2026-01-15' \
 *             -F 'items={"itemName":"Paper","itemType":"product","itemDescription":"A4 paper - replenishment","preferredBrand":"HP","units":20,"UOM":"reams","isWorkTool":false}' \
 *             -F 'items={"itemName":"Pens","itemType":"product","itemDescription":"Blue pens","units":50,"UOM":"pack","isWorkTool":false}'
 *           examples:
 *             defaultAllFields:
 *               summary: Filled with all parameters (you can remove ones you don't need)
 *               value:
 *                 title: Updated Office Supplies
 *                 urgency: high
 *                 justification: Updating quantities and adding items
 *                 deliveryLocation: 690332c549e85d703d429cab
 *                 deliveryDate: "2026-01-15"
 *                 items: '[{"itemName":"Paper","itemType":"product","itemDescription":"A4 paper - replenishment","preferredBrand":"HP","units":20,"UOM":"reams","isWorkTool":false},{"itemName":"Pens","itemType":"product","itemDescription":"Blue pens","units":50,"UOM":"pack","isWorkTool":false}]'
 *     responses:
 *       200:
 *         description: Requisition updated
 *       400:
 *         description: Invalid input or cannot update requisition that is not in draft status
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Requisition not found
 */
router.put(
  "/:id",
  authorize(UserRole.STAFF),
  uploadItemImage,
  parseItems,
  updateRequisition,
);

/**
 * @swagger
 * /api/requisitions/{id}:
 *   delete:
 *     summary: Delete requisition
 *     description: Delete a requisition by ID. Only requisitions in DRAFT or SUBMITTED status can be deleted.
 *     tags: [Requisitions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Requisition ID
 *     responses:
 *       200:
 *         description: Requisition deleted
 *       400:
 *         description: Cannot delete requisition that is not in draft status
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Requisition not found
 */
router.delete("/:id", authorize(UserRole.STAFF), deleteRequisition);

/**
 * @swagger
 * /api/requisitions/{id}/submit:
 *   put:
 *     summary: Submit requisition for approval (removes from draft status)
 *     description: Submit a requisition for department head approval
 *     tags: [Requisitions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Requisition ID
 *     responses:
 *       200:
 *         description: Requisition submitted
 *       400:
 *         description: Requisition is not in draft status
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Requisition not found
 */
router.put(
  "/:id/submit",
  authorize(
    UserRole.STAFF,
    UserRole.DEPARTMENT_HEAD,
    UserRole.PROCUREMENT_MANAGER,
    UserRole.HHRA,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  ),
  submitRequisition,
);

/**
 * @swagger
 * /api/requisitions/{id}/department-approval:
 *   put:
 *     summary: Department head approval
 *     description: Approve or reject a requisition as department head
 *     tags: [Requisitions, Requisitions - Finance Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Requisition ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *                 example: approved
 *               comments:
 *                 type: string
 *                 example: Approved for procurement
 *     responses:
 *       200:
 *         description: Requisition approved/rejected
 *       400:
 *         description: Requisition is not in submitted status
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Requisition not found
 */
router.put(
  "/:id/department-approval",
  authorize(UserRole.DEPARTMENT_HEAD, UserRole.HEAD_OF_FINANCE, UserRole.HEAD_OF_HR, UserRole.HHRA, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate([
    body("status")
      .isIn(["approved", "rejected"])
      .withMessage("Status must be either approved or rejected"),
  ]),
  departmentApproval,
);

/**
 * @swagger
 * /api/requisitions/{id}/department-rejection:
 *   put:
 *     summary: Department head rejection
 *     description: Reject a requisition as department head
 *     tags: [Requisitions, Requisitions - Finance Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Requisition ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - comments
 *             properties:
 *               comments:
 *                 type: string
 *                 example: "Budget not available for this quarter."
 *     responses:
 *       200:
 *         description: Requisition rejected
 *       400:
 *         description: Requisition is not in submitted status or comments are missing
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Requisition not found
 */
router.put(
  "/:id/department-rejection",
  authorize(UserRole.DEPARTMENT_HEAD, UserRole.HEAD_OF_FINANCE, UserRole.HEAD_OF_HR, UserRole.HHRA, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate([
    body("comments").notEmpty().withMessage("Rejection comments are required"),
  ]),
  departmentRejection,
);

/**
/**
 * @swagger
 * /api/requisitions/{id}/hhra-approval:
 *   put:
 *     summary: HHRA approval and payment tracking
 *     description: Approve, reject, or mark payment status for a requisition as HHRA (combined HR and Accounts role)s
 *     tags: [Requisitions, Requisitions - Finance Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Requisition ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *                 description: The approval status of the requisition
 *                 example: approved
 *               comments:
 *                 type: string
 *                 description: Comments related to the approval decision
 *                 example: Approved after reviewing documentation
 *               paymentStatus:
 *                 type: string
 *                 enum: [unpaid, partially_paid, fully_paid]
 *                 description: The current payment status for the requisition
 *                 example: partially_paid
 *               paymentAmount:
 *                 type: number
 *                 description: Amount paid (in system's default currency)s
 *                 example: 1500.00
 *               paymentReference:
 *                 type: string
 *                 description: Reference number or identifier for the payment transaction
 *                 example: TXN-2023-12345
 *               paymentNotes:
 *                 type: string
 *                 description: Additional notes or information about the payment
 *                 example: First installment paid via wire transfer
 *     responses:
 *       200:
 *         description: Requisition approved/rejected by HHRA
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Requisition not found
 */
router.put(
  "/:id/hhra-approval",
  authorize(UserRole.HHRA, UserRole.HR_APPROVER, UserRole.ACCOUNTS_APPROVER, UserRole.DEPARTMENT_HEAD),
  validate([
    body("status")
      .isIn(["approved", "rejected"])
      .withMessage("Status must be either approved or rejected"),
    body("paymentStatus")
      .optional()
      .isIn(["unpaid", "partially_paid", "fully_paid"])
      .withMessage(
        "Payment status must be unpaid, partially_paid, or fully_paid",
      ),
    body("paymentAmount")
      .optional()
      .isNumeric()
      .withMessage("Payment amount must be a number"),
  ]),
  hhraApproval,
);

/**
/**
 * @swagger
 * /api/requisitions/{id}/attachments:
 *   post:
 *     summary: Upload attachment
 *     description: Upload an attachment for a requisition
 *     tags: [Requisitions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Requisition ID
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
 *         description: Requisition not found
 */
router.post("/:id/attachments", upload.single("file"), uploadAttachment);

/**
 * @swagger
 * /api/requisitions/{id}/history:
 *   get:
 *     summary: Get requisition history
 *     description: Retrieve the history of a specific requisition
 *     tags: [Requisitions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Requisition ID
 *     responses:
 *       200:
 *         description: Requisition history
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Requisition not found
 */
router.get("/:id/history", getRequisitionHistory);

/**
 * @swagger
 * /api/requisitions/{id}/cancel:
 *   put:
 *     summary: Cancel requisition
 *     description: Cancel a requisition
 *     tags: [Requisitions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Requisition ID
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
 *                 example: No longer needed
 *     responses:
 *       200:
 *         description: Requisition cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Requisition cancelled successfully
 *       400:
 *         description: Cannot cancel requisition in its current status
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Requisition not found
 */
router.put(
  "/:id/cancel",
  validate([
    body("reason").notEmpty().withMessage("Cancellation reason is required"),
  ]),
  cancelRequisition,
);

// ============================================
// ITEM-LEVEL BULK APPROVAL ROUTES (must be before /:requisitionId/items/:itemId)
// ============================================

/**
 * @swagger
 * /api/requisitions/{id}/items/bulk-approve:
 *   put:
 *     summary: Bulk approve multiple items (Department Head)
 *     tags: [Requisitions - Item Approval, Requisitions - Finance Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Requisition ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemIds
 *             properties:
 *               itemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of item IDs to approve
 *               comments:
 *                 type: string
 *                 description: Optional approval comments
 *     responses:
 *       200:
 *         description: Items approved successfully
 */
router.put(
  "/:id/items/bulk-approve",
  authorize(
    UserRole.DEPARTMENT_HEAD,
    UserRole.HEAD_OF_FINANCE,
    UserRole.HEAD_OF_HR,
    UserRole.HHRA,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  ),
  validate([
    body("itemIds")
      .isArray({ min: 1 })
      .withMessage("Item IDs array is required"),
  ]),
  bulkApproveItems,
);

/**
 * @swagger
 * /api/requisitions/{id}/items/bulk-reject:
 *   put:
 *     summary: Bulk reject items (Department Head)
 *     tags: [Requisitions - Item Approval, Requisitions - Finance Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Requisition ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               itemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of item IDs to reject
 *               comments:
 *                 type: string
 *                 required: true
 *                 description: Rejection comments (required)
 *     responses:
 *       200:
 *         description: Items rejected successfully
 */
router.put(
  "/:id/items/bulk-reject",
  authorize(
    UserRole.DEPARTMENT_HEAD,
    UserRole.HEAD_OF_FINANCE,
    UserRole.HEAD_OF_HR,
    UserRole.HHRA,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  ),
  validate([
    body("itemIds")
      .isArray({ min: 1 })
      .withMessage("Item IDs array is required"),
    body("comments")
      .notEmpty()
      .withMessage("Comments are required when rejecting items"),
  ]),
  bulkRejectItems,
);

/**
 * @swagger
 * /api/requisitions/{requisitionId}/items/{itemId}:
 *   get:
 *     summary: Get a specific item from a requisition
 *     description: Retrieve details of a single item including its approval status
 *     tags: [Requisitions, Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requisitionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item details
 *       404:
 *         description: Requisition or item not found
 */
router.get("/:requisitionId/items/:itemId", async (req, res, next) => {
  const { requisitionId, itemId } = req.params;

  try {
    const requisition = await Requisition.findById(requisitionId).populate(
      "departmentApprovedBy hhraApprovedBy departmentRejectedBy hhraRejectedBy",
      "firstName lastName email",
    );

    if (!requisition) {
      return res
        .status(404)
        .json({ success: false, message: "Requisition not found" });
    }

    const item = requisition.items.find(
      (i: any) => i._id?.toString() === itemId,
    );
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/requisitions/{requisitionId}/items/{itemId}/history:
 *   get:
 *     summary: Get history of an item
 *     description: Retrieve all status changes and actions performed on a specific item
 *     tags: [Requisitions, Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requisitionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item history retrieved successfully
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
 *                       action:
 *                         type: string
 *                       performedBy:
 *                         type: object
 *                       previousStatus:
 *                         type: string
 *                       newStatus:
 *                         type: string
 *                       comments:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *       404:
 *         description: Requisition or item not found
 */
router.get("/:requisitionId/items/:itemId/history", async (req, res, next) => {
  const { requisitionId, itemId } = req.params;

  try {
    // Verify requisition and item exist
    const requisition = await Requisition.findById(requisitionId);
    if (!requisition) {
      return res
        .status(404)
        .json({ success: false, message: "Requisition not found" });
    }

    const item = requisition.items.find(
      (i: any) => i._id?.toString() === itemId,
    );
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    // Retrieve history
    const history = await getItemHistory(requisitionId, itemId);

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/requisitions/{requisitionId}/items/{itemId}:
 *   put:
 *     summary: Update a specific item
 *     description: Update an item's details (only in DRAFT or PENDING status)
 *     tags: [Requisitions, Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requisitionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               itemName:
 *                 type: string
 *               itemType:
 *                 type: string
 *                 enum: [product, service]
 *               preferredBrand:
 *                 type: string
 *               itemDescription:
 *                 type: string
 *               units:
 *                 type: number
 *               UOM:
 *                 type: string
 *               isWorkTool:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Item updated
 *       400:
 *         description: Cannot update item in current status
 *       404:
 *         description: Requisition or item not found
 */
router.put(
  "/:requisitionId/items/:itemId",
  authorize(UserRole.STAFF),
  async (req, res, next) => {
    const { requisitionId, itemId } = req.params;
    const updates = req.body;

    try {
      const requisition = await Requisition.findById(requisitionId);
      if (!requisition) {
        return res
          .status(404)
          .json({ success: false, message: "Requisition not found" });
      }

      const item = requisition.items.find(
        (i: any) => i._id?.toString() === itemId,
      );
      if (!item) {
        return res
          .status(404)
          .json({ success: false, message: "Item not found" });
      }

      // Only allow updates if item is pending or requisition is draft
      if (
        item.status &&
        item.status !== "pending" &&
        requisition.status !== "draft"
      ) {
        return res.status(400).json({
          success: false,
          message: "Cannot update item after approval process has started",
        });
      }

      // Update fields
      Object.keys(updates).forEach((key) => {
        if (updates[key] !== undefined) {
          (item as any)[key] = updates[key];
        }
      });

      await requisition.save();

      res.status(200).json({
        success: true,
        message: "Item updated successfully",
        data: item,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// ITEM-LEVEL SINGLE APPROVAL ROUTES
// ============================================

/**
 * @swagger
 * /api/requisitions/{id}/items/{itemId}/approve:
 *   put:
 *     summary: Approve a single item (Department Head)
 *     tags: [Requisitions - Item Approval, Requisitions - Finance Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Requisition ID
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comments:
 *                 type: string
 *                 description: Optional approval comments
 *     responses:
 *       200:
 *         description: Item approved successfully
 */
router.put(
  "/:id/items/:itemId/approve",
  authorize(
    UserRole.DEPARTMENT_HEAD,
    UserRole.HEAD_OF_FINANCE,
    UserRole.HEAD_OF_HR,
    UserRole.HHRA,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  ),
  approveItem,
);

/**
 * @swagger
 * /api/requisitions/{id}/items/{itemId}/reject:
 *   put:
 *     summary: Reject a single item (Department Head)
 *     tags: [Requisitions - Item Approval, Requisitions - Finance Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Requisition ID
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comments:
 *                 type: string
 *                 description: Required rejection reason
 *     responses:
 *       200:
 *         description: Item rejected successfully
 */
router.put(
  "/:id/items/:itemId/reject",
  authorize(
    UserRole.DEPARTMENT_HEAD,
    UserRole.HEAD_OF_FINANCE,
    UserRole.HEAD_OF_HR,
    UserRole.HHRA,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  ),
  validate([body("comments").notEmpty().withMessage("Comments are required")]),
  rejectItem,
);

// Bulk routes moved earlier in file to avoid route matching conflicts

/**
 * @swagger
 * /api/requisitions/{id}/items/{itemId}/hr-approve:
 *   put:
 *     summary: HR approve working tool item
 *     tags: [Requisitions - Item Approval, Requisitions - Finance Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Requisition ID
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Working tool item ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comments:
 *                 type: string
 *                 description: Optional approval comments
 *     responses:
 *       200:
 *         description: Working tool item approved by HR
 */
router.put(
  "/:id/items/:itemId/hr-approve",
  authorize(UserRole.HR_APPROVER, UserRole.HHRA, UserRole.HEAD_OF_HR, UserRole.DEPARTMENT_HEAD),
  hrApproveItem,
);

/**
 * @swagger
 * /api/requisitions/{id}/items/{itemId}/hr-reject:
 *   put:
 *     summary: HR reject working tool item
 *     tags: [Requisitions - Item Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Requisition ID
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Working tool item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - comments
 *             properties:
 *               comments:
 *                 type: string
 *                 description: Required rejection reason
 *     responses:
 *       200:
 *         description: Working tool item rejected by HR
 */
router.put(
  "/:id/items/:itemId/hr-reject",
  authorize(UserRole.HR_APPROVER, UserRole.HHRA, UserRole.HEAD_OF_HR, UserRole.DEPARTMENT_HEAD),
  validate([body("comments").notEmpty().withMessage("Comments are required")]),
  hrRejectItem,
);

/**
 * @swagger
 * /api/requisitions/procurement-review/items:
 *   get:
 *     summary: Get items ready for PM procurement review
 *     tags: [Requisitions - Procurement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of items approved by HOD/HR ready for procurement review
 */
router.get(
  "/procurement-review/items",
  authorize(UserRole.PROCUREMENT_MANAGER),
  getItemsForProcurementReview,
);

/**
 * @swagger
 * /api/requisitions/{id}/procurement-review:
 *   put:
 *     summary: Move requisition to procurement review
 *     tags: [Requisitions - Procurement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Requisition ID
 *     responses:
 *       200:
 *         description: Requisition moved to procurement review
 */
router.put(
  "/:id/procurement-review",
  authorize(UserRole.PROCUREMENT_MANAGER),
  moveToProcurementReview,
);

/**
 * @swagger
 * /api/requisitions/{id}/payment:
 *   post:
 *     summary: Record payment for requisition
 *     tags: [Requisitions - Payment, Requisitions - Finance Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Requisition ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentAmount
 *             properties:
 *               paymentAmount:
 *                 type: number
 *                 description: Payment amount
 *               paymentMethod:
 *                 type: string
 *                 description: Payment method
 *               paymentReference:
 *                 type: string
 *                 description: Payment reference number
 *               paymentNotes:
 *                 type: string
 *                 description: Additional payment notes
 *     responses:
 *       200:
 *         description: Payment recorded successfully
 */
router.post(
  "/:id/payment",
  authorize(UserRole.HEAD_OF_FINANCE, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate([
    body("paymentAmount")
      .isNumeric()
      .withMessage("Payment amount must be a number")
      .isFloat({ gt: 0 })
      .withMessage("Payment amount must be greater than 0"),
  ]),
  recordPayment,
);

/**
 * @swagger
 * /api/requisitions/{id}/payment-status:
 *   put:
 *     summary: Update payment status
 *     tags: [Requisitions - Payment, Requisitions - Finance Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Requisition ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentStatus
 *             properties:
 *               paymentStatus:
 *                 type: string
 *                 enum: [unpaid, partially_paid, fully_paid]
 *                 description: Payment status
 *     responses:
 *       200:
 *         description: Payment status updated successfully
 */
router.put(
  "/:id/payment-status",
  authorize(UserRole.HEAD_OF_FINANCE, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate([
    body("paymentStatus")
      .isIn(["unpaid", "partially_paid", "fully_paid"])
      .withMessage("Valid payment status required"),
  ]),
  updatePaymentStatus,
);

export default router;
