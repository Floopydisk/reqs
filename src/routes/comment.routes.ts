import express from "express";
import {
  addComment,
  getComments,
  editComment,
  deleteComment,
  getCommentThread,
} from "../controllers/comment.controller";
import { protect } from "../middleware/auth.middleware";
import { validate } from "../middleware/requestValidator.middleware";
import { body } from "express-validator";

const router = express.Router({ mergeParams: true });

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Comment management for requisitions
 */

/**
 * @swagger
 * /api/requisitions/{requisitionId}/comments:
 *   post:
 *     summary: Add a comment to a requisition
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requisitionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the requisition to comment on
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *               parentComment:
 *                 type: string
 *               taggedUsers:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Comment added successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Requisition not found
 */
router.post(
  "/",
  validate([body("text").notEmpty().withMessage("Comment text is required")]),
  addComment
);

/**
 * @swagger
 * /api/requisitions/{requisitionId}/comments:
 *   get:
 *     summary: Get all comments for a requisition
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requisitionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the requisition
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for root-level comments
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Comments per page (root level)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order by creation time
 *       - in: query
 *         name: depth
 *         schema:
 *           type: integer
 *           default: 3
 *         description: Maximum nested reply depth to return
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include soft-deleted comments
 *     responses:
 *       200:
 *         description: A list of comments
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Requisition not found
 */
router.get("/", getComments);

/**
 * @swagger
 * /api/comments/{commentId}:
 *   patch:
 *     summary: Edit a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the comment to edit
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *               taggedUsers:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Comment updated
 *       400:
 *         description: Invalid input or deleted comment
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Comment not found
 *   delete:
 *     summary: Soft delete a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the comment to delete
 *     responses:
 *       200:
 *         description: Comment deleted
 *       400:
 *         description: Already deleted
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Comment not found
 */
router.patch("/:commentId", editComment);
router.delete("/:commentId", deleteComment);

/**
 * @swagger
 * /api/comments/{commentId}/thread:
 *   get:
 *     summary: Get a single comment thread with nested replies
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the root comment
 *       - in: query
 *         name: depth
 *         schema:
 *           type: integer
 *           default: 3
 *         description: Maximum nested reply depth to return
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include soft-deleted comments
 *     responses:
 *       200:
 *         description: Comment thread
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.get("/:commentId/thread", getCommentThread);
export default router;
