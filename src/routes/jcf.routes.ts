import express from "express";
import {
  createJCFFromPO,
  getJCFs,
  getJCFById,
  getJCFByPO,
  updateJCF,
  approveJCF,
  rejectJCF,
  generateJCFPDF,
} from "../controllers/jcf.controller";
import { protect } from "../middleware/auth.middleware";
import { authorize } from "../middleware/roleAccess.middleware";
import { UserRole } from "../types/enums";

const router = express.Router({ mergeParams: true });

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: JCF
 *   description: Job Completion Form (JCF) management for service purchase orders
 */

/**
 * @swagger
 * /api/purchase-orders/{poId}/jcf:
 *   post:
 *     summary: Create Job Completion Form (JCF) for a Service Purchase Order
 *     description: Creates a JCF for an approved service purchase order. Only Procurement Managers and Admins can create JCFs.
 *     tags: [JCF]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: poId
 *         required: true
 *         schema:
 *           type: string
 *         description: Approved Service Purchase Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceDescription
 *             properties:
 *               serviceDescription:
 *                 type: string
 *                 description: Detailed description of the executed services
 *                 example: Full HVAC maintenance and cooling filter replacements
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: Service execution start date
 *                 example: 2026-03-01T08:00:00.000Z
 *               completionDate:
 *                 type: string
 *                 format: date-time
 *                 description: Service execution completion date
 *                 example: 2026-03-03T17:00:00.000Z
 *               location:
 *                 type: string
 *                 description: Execution location / branch
 *                 example: Headquarters - Server Room & 2nd Floor
 *               deliverables:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                       example: Filter Replacement
 *                     description:
 *                       type: string
 *                       example: 8 HEPA filters installed
 *                     isCompleted:
 *                       type: boolean
 *                       default: true
 *               vendorRepresentative:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: John Engineer
 *                   phone:
 *                     type: string
 *                     example: +2348012345678
 *                   email:
 *                     type: string
 *                     example: john@coolingservices.com
 *               completionEvidence:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: service_report.pdf
 *                     url:
 *                       type: string
 *                       example: https://s3.amazonaws.com/bucket/service_report.pdf
 *                     uploadedAt:
 *                       type: string
 *                       format: date-time
 *               rating:
 *                 type: object
 *                 properties:
 *                   qualityOfWork:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 5
 *                     example: 5
 *                   timeliness:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 5
 *                     example: 4
 *                   overallSatisfaction:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 5
 *                     example: 5
 *                   notes:
 *                     type: string
 *                     example: Excellent service delivery
 *     responses:
 *       201:
 *         description: JCF created successfully
 *       400:
 *         description: Invalid input or PO is not an approved service PO
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Only Procurement Managers can create JCF
 *       404:
 *         description: Purchase Order not found
 */
router.post(
  "/purchase-orders/:poId/jcf",
  authorize(UserRole.PROCUREMENT_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  createJCFFromPO,
);

/**
 * @swagger
 * /api/purchase-orders/{poId}/jcf:
 *   get:
 *     summary: Get JCF associated with a Purchase Order
 *     description: Retrieve the Job Completion Form associated with the specified service PO
 *     tags: [JCF]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: poId
 *         required: true
 *         schema:
 *           type: string
 *         description: Purchase Order ID
 *     responses:
 *       200:
 *         description: JCF retrieved successfully
 *       404:
 *         description: JCF not found for this Purchase Order
 */
router.get("/purchase-orders/:poId/jcf", getJCFByPO);

/**
 * @swagger
 * /api/jcfs:
 *   get:
 *     summary: List all Job Completion Forms
 *     description: Retrieve paginated list of JCFs with optional filtering by status and search keyword
 *     tags: [JCF]
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
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, pendingApproval, approved, rejected]
 *         description: Filter by JCF status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search keyword matching JCF number or description
 *     responses:
 *       200:
 *         description: List of JCFs
 *       401:
 *         description: Not authorized
 */
router.get("/jcfs", getJCFs);

/**
 * @swagger
 * /api/jcfs/{id}:
 *   get:
 *     summary: Get single Job Completion Form by ID
 *     description: Retrieve detailed information for a specific JCF including PO, vendor, requisition, and requester details
 *     tags: [JCF]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: JCF ID
 *     responses:
 *       200:
 *         description: JCF details retrieved successfully
 *       404:
 *         description: JCF not found
 */
router.get("/jcfs/:id", getJCFById);

/**
 * @swagger
 * /api/jcfs/{id}:
 *   put:
 *     summary: Update a Job Completion Form
 *     description: Update an existing draft or rejected JCF. Only Procurement Managers and Admins can update JCFs.
 *     tags: [JCF]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: JCF ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               serviceDescription:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               completionDate:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: string
 *               deliverables:
 *                 type: array
 *                 items:
 *                   type: object
 *               vendorRepresentative:
 *                 type: object
 *               completionEvidence:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: JCF updated successfully
 *       400:
 *         description: JCF already approved and cannot be updated
 *       403:
 *         description: Not authorized to update JCF
 *       404:
 *         description: JCF not found
 */
router.put(
  "/jcfs/:id",
  authorize(UserRole.PROCUREMENT_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  updateJCF,
);

/**
 * @swagger
 * /api/jcfs/{id}/approve:
 *   put:
 *     summary: Approve Job Completion Form (Service Acceptance)
 *     description: Service requester, department head, or admin approves the JCF, certifying satisfactory completion of services. Updates JCF status to approved.
 *     tags: [JCF]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: JCF ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comments:
 *                 type: string
 *                 description: Approval comments or notes
 *                 example: Services rendered satisfactorily according to specifications
 *               rating:
 *                 type: object
 *                 properties:
 *                   qualityOfWork:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 5
 *                     example: 5
 *                   timeliness:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 5
 *                     example: 5
 *                   overallSatisfaction:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 5
 *                     example: 5
 *                   notes:
 *                     type: string
 *                     example: Very thorough job
 *     responses:
 *       200:
 *         description: JCF approved successfully
 *       400:
 *         description: JCF already approved
 *       403:
 *         description: Only requester, department head, or admin can approve
 *       404:
 *         description: JCF not found
 */
router.put("/jcfs/:id/approve", approveJCF);

/**
 * @swagger
 * /api/jcfs/{id}/reject:
 *   put:
 *     summary: Reject Job Completion Form
 *     description: Reject a JCF due to incomplete or unsatisfactory service. Comments are strictly required.
 *     tags: [JCF]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: JCF ID
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
 *                 description: Reason for rejection
 *                 example: HVAC unit 2 still not operational. Requires technician callback.
 *     responses:
 *       200:
 *         description: JCF rejected successfully
 *       400:
 *         description: Rejection comments required
 *       403:
 *         description: Only requester, department head, or admin can reject
 *       404:
 *         description: JCF not found
 */
router.put("/jcfs/:id/reject", rejectJCF);

/**
 * @swagger
 * /api/jcfs/{id}/pdf:
 *   get:
 *     summary: Download Job Completion Certificate PDF
 *     description: Generates and downloads the official Job Completion Certificate PDF. Gated strictly on approved JCF status.
 *     tags: [JCF]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: JCF ID
 *     responses:
 *       200:
 *         description: Job Completion Certificate PDF stream
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: JCF must be approved before downloading certificate PDF
 *       404:
 *         description: JCF not found
 */
router.get("/jcfs/:id/pdf", generateJCFPDF);

export default router;
