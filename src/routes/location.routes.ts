import express from "express";
import {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} from "../controllers/location.controller";
import { protect, authorize } from "../middleware/auth.middleware";
import { UserRole } from "../types/enums";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Locations
 *   description: Location management
 */

/**
 * @swagger
 * /api/locations:
 *   get:
 *     summary: Get all locations
 *     description: Retrieve a list of all locations
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of locations
 *       401:
 *         description: Not authorized
 */
router.get("/", protect, getLocations);

/**
 * @swagger
 * /api/locations:
 *   post:
 *     summary: Create a location
 *     description: Create a new location
 *     tags: [Locations]
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
 *                 example: Main Campus
 *               address:
 *                 type: string
 *                 example: 123 University Ave
 *               contactPerson:
 *                 type: string
 *                 example: John Doe
 *               phoneNumber:
 *                 type: string
 *                 example: +1234567890
 *               email:
 *                 type: string
 *                 example: contact@university.edu
 *     responses:
 *       201:
 *         description: Location created
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authorized
 */
router.post(
  "/",
  protect,
  authorize(UserRole.PROCUREMENT_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  createLocation
);

/**
 * @swagger
 * /api/locations/{id}:
 *   put:
 *     summary: Update a location
 *     description: Update details of an existing location
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               contactPerson:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Location updated
 *       404:
 *         description: Location not found
 */
router.put(
  "/:id",
  protect,
  authorize(UserRole.PROCUREMENT_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  updateLocation
);

/**
 * @swagger
 * /api/locations/{id}:
 *   delete:
 *     summary: Delete a location
 *     description: Remove a location by ID
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Location deleted
 *       404:
 *         description: Location not found
 */
router.delete(
  "/:id",
  protect,
  authorize(UserRole.PROCUREMENT_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  deleteLocation
);

export default router;
