import express from "express";
import { protect } from "../middleware/auth.middleware";
import { authorize } from "../middleware/roleAccess.middleware";
import { UserRole } from "../types/enums";
import { validate } from "../middleware/requestValidator.middleware";
import { body } from "express-validator";
import {
  getVendorCategories,
  getVendorCategory,
  createVendorCategory,
  updateVendorCategory,
  deleteVendorCategory,
  getVendorsByCategory,
} from "../controllers/vendorCategory.controller";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Vendor Categories
 *   description: Vendor category management - All authenticated users can view categories, PM/ADMIN can manage
 */

/**
 * @swagger
 * /api/vendor-categories:
 *   get:
 *     summary: Get all vendor categories
 *     description: Retrieve a list of all vendor categories. All authenticated users can view vendor categories.
 *     tags: [Vendor Categories]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by category name
 *     responses:
 *       200:
 *         description: List of vendor categories
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
 *                         example: IT Hardware
 *                       description:
 *                         type: string
 *                         example: Computer hardware and peripherals
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Not authorized
 */
router.get("/", getVendorCategories);

/**
 * @swagger
 * /api/vendor-categories/{id}:
 *   get:
 *     summary: Get single vendor category
 *     description: Retrieve details of a specific vendor category by ID. All authenticated users can view vendor category details.
 *     tags: [Vendor Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor Category ID
 *     responses:
 *       200:
 *         description: Vendor category data
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
 *                       example: IT Hardware
 *                     description:
 *                       type: string
 *                       example: Computer hardware and peripherals
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Vendor category not found
 */
router.get("/:id", getVendorCategory);

// Apply protection for routes that need authentication
router.use(protect);

/**
 * @swagger
 * /api/vendor-categories:
 *   post:
 *     summary: Create vendor category
 *     description: Create a new vendor category. Only PROCUREMENT_MANAGER and ADMIN can create vendor categories. `POST /api/categories` is a compatibility alias with identical behaviour.
 *     tags: [Vendor Categories]
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
 *             properties:
 *               name:
 *                 type: string
 *                 example: IT Hardware
 *               description:
 *                 type: string
 *                 example: Computer hardware and peripherals
 *     responses:
 *       201:
 *         description: Vendor category created
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
 *                       example: IT Hardware
 *                     description:
 *                       type: string
 *                       example: Computer hardware and peripherals
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 */
router.post(
  "/",
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PROCUREMENT_MANAGER),
  validate([body("name").notEmpty().withMessage("Name is required")]),
  createVendorCategory
);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a vendor category (compatibility alias)
 *     description: Alias for `POST /api/vendor-categories`, intended for inline category creation. It applies the same PM/admin authorization and trimmed, case-insensitive uniqueness validation.
 *     tags: [Vendor Categories]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: IT Hardware }
 *               description: { type: string, example: Computers and peripherals }
 *     responses:
 *       201: { description: Vendor category created }
 *       400: { description: Missing or duplicate category name }
 *       403: { description: Only PM or administrator roles may create categories }
 */

/**
 * @swagger
 * /api/vendor-categories/{id}:
 *   put:
 *     summary: Update vendor category
 *     description: Update a vendor category by ID. Only PROCUREMENT_MANAGER and ADMIN can update vendor categories.
 *     tags: [Vendor Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: IT Hardware and Software
 *               description:
 *                 type: string
 *                 example: Computer hardware, software, and peripherals
 *     responses:
 *       200:
 *         description: Vendor category updated
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
 *                       example: IT Hardware and Software
 *                     description:
 *                       type: string
 *                       example: Computer hardware, software, and peripherals
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vendor category not found
 */
router.put(
  "/:id",
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PROCUREMENT_MANAGER),
  updateVendorCategory
);

/**
 * @swagger
 * /api/vendor-categories/{id}:
 *   delete:
 *     summary: Delete vendor category
 *     description: Delete a vendor category by ID. Only ADMIN can delete vendor categories. Cannot delete categories with associated vendors.
 *     tags: [Vendor Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor Category ID
 *     responses:
 *       200:
 *         description: Vendor category deleted
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
 *         description: Cannot delete category with associated vendors or requisitions
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vendor category not found
 */
router.delete("/:id", authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), deleteVendorCategory);

/**
 * @swagger
 * /api/vendor-categories/{id}/vendors:
 *   get:
 *     summary: Get vendors by category
 *     description: Retrieve a list of vendors in a specific category. All authenticated users can view vendors by category.
 *     tags: [Vendor Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor Category ID
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
 *         name: verified
 *         schema:
 *           type: boolean
 *         description: Filter by verification status
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of vendors in the category
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
 *                       isVerified:
 *                         type: boolean
 *                         example: true
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Vendor category not found
 */
router.get("/:id/vendors", getVendorsByCategory);

export default router;
