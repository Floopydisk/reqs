import express from "express";
import {
  login,
  logout,
  getMe,
  vendorLogin,
  registerVendor,
  emailPasswordLogin,
  startGoogleLogin,
  completeGoogleLogin,
} from "../controllers/auth.controller";
import { protect } from "../middleware/auth.middleware";
import {
  validate,
  validateEmailPasswordLoginInput,
  validateVendorLoginInput,
  validateVendorRegistrationInput,
} from "../middleware/requestValidator.middleware";

const router = express.Router();

/**
 * @swagger
 * /api/auth/email-login:
 *   post:
 *     summary: Sign in with an intranet email and password
 *     description: The browser sends only email and password to this endpoint. Requisite signs a separate server-to-server request to the intranet using X-Requisite-Timestamp, X-Requisite-Nonce, and X-Requisite-Signature; those headers are not part of the browser request shown in Swagger DevTools. Requisite synchronizes the returned staff profile and falls back to stored credentials only for an existing local account when the intranet is unavailable.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: staff@daystarng.org
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful. The JWT is returned in the response and an HTTP-only cookie is set.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, token, user]
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     employeeId:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     email:
 *                       type: string
 *                       format: email
 *                     role:
 *                       type: string
 *                     designation:
 *                       type: string
 *       400:
 *         description: Email or password is missing or invalid
 *       401:
 *         description: Invalid credentials or no matching intranet account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *       403:
 *         description: Intranet or local account is inactive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *       409:
 *         description: Email matches multiple intranet staff accounts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *       502:
 *         description: Intranet profile invalid, authentication failed, or signature rejected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *       503:
 *         description: Intranet is unavailable and this account has never been provisioned locally, or intranet signing is not configured
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 */
router.post(
  "/email-login",
  validate(validateEmailPasswordLoginInput),
  emailPasswordLogin
);

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Start Google sign-in
 *     description: Redirects the browser to Google OpenID Connect. For frontend popup sign-in, pass a frontendOrigin configured in GOOGLE_AUTH_FRONTEND_ORIGINS. Configure GOOGLE_REDIRECT_URI as the absolute URL of /api/auth/google/callback.
 *     tags: [Auth]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: frontendOrigin
 *         required: false
 *         schema:
 *           type: string
 *           format: uri
 *         description: Exact frontend origin; must be allowlisted in GOOGLE_AUTH_FRONTEND_ORIGINS
 *     responses:
 *       302:
 *         description: Redirect to Google for consent and authentication
 *       503:
 *         description: Google authentication is not configured
 */
router.get("/google", startGoogleLogin);

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Complete Google sign-in
 *     description: Google OAuth callback. Verifies the Google identity, looks up and syncs the verified email's staff profile in the intranet, and falls back to an existing local account if the intranet is unavailable.
 *     tags: [Auth]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Authorization code supplied by Google
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *         description: Signed OAuth state issued by the Google sign-in endpoint
 *     responses:
 *       200:
 *         description: Google sign-in successful; returns the authenticated user and JWT
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, data]
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         employeeId:
 *                           type: string
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         email:
 *                           type: string
 *                           format: email
 *                         role:
 *                           type: string
 *                         designation:
 *                           type: string
 *       400:
 *         description: Missing authorization code or invalid/expired state
 *       401:
 *         description: Google identity is unverified, intranet account is inactive, or no matching intranet account exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *       403:
 *         description: Staff account is inactive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *       409:
 *         description: Email matches multiple intranet staff accounts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *       502:
 *         description: Google verification failed, intranet profile is invalid, or request signature was rejected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *       503:
 *         description: Intranet is unavailable and this account has never been provisioned locally
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 */
router.get("/google/callback", completeGoogleLogin);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Employee ID for authentication
 *                 example: "47"
 *               bypass:
 *                 type: string
 *                 description: Optional bypass value; defaults to the configured intranet bypass
 *                 nullable: true
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
