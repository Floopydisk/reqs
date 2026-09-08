import express from "express";
import {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentMembers,
  addDepartmentMember,
  removeDepartmentMember,
  getDepartmentStatistics,
} from "../controllers/department.controller";
import { protect } from "../middleware/auth.middleware";
import { authorize } from "../middleware/roleAccess.middleware";
import { UserRole } from "../types/enums";
import { validate } from "../middleware/requestValidator.middleware";
import { body } from "express-validator";
import requisitionRouter from "./departmentRequisition.routes";

const router = express.Router();

// Apply protection to all routes
router.use(protect);

// Nested requisition routes
router.use("/:departmentId/requisitions", requisitionRouter);

/**
 * @swagger
 * tags:
 *   name: Departments
 *   description: Department management
 */

/**
 * @swagger
 * /api/departments:
 *   get:
 *     summary: Get all departments
 *     description: Retrieve a list of all departments. Can be filtered and paginated.
 *     tags: [Departments]
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
 *         description: Search by department name
 *     responses:
 *       200:
 *         description: List of departments
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
 *                         example: IT Department
 *                       code:
 *                         type: string
 *                         example: IT
 *                       description:
 *                         type: string
 *                         example: Information Technology Department
 *                       head:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: 60d0fe4f5311236168a109cb
 *                           firstName:
 *                             type: string
 *                             example: John
 *                           lastName:
 *                             type: string
 *                             example: Doe
 *                           email:
 *                             type: string
 *                             example: john.doe@example.com
 *                       members:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                               example: 60d0fe4f5311236168a109cc
 *                             firstName:
 *                               type: string
 *                               example: Jane
 *                             lastName:
 *                               type: string
 *                               example: Smith
 *                             email:
 *                               type: string
 *                               example: jane.smith@example.com
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
router.get(
  "/",
  authorize(
    UserRole.ADMIN,
    UserRole.PROCUREMENT_MANAGER, // Consolidated role
    UserRole.SENIOR_MANAGEMENT // @nullified - now consolidated with PROCUREMENT_MANAGER
  ),
  getDepartments
);

/**
 * @swagger
 * /api/departments/{id}:
 *   get:
 *     summary: Get single department
 *     description: Retrieve details of a specific department by ID
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Department ID
 *     responses:
 *       200:
 *         description: Department data
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
 *                       example: IT Department
 *                     code:
 *                       type: string
 *                       example: IT
 *                     description:
 *                       type: string
 *                       example: Information Technology Department
 *                     head:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: 60d0fe4f5311236168a109cb
 *                         firstName:
 *                           type: string
 *                           example: John
 *                         lastName:
 *                           type: string
 *                           example: Doe
 *                         email:
 *                           type: string
 *                           example: john.doe@example.com
 *                     members:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: 60d0fe4f5311236168a109cc
 *                           firstName:
 *                             type: string
 *                             example: Jane
 *                           lastName:
 *                             type: string
 *                             example: Smith
 *                           email:
 *                             type: string
 *                             example: jane.smith@example.com
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
 *         description: Department not found
 */
router.get("/:id", getDepartment);

/**
 * @swagger
 * /api/departments:
 *   post:
 *     summary: Create department
 *     description: Create a new department with specified details
 *     tags: [Departments]
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
 *               - code
 *               - head
 *             properties:
 *               name:
 *                 type: string
 *                 example: IT Department
 *               code:
 *                 type: string
 *                 example: IT
 *               description:
 *                 type: string
 *                 example: Information Technology Department
 *               head:
 *                 type: string
 *                 example: 60d0fe4f5311236168a109cb
 *               members:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["60d0fe4f5311236168a109cc", "60d0fe4f5311236168a109cd"]
 *     responses:
 *       201:
 *         description: Department created
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
 *                       example: IT Department
 *                     code:
 *                       type: string
 *                       example: IT
 *                     description:
 *                       type: string
 *                       example: Information Technology Department
 *                     head:
 *                       type: string
 *                       example: 60d0fe4f5311236168a109cb
 *                     members:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["60d0fe4f5311236168a109cc", "60d0fe4f5311236168a109cd"]
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 */
router.post(
  "/",
  authorize(UserRole.ADMIN),
  validate([
    body("name").notEmpty().withMessage("Name is required"),
    body("code").notEmpty().withMessage("Code is required"),
    body("head").notEmpty().withMessage("Department head is required"),
  ]),
  createDepartment
);

/**
 * @swagger
 * /api/departments/{id}:
 *   put:
 *     summary: Update department
 *     description: Update department details by ID
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Department ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: IT Department
 *               code:
 *                 type: string
 *                 example: IT
 *               description:
 *                 type: string
 *                 example: Information Technology Department
 *               head:
 *                 type: string
 *                 example: 60d0fe4f5311236168a109cb
 *               members:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["60d0fe4f5311236168a109cc", "60d0fe4f5311236168a109cd"]
 *     responses:
 *       200:
 *         description: Department updated
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
 *                       example: IT Department
 *                     code:
 *                       type: string
 *                       example: IT
 *                     description:
 *                       type: string
 *                       example: Information Technology Department
 *                     head:
 *                       type: string
 *                       example: 60d0fe4f5311236168a109cb
 *                     members:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["60d0fe4f5311236168a109cc", "60d0fe4f5311236168a109cd"]
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Department not found
 */
router.put("/:id", authorize(UserRole.ADMIN), updateDepartment);

/**
 * @swagger
 * /api/departments/{id}:
 *   delete:
 *     summary: Delete department
 *     description: Delete a department by ID
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Department ID
 *     responses:
 *       200:
 *         description: Department deleted
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
 *         description: Cannot delete department with existing requisitions
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Department not found
 */
router.delete("/:id", authorize(UserRole.ADMIN), deleteDepartment);

/**
 * @swagger
 * /api/departments/{id}/members:
 *   get:
 *     summary: Get department members
 *     description: Retrieve a list of all members in a department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Department ID
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
 *         description: Search by name or email
 *     responses:
 *       200:
 *         description: List of department members
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
 *                         example: 60d0fe4f5311236168a109cc
 *                       firstName:
 *                         type: string
 *                         example: Jane
 *                       lastName:
 *                         type: string
 *                         example: Smith
 *                       email:
 *                         type: string
 *                         example: jane.smith@example.com
 *                       role:
 *                         type: string
 *                         example: staff
 *                       profileImage:
 *                         type: string
 *                         example: https://example.com/profile.jpg
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Department not found
 */
router.get("/:id/members", getDepartmentMembers);

/**
 * @swagger
 * /api/departments/{id}/members:
 *   post:
 *     summary: Add member to department
 *     description: Add a user as a member to a department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Department ID
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
 *                 example: 60d0fe4f5311236168a109cc
 *     responses:
 *       200:
 *         description: Member added to department
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
 *                     members:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["60d0fe4f5311236168a109cc", "60d0fe4f5311236168a109cd"]
 *       400:
 *         description: User is already a member of this department
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Department or user not found
 */
router.post(
  "/:id/members",
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  validate([body("userId").notEmpty().withMessage("User ID is required")]),
  addDepartmentMember
);

/**
 * @swagger
 * /api/departments/{id}/members/{userId}:
 *   delete:
 *     summary: Remove member from department
 *     description: Remove a user from a department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Department ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Member removed from department
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
 *                     members:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["60d0fe4f5311236168a109cd"]
 *       400:
 *         description: User is not a member of this department or cannot remove department head
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Department or user not found
 */
router.delete(
  "/:id/members/:userId",
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  removeDepartmentMember
);

/**
 * @swagger
 * /api/departments/{id}/statistics:
 *   get:
 *     summary: Get department statistics
 *     description: Retrieve statistics for a department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Department ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics (default is 30 days ago)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics (default is today)
 *     responses:
 *       200:
 *         description: Department statistics
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
 *                     requisitions:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 20
 *                         approved:
 *                           type: integer
 *                           example: 15
 *                         rejected:
 *                           type: integer
 *                           example: 3
 *                         pending:
 *                           type: integer
 *                           example: 2
 *                         completed:
 *                           type: integer
 *                           example: 10
 *                     spending:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                           example: 50000
 *                         average:
 *                           type: number
 *                           example: 2500
 *                     members:
 *                       type: integer
 *                       example: 10
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
 *         description: Department not found
 */
router.get(
  "/:id/statistics",
  authorize(
    UserRole.ADMIN,
    UserRole.PROCUREMENT_MANAGER, // Consolidated role
    UserRole.SENIOR_MANAGEMENT, // @nullified - now consolidated with PROCUREMENT_MANAGER
    UserRole.DEPARTMENT_HEAD
  ),
  getDepartmentStatistics
);

export default router;
