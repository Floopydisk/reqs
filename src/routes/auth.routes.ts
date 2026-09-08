import express from "express";
import {
  login,
  logout,
  getMe,
  vendorLogin,
  registerVendor,
} from "../controllers/auth.controller";
import { protect } from "../middleware/auth.middleware";
import {
  validate,
  validateVendorLoginInput,
  validateVendorRegistrationInput,
} from "../middleware/requestValidator.middleware";

const router = express.Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - bypass
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Employee ID for authentication
 *                 example: "47"
 *               bypass:
 *                 type: string
 *                 description: Bypass value for authentication
 *                 example: "iGNOre"
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", login);

/**
 * @swagger
 * /api/auth/logout:
 *   get:
 *     summary: Logout user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.get("/logout", logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *       401:
 *         description: Not authorized
 */
router.get("/me", protect, getMe);

/**
 * @swagger
 * /api/auth/vendor-login:
 *   post:
 *     summary: Vendor login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Vendor's email address
 *                 example: "vendor@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Vendor's password
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 */
router.post("/vendor-login", validate(validateVendorLoginInput), vendorLogin);

/**
 * @swagger
 * /api/auth/vendor/register:
 *   post:
 *     summary: Register a new vendor
 *     description: Register a new vendor company with complete information. After registration, vendors can upload their CAC document using the CAC document upload endpoint.
 *     tags: [Auth]
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
 *               - password
 *               - categories
 *             properties:
 *               name:
 *                 type: string
 *                 description: Company name
 *                 example: "ABC Trading Company Ltd"
 *               contactPerson:
 *                 type: string
 *                 description: Full name of the contact person
 *                 example: "John Doe"
 *               contactPersonDesignation:
 *                 type: string
 *                 description: Role/designation of the contact person in the company
 *                 example: "Managing Director"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Company email address
 *                 example: "contact@abctrading.com"
 *               phone:
 *                 type: string
 *                 description: Company phone number
 *                 example: "+234 800 123 4567"
 *               address:
 *                 type: string
 *                 description: Company physical address
 *                 example: "123 Main Street, Lagos, Nigeria"
 *               website:
 *                 type: string
 *                 format: uri
 *                 description: Company website URL (optional)
 *                 example: "https://www.abctrading.com"
 *               dateOfIncorporation:
 *                 type: string
 *                 format: date
 *                 description: Date the company was incorporated (optional)
 *                 example: "2020-01-15"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Password (min 8 characters, must contain uppercase, lowercase, and number)
 *                 example: "SecurePass123"
 *               categories:
 *                 type: array
 *                 description: Array of business category IDs (at least one required)
 *                 items:
 *                   type: string
 *                 example: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
 *     responses:
 *       201:
 *         description: Vendor registered successfully, pending approval
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
 *                   example: "Vendor registered successfully. Your account is pending approval. You can upload your CAC document using the document upload endpoint."
 *                 data:
 *                   type: object
 *                   properties:
 *                     vendorId:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439011"
 *                     email:
 *                       type: string
 *                       example: "contact@abctrading.com"
 *                     status:
 *                       type: string
 *                       example: "pending"
 *       400:
 *         description: Validation error or user/vendor already exists
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
 */
router.post(
  "/vendor/register",
  validate(validateVendorRegistrationInput),
  registerVendor
);

export default router;
