import express from "express";
import {
  getVendors,
  getVendor,
  createVendor,
  updateVendor,
  deleteVendor,
  uploadCACDocument,
  deleteCACDocument,
  approveAndVerifyVendor,
  deactivateVendor,
  activateVendor,
  getVendorPerformance,
  rejectVendor,
} from "../controllers/vendor.controller";
import { protect } from "../middleware/auth.middleware";
import { authorize } from "../middleware/roleAccess.middleware";
import { UserRole } from "../types/enums";
import { upload } from "../middleware/upload.middleware";
// import { validate } from "../middleware/requestValidator.middleware";
// import { body } from "express-validator";

const router = express.Router();

// Apply protection to all routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Vendors
 *   description: Vendor management system for procurement - All authenticated users can view vendors, PM/ADMIN can manage
 */

/**
 * @swagger
 * /api/vendors:
 *   get:
 *     summary: Get all vendors
 *     description: Retrieve a list of all vendors. Can be filtered and paginated. All authenticated users can view vendors.
 *     tags: [Vendors]
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
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: verified
 *         schema:
 *           type: boolean
 *         description: Filter by verification status
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, contact person, or email
 *     responses:
 *       200:
 *         description: List of vendors
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
 *                   example: 10
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 50
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     pages:
 *                       type: integer
 *                       example: 5
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 60d0fe4f5311236168a109ca
 *                       name:
 *                         type: string
 *                         example: ABC Suppliers
 *                       contactPerson:
 *                         type: string
 *                         example: Jane Smith
 *                       email:
 *                         type: string
 *                         example: jane@abcsuppliers.com
 *                       phone:
 *                         type: string
 *                         example: +1234567890
 *                       address:
 *                         type: string
 *                         example: 123 Vendor St, City
 *                       categories:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                               example: 60d0fe4f5311236168a109cb
 *                             name:
 *                               type: string
 *                               example: IT Hardware
 *                       isVerified:
 *                         type: boolean
 *                         example: true
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *                       rating:
 *                         type: number
 *                         example: 4.5
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 */
router.get("/", getVendors);

/**
 * @swagger
 * /api/vendors:
 *   post:
 *     summary: Create vendor
 *     description: Create a new vendor. Only PROCUREMENT_MANAGER and ADMIN can create vendors.
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - contactPerson
 *               - email
 *               - phone
 *               - address
 *               - categories
 *             properties:
 *               name:
 *                 type: string
 *                 example: ABC Suppliers Ltd.
 *               contactPerson:
 *                 type: string
 *                 example: Jane Smith
 *               contactPersonDesignation:
 *                 type: string
 *                 example: Sales Manager
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jane@abcsuppliers.com
 *               phone:
 *                 type: string
 *                 example: +1234567890
 *               address:
 *                 type: string
 *                 example: 123 Vendor St, City, State
 *               website:
 *                 type: string
 *                 example: https://abcsuppliers.com
 *               dateOfIncorporation:
 *                 type: string
 *                 format: date
 *                 example: 2015-01-15
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["60d0fe4f5311236168a109cb"]
 *     responses:
 *       201:
 *         description: Vendor created successfully
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
 *       400:
 *         description: Invalid input or vendor already exists
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden

 * @swagger
 * /api/vendors/{id}:
 *   get:
 *     summary: Get single vendor
 *     description: Retrieve details of a specific vendor by ID. All authenticated users can view vendor details.
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     responses:
 *       200:
 *         description: Vendor data
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
 *                       example: 60d0fe4f5311236168a109ca
 *                     name:
 *                       type: string
 *                       example: ABC Suppliers
 *                     contactPerson:
 *                       type: string
 *                       example: Jane Smith
 *                     email:
 *                       type: string
 *                       example: jane@abcsuppliers.com
 *                     phone:
 *                       type: string
 *                       example: +1234567890
 *                     address:
 *                       type: string
 *                       example: 123 Vendor St, City
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: 60d0fe4f5311236168a109cb
 *                           name:
 *                             type: string
 *                             example: IT Hardware
 *                     documents:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: 60d0fe4f5311236168a109cc
 *                           name:
 *                             type: string
 *                             example: business_license.pdf
 *                           url:
 *                             type: string
 *                             example: https://example.com/documents/business_license.pdf
 *                           uploadedAt:
 *                             type: string
 *                             format: date-time
 *                     isVerified:
 *                       type: boolean
 *                       example: true
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     rating:
 *                       type: number
 *                       example: 4.5
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vendor not found
 */
router.post(
  "/",
  authorize(UserRole.ADMIN, UserRole.PROCUREMENT_MANAGER, UserRole.SUPER_ADMIN),
  createVendor
);

router.get("/:id", getVendor);

/**
 * @swagger
 * /api/vendors/{id}:
 *   put:
 *     summary: Update vendor
 *     description: Update vendor details by ID. Only PROCUREMENT_MANAGER and ADMIN can update vendors.
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: ABC Suppliers
 *               contactPerson:
 *                 type: string
 *                 example: Jane Smith
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jane@abcsuppliers.com
 *               phone:
 *                 type: string
 *                 example: +1234567890
 *               address:
 *                 type: string
 *                 example: 123 Vendor St, City
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["60d0fe4f5311236168a109cb"]
 *               isVerified:
 *                 type: boolean
 *                 example: true
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Vendor updated
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
 *                       example: 60d0fe4f5311236168a109ca
 *                     name:
 *                       type: string
 *                       example: ABC Suppliers
 *                     contactPerson:
 *                       type: string
 *                       example: Jane Smith
 *                     email:
 *                       type: string
 *                       example: jane@abcsuppliers.com
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vendor not found
 */
router.put(
  "/:id",
  authorize(UserRole.ADMIN, UserRole.PROCUREMENT_MANAGER),
  updateVendor
);

/**
 * @swagger
 * /api/vendors/{id}:
 *   delete:
 *     summary: Delete vendor
 *     description: Delete a vendor by ID. Only ADMIN can delete vendors. Cannot delete vendors with existing bids or purchase orders.
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     responses:
 *       200:
 *         description: Vendor deleted
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
 *                   example: {}
 *       400:
 *         description: Cannot delete vendor with existing bids or purchase orders
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vendor not found
 */
router.delete("/:id", authorize(UserRole.ADMIN), deleteVendor);

/**
 * @swagger
 * /api/vendors/{id}/cac-document:
 *   post:
 *     summary: Upload CAC document for vendor
 *     description: Upload Corporate Affairs Commission (CAC) registration document for a vendor. This can be done during or after vendor creation. Only PROCUREMENT_MANAGER and ADMIN can upload CAC documents.
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CAC registration document (PDF, JPG, PNG)
 *     responses:
 *       200:
 *         description: CAC document uploaded successfully
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
 *                   example: CAC document uploaded successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: CAC_Certificate.pdf
 *                     url:
 *                       type: string
 *                       example: https://example.com/cac-documents/certificate.pdf
 *                     uploadedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Please upload a CAC document file
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vendor not found
 */
router.post(
  "/:id/cac-document",
  authorize(UserRole.ADMIN, UserRole.PROCUREMENT_MANAGER),
  upload.single("file"),
  uploadCACDocument
);

/**
 * @swagger
 * /api/vendors/{id}/cac-document:
 *   delete:
 *     summary: Delete CAC document for vendor
 *     description: Remove the CAC registration document from a vendor. Only PROCUREMENT_MANAGER and ADMIN can delete CAC documents.
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     responses:
 *       200:
 *         description: CAC document deleted successfully
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
 *                   example: CAC document deleted successfully
 *                 data:
 *                   type: object
 *                   example: {}
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vendor or CAC document not found
 */
router.delete(
  "/:id/cac-document",
  authorize(UserRole.ADMIN, UserRole.PROCUREMENT_MANAGER),
  deleteCACDocument
);

/**
 * @swagger
 * /api/vendors/{id}/approve:
 *   put:
 *     summary: Approve and verify vendor
 *     description: Approve and verify a vendor in a single step. Sets status to approved, isVerified to true, and isActive to true. Only PROCUREMENT_MANAGER and ADMIN can approve vendors.
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     responses:
 *       200:
 *         description: Vendor approved and verified successfully
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
 *                   example: Vendor approved and verified successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 60d0fe4f5311236168a109ca
 *                     isVerified:
 *                       type: boolean
 *                       example: true
 *                     status:
 *                       type: string
 *                       example: approved
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vendor not found
 */
router.put(
  "/:id/approve",
  authorize(UserRole.HEAD_OF_HR, UserRole.HHRA, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  approveAndVerifyVendor
);

/**
 * @swagger
 * /api/vendors/{id}/deactivate:
 *   put:
 *     summary: Deactivate vendor
 *     description: Deactivate a vendor. Sets isActive to false. Only Head of HR and Admin can deactivate vendors.
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     responses:
 *       200:
 *         description: Vendor deactivated
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
 *                       example: 60d0fe4f5311236168a109ca
 *                     isActive:
 *                       type: boolean
 *                       example: false
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vendor not found
 */
router.put(
  "/:id/deactivate",
  authorize(UserRole.HEAD_OF_HR, UserRole.HHRA, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  deactivateVendor
);

/**
 * @swagger
 * /api/vendors/{id}/activate:
 *   put:
 *     summary: Activate vendor
 *     description: Activate a vendor. Sets isActive to true. Only Head of HR and Admin can activate vendors.
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     responses:
 *       200:
 *         description: Vendor activated
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
 *                       example: 60d0fe4f5311236168a109ca
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vendor not found
 */
router.put(
  "/:id/activate",
  authorize(UserRole.HEAD_OF_HR, UserRole.HHRA, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  activateVendor
);

/**
 * @swagger
 * /api/vendors/{id}/performance:
 *   get:
 *     summary: Get vendor performance
 *     description: Get performance metrics for a vendor including bid performance, purchase order fulfillment, delivery metrics, and business statistics. Only PROCUREMENT_MANAGER and ADMIN can view vendor performance.
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for performance metrics (default is 12 months ago)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for performance metrics (default is today)
 *     responses:
 *       200:
 *         description: Vendor performance metrics
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
 *                     bidPerformance:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 20
 *                         selected:
 *                           type: integer
 *                           example: 5
 *                         shortlisted:
 *                           type: integer
 *                           example: 10
 *                         rejected:
 *                           type: integer
 *                           example: 5
 *                         winRate:
 *                           type: number
 *                           example: 25
 *                     purchaseOrderPerformance:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 5
 *                         fulfilled:
 *                           type: integer
 *                           example: 4
 *                         cancelled:
 *                           type: integer
 *                           example: 1
 *                         fulfillmentRate:
 *                           type: number
 *                           example: 80
 *                     deliveryPerformance:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 4
 *                         onTime:
 *                           type: integer
 *                           example: 3
 *                         onTimeRate:
 *                           type: number
 *                           example: 75
 *                         qualityRating:
 *                           type: number
 *                           example: 4.5
 *                     businessMetrics:
 *                       type: object
 *                       properties:
 *                         totalValue:
 *                           type: number
 *                           example: 50000
 *                         averageOrderValue:
 *                           type: number
 *                           example: 10000
 *                     dateRange:
 *                       type: object
 *                       properties:
 *                         start:
 *                           type: string
 *                           format: date-time
 *                         end:
 *                           type: string
 *                           format: date-time
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vendor not found
 */
router.get(
  "/:id/performance",
  authorize(UserRole.ADMIN, UserRole.PROCUREMENT_MANAGER),
  getVendorPerformance
);

// Endpoint consolidated with the new approveAndVerifyVendor endpoint above

/**
 * @swagger
 * /api/vendors/{id}/reject:
 *   put:
 *     summary: Reject a vendor registration
 *     description: Reject a vendor registration. Sets status to rejected and isActive to false. Only applies to pending vendors. Only PROCUREMENT_MANAGER and ADMIN can reject vendors.
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
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
 *                 description: Reason for rejection
 *     responses:
 *       200:
 *         description: Vendor rejected successfully
 *       400:
 *         description: Vendor not found or already processed
 *       403:
 *         description: Not authorized
 */
router.put(
  "/:id/reject",
  authorize(UserRole.HEAD_OF_HR, UserRole.HHRA, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  rejectVendor
);

export default router;
