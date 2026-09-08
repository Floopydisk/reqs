import { Request, Response, NextFunction } from "express";
import Comment from "../models/comment.model";
import Requisition from "../models/requisition.model";
import { UserRole, RequisitionStatus } from "../types/enums";
import User from "../models/user.model";
import { notifyUsers } from "../utils/notification";
import { createError } from "../utils/httpError";
import mongoose from "mongoose";

// @desc    Add a comment to a requisition
// @route   POST /api/requisitions/:requisitionId/comments
// @access  Private
export const addComment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { text, parentComment, taggedUsers } = req.body;
    const { requisitionId } = req.params;
    const requisitionIdParam = Array.isArray(requisitionId)
      ? requisitionId[0]
      : requisitionId;

    if (!requisitionIdParam) {
      return next(createError(400, "Missing requisition ID"));
    }

    const parent =
      await Requisition.findById(requisitionIdParam).populate("department");

    if (!parent) {
      return next(createError(404, "Requisition not found"));
    }

    // Access control for requisition comments
    const requisition = parent;
    const { status, requester, department } = requisition;
    const { _id: userId, role, department: userDepartment } = req.user as any;

    const isRequester = requester.toString() === userId.toString();
    const isDepartmentHead =
      role === UserRole.DEPARTMENT_HEAD &&
      ((userDepartment &&
        userDepartment.toString() === department.toString()) ||
        ((department as any)?.head &&
          (department as any).head.toString() === userId.toString()));
    const isProcurementManager = role === UserRole.PROCUREMENT_MANAGER;
    const isHrApprover = role === UserRole.HR_APPROVER;
    const isAccountsApprover = role === UserRole.ACCOUNTS_APPROVER;
    const isHhra = role === UserRole.HHRA;
    const isSeniorManagement = role === UserRole.SENIOR_MANAGEMENT;

    let canComment = false;

    switch (status) {
      case RequisitionStatus.DRAFT:
        canComment = isRequester;
        break;
      case RequisitionStatus.SUBMITTED:
        canComment = isRequester || isDepartmentHead;
        break;
      case RequisitionStatus.DEPARTMENT_APPROVED:
        canComment = isDepartmentHead || isProcurementManager;
        break;
      case RequisitionStatus.DEPARTMENT_REJECTED:
        canComment = isRequester || isDepartmentHead;
        break;
      case RequisitionStatus.PROCUREMENT_REVIEW:
        canComment = isDepartmentHead || isProcurementManager;
        break;
      case RequisitionStatus.VENDOR_BIDDING:
        canComment = isProcurementManager;
        break;
      case RequisitionStatus.HR_REVIEW:
        canComment = isProcurementManager || isHrApprover || isHhra;
        break;
      case RequisitionStatus.HR_APPROVED:
        canComment = isHrApprover || isAccountsApprover || isHhra;
        break;
      case RequisitionStatus.HR_REJECTED:
        canComment = isProcurementManager || isHrApprover || isHhra;
        break;
      // Consolidated HHRA-specific statuses
      case RequisitionStatus.HHRA_REVIEW:
        canComment = isProcurementManager || isHhra;
        break;
      case RequisitionStatus.HHRA_APPROVED:
        canComment = isHhra || isAccountsApprover;
        break;
      case RequisitionStatus.HHRA_REJECTED:
        canComment = isProcurementManager || isHhra;
        break;
      case RequisitionStatus.ACCOUNTS_REVIEW:
        canComment = isHrApprover || isAccountsApprover;
        break;
      case RequisitionStatus.ACCOUNTS_APPROVED:
        canComment = isAccountsApprover || isSeniorManagement;
        break;
      case RequisitionStatus.ACCOUNTS_REJECTED:
        canComment = isHrApprover || isAccountsApprover;
        break;
      case RequisitionStatus.NEGOTIATION:
        canComment = isProcurementManager || isSeniorManagement;
        break;
      case RequisitionStatus.PO_GENERATED:
        canComment =
          isProcurementManager || isSeniorManagement || isAccountsApprover;
        break;
      default:
        canComment = false;
    }

    if (!canComment) {
      return next(
        createError(
          403,
          "Not authorized to comment on this requisition at its current status",
        ),
      );
    }

    // Validate parentComment (if provided) belongs to same parent and not deleted
    let parentCommentDoc: any = null;
    if (parentComment) {
      // First validate if it's a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(parentComment)) {
        return next(createError(400, "Invalid parent comment ID format"));
      }

      parentCommentDoc = await Comment.findById(parentComment);
      if (!parentCommentDoc) {
        return next(createError(400, "Parent comment not found"));
      }
      if (parentCommentDoc.isDeleted) {
        return next(createError(400, "Cannot reply to a deleted comment"));
      }
      if (
        parentCommentDoc.requisition?.toString() !==
        requisitionIdParam.toString()
      ) {
        return next(
          createError(
            400,
            "Parent comment does not belong to this requisition",
          ),
        );
      }
    }

    // Sanitize & validate taggedUsers (ensure unique ObjectIds)
    let finalTaggedUsers: string[] = [];
    try {
      if (Array.isArray(taggedUsers)) {
        // Filter out invalid ObjectIds
        finalTaggedUsers = [
          ...new Set(
            taggedUsers
              .filter((id: string) => id && mongoose.Types.ObjectId.isValid(id))
              .map((id: string) => id.toString()),
          ),
        ];
      }

      // Optional: Validate users exist (uncomment if you want to ensure all users exist)
      // To fix TypeScript error, we're now properly annotating the User type
      const existingUsers = await User.find({
        _id: { $in: finalTaggedUsers },
      }).select("_id");
      finalTaggedUsers = existingUsers.map((user) =>
        (user._id as mongoose.Types.ObjectId).toString(),
      );
    } catch (error) {
      console.error("Error processing tagged users:", error);
      finalTaggedUsers = []; // Reset to empty array on error
    }

    const comment = (await Comment.create({
      text,
      author: (req.user as any)._id,
      requisition: requisitionIdParam,
      parentComment: parentCommentDoc ? parentCommentDoc._id : undefined,
      taggedUsers: finalTaggedUsers,
    })) as InstanceType<typeof Comment> & { _id: any };

    // Safely push to parent comments array if it exists on the schema
    try {
      if (parent && Array.isArray((parent as any).comments)) {
        (parent as any).comments.push(comment._id);
        await parent.save();
      }
    } catch (e) {
      // Don't fail comment creation if parent lacks a comments array
      console.warn(
        "Parent document has no comments array; skipping back-reference push",
      );
    }

    // TODO: Implement notification logic for new comments and tagged users

    // Notification hook
    try {
      const actorId = (req.user as any)._id.toString();
      const baseResource = {
        kind: "requisition" as const,
        id: requisitionIdParam,
        commentId: comment._id.toString(),
      };

      if (finalTaggedUsers.length) {
        notifyUsers({
          type: "comment_tagged",
          actorId,
          targetUserIds: finalTaggedUsers.filter((u) => u !== actorId),
          resource: baseResource,
          metadata: { text: comment.text },
        });
      }

      if (parentCommentDoc) {
        const target =
          parentCommentDoc.author.toString() === actorId
            ? []
            : [parentCommentDoc.author.toString()];
        if (target.length) {
          notifyUsers({
            type: "comment_replied",
            actorId,
            targetUserIds: target,
            resource: baseResource,
            metadata: { text: comment.text },
          });
        }
      } else {
        // Root comment – notify tagged only (already handled) OR future watchers logic
        notifyUsers({
          type: "comment_created",
          actorId,
          targetUserIds: [],
          resource: baseResource,
          metadata: { text: comment.text },
        });
      }
    } catch (error) {
      console.error("Error sending notifications:", error);
      // Don't fail the request if notifications fail
    }

    res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all comments for a requisition
// @route   GET /api/requisitions/:requisitionId/comments
// @access  Private
export const getComments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { requisitionId } = req.params;
    const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt((req.query.limit as string) || "20", 10), 1),
      100,
    );
    const sortDir =
      ((req.query.sort as string) || "asc").toLowerCase() === "desc" ? -1 : 1;
    const depth = Math.min(
      Math.max(parseInt((req.query.depth as string) || "3", 10), 0),
      10,
    ); // safety bounds
    const includeDeleted = (req.query.includeDeleted as string) === "true";

    if (!requisitionId) {
      return next(createError(400, "Missing requisition ID"));
    }

    const parent =
      await Requisition.findById(requisitionId).populate("department"); // Populate department to access department head info

    if (!parent) {
      return next(createError(404, "Requisition not found"));
    }

    // Access control for requisition comments
    const requisition = parent;
    const { status, requester, department } = requisition;
    const { _id: userId, role, department: userDepartment } = req.user as any;

    const isRequester = requester.toString() === userId.toString();
    // A department head can view comments if either:
    // 1. They are the head of this department, or
    // 2. This requisition is from their department
    const isDepartmentHead =
      role === UserRole.DEPARTMENT_HEAD &&
      ((userDepartment &&
        userDepartment.toString() === department.toString()) ||
        ((department as any) &&
          (department as any).head &&
          (department as any).head.toString() === userId.toString()));
    const isProcurementManager = role === UserRole.PROCUREMENT_MANAGER;
    const isHrApprover = role === UserRole.HR_APPROVER;
    const isAccountsApprover = role === UserRole.ACCOUNTS_APPROVER;
    const isHhra = role === UserRole.HHRA;
    const isSeniorManagement = role === UserRole.SENIOR_MANAGEMENT;

    let canView = false;

    switch (status) {
      case RequisitionStatus.DRAFT:
        canView = isRequester;
        break;
      case RequisitionStatus.SUBMITTED:
        canView = isRequester || isDepartmentHead;
        break;
      case RequisitionStatus.DEPARTMENT_APPROVED:
      case RequisitionStatus.PROCUREMENT_REVIEW:
        canView = isRequester || isDepartmentHead || isProcurementManager;
        break;
      case RequisitionStatus.DEPARTMENT_REJECTED:
        canView = isRequester || isDepartmentHead;
        break;
      case RequisitionStatus.VENDOR_BIDDING:
        canView = isProcurementManager;
        break;
      case RequisitionStatus.HR_REVIEW:
      case RequisitionStatus.HR_APPROVED:
      case RequisitionStatus.HR_REJECTED:
        canView =
          isRequester ||
          isDepartmentHead ||
          isProcurementManager ||
          isHrApprover ||
          isHhra;
        break;
      case RequisitionStatus.HHRA_REVIEW:
      case RequisitionStatus.HHRA_APPROVED:
      case RequisitionStatus.HHRA_REJECTED:
        canView =
          isRequester || isDepartmentHead || isProcurementManager || isHhra;
        break;
      case RequisitionStatus.ACCOUNTS_REVIEW:
      case RequisitionStatus.ACCOUNTS_APPROVED:
      case RequisitionStatus.ACCOUNTS_REJECTED:
        canView =
          isRequester ||
          isDepartmentHead ||
          isProcurementManager ||
          isHrApprover ||
          isAccountsApprover;
        break;
      case RequisitionStatus.NEGOTIATION:
      case RequisitionStatus.PO_GENERATED:
      case RequisitionStatus.COMPLETED:
        canView =
          isRequester ||
          isDepartmentHead ||
          isProcurementManager ||
          isHrApprover ||
          isAccountsApprover ||
          isHhra ||
          isSeniorManagement;
        break;
      default:
        canView = isSeniorManagement; // Senior management can view all
    }

    if (!canView)
      return next(
        createError(
          403,
          "Not authorized to view comments for this requisition at its current status",
        ),
      );

    const baseFilter: any = { requisition: requisitionId };
    if (!includeDeleted) baseFilter.isDeleted = { $ne: true };

    // Fetch all comments for this parent (for tree building) - in bigger datasets this can be optimized with pagination per root
    const allComments = await Comment.find(baseFilter)
      .sort({ createdAt: sortDir })
      .lean();

    // Map for quick lookup
    const byId: Record<string, any> = {};
    allComments.forEach((c) => {
      byId[c._id.toString()] = { ...c, replies: [] };
    });

    // Build roots & attach children
    const roots: any[] = [];
    allComments.forEach((c) => {
      if (c.parentComment) {
        const parent = byId[c.parentComment.toString()];
        if (parent) parent.replies.push(byId[c._id.toString()]);
      } else {
        roots.push(byId[c._id.toString()]);
      }
    });

    // Depth limiting (recursive trim)
    const trimDepth = (nodes: any[], currentDepth: number) => {
      if (currentDepth >= depth) {
        nodes.forEach((n) => {
          if (n.replies?.length) n.replies = [];
        });
        return;
      }
      nodes.forEach((n) => trimDepth(n.replies, currentDepth + 1));
    };
    trimDepth(roots, 0);

    // Pagination only at root level
    const totalRoots = roots.length;
    const start = (page - 1) * limit;
    const pagedRoots = roots.slice(start, start + limit);

    // Populate authors & taggedUsers in a post-pass to reduce query explosion
    const userIds = new Set<string>();
    const collectUsers = (nodes: any[]) => {
      nodes.forEach((n) => {
        if (n.author) userIds.add(n.author.toString());
        (n.taggedUsers || []).forEach((u: any) => userIds.add(u.toString()));
        if (n.replies?.length) collectUsers(n.replies);
      });
    };
    collectUsers(pagedRoots);

    // Lightweight user lookup (avoid heavy population logic here)
    // To avoid circular import issues, require on demand
    const users = await User.find({ _id: { $in: Array.from(userIds) } })
      .select("firstName lastName email")
      .lean();
    const userMap: Record<string, string | any> = {};
    users.forEach((u: any) => {
      userMap[u._id.toString()] = u;
    });

    const attachUserData = (nodes: any[]) => {
      nodes.forEach((n) => {
        if (n.author) n.author = userMap[n.author.toString()] || n.author;
        if (n.taggedUsers?.length)
          n.taggedUsers = n.taggedUsers.map(
            (u: any) => userMap[u.toString()] || u,
          );
        if (n.replies?.length) attachUserData(n.replies);
      });
    };
    attachUserData(pagedRoots);

    res.status(200).json({
      success: true,
      meta: {
        page,
        limit,
        totalRoots,
        totalPages: Math.ceil(totalRoots / limit) || 1,
        depth,
        sort: sortDir === 1 ? "asc" : "desc",
        includeDeleted,
      },
      count: totalRoots,
      data: pagedRoots,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Edit a comment
// @route   PATCH /api/comments/:commentId
// @access  Private (author or admin roles)
export const editComment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { commentId } = req.params;
    const { text, taggedUsers } = req.body;
    const user = req.user as any;

    const comment = await Comment.findById(commentId);
    if (!comment) return next(createError(404, "Comment not found"));
    if (comment.isDeleted)
      return next(createError(400, "Cannot edit a deleted comment"));
    const isAuthor = comment.author.toString() === user._id.toString();
    const adminRoles = [
      UserRole.PROCUREMENT_MANAGER,
      UserRole.SENIOR_MANAGEMENT,
      UserRole.ACCOUNTS_APPROVER,
      UserRole.HR_APPROVER,
      UserRole.HHRA,
      UserRole.DEPARTMENT_HEAD,
    ];
    if (!isAuthor && !adminRoles.includes(user.role))
      return next(createError(403, "Not authorized to edit this comment"));
    if (text) comment.text = text;
    if (Array.isArray(taggedUsers)) {
      const dedup = [
        ...new Set(taggedUsers.map((id: string) => id.toString())),
      ];
      comment.taggedUsers = dedup as any;
    }
    await comment.save();
    res.status(200).json({ success: true, data: comment });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete a comment
// @route   DELETE /api/comments/:commentId
// @access  Private (author or admin roles)
export const deleteComment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { commentId } = req.params;
    const user = req.user as any;

    const comment = await Comment.findById(commentId);
    if (!comment) return next(createError(404, "Comment not found"));
    if (comment.isDeleted)
      return next(createError(400, "Comment already deleted"));
    const isAuthor = comment.author.toString() === user._id.toString();
    const adminRoles = [
      UserRole.PROCUREMENT_MANAGER,
      UserRole.SENIOR_MANAGEMENT,
      UserRole.ACCOUNTS_APPROVER,
      UserRole.HR_APPROVER,
      UserRole.HHRA,
      UserRole.DEPARTMENT_HEAD,
    ];
    if (!isAuthor && !adminRoles.includes(user.role))
      return next(createError(403, "Not authorized to delete this comment"));
    comment.isDeleted = true;
    comment.deletedAt = new Date();
    await comment.save();
    res.status(200).json({ success: true, message: "Comment deleted" });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single comment thread (comment + nested replies)
// @route   GET /api/comments/:commentId/thread
// @access  Private
export const getCommentThread = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { commentId } = req.params;
    const commentIdParam = Array.isArray(commentId) ? commentId[0] : commentId;
    const depth = Math.min(
      Math.max(parseInt((req.query.depth as string) || "3", 10), 0),
      10,
    );
    const includeDeleted = (req.query.includeDeleted as string) === "true";

    const root = await Comment.findById(commentIdParam).lean();
    if (!root) return next(createError(404, "Comment not found"));

    const parentField = root.requisition ? "requisition" : null;
    const parentId = root.requisition?.toString();
    if (!parentField || !parentId)
      return next(
        createError(400, "Comment is not linked to a parent resource"),
      );

    // Load parent for access control - comments now only work with requisitions
    const parent = await Requisition.findById(parentId);
    if (!parent) return next(createError(404, "Requisition not found"));

    // Reuse access rules from getComments
    if (parentField === "requisition") {
      const requisition = parent as any;
      const { status, requester, department } = requisition;
      const { _id: userId, role, department: userDepartment } = req.user as any;
      const isRequester = requester.toString() === userId.toString();
      const isDepartmentHead =
        role === UserRole.DEPARTMENT_HEAD &&
        userDepartment?.toString() === department.toString();
      const isProcurementManager = role === UserRole.PROCUREMENT_MANAGER;
      const isHrApprover = role === UserRole.HR_APPROVER;
      const isAccountsApprover = role === UserRole.ACCOUNTS_APPROVER;
      const isSeniorManagement = role === UserRole.SENIOR_MANAGEMENT;
      let canView = false;
      switch (status) {
        case RequisitionStatus.DRAFT:
          canView = isRequester;
          break;
        case RequisitionStatus.SUBMITTED:
          canView = isRequester || isDepartmentHead;
          break;
        case RequisitionStatus.DEPARTMENT_APPROVED:
        case RequisitionStatus.PROCUREMENT_REVIEW:
          canView = isRequester || isDepartmentHead || isProcurementManager;
          break;
        case RequisitionStatus.DEPARTMENT_REJECTED:
          canView = isRequester || isDepartmentHead;
          break;
        case RequisitionStatus.VENDOR_BIDDING:
          canView = isProcurementManager;
          break;
        case RequisitionStatus.HR_REVIEW:
        case RequisitionStatus.HR_APPROVED:
        case RequisitionStatus.HR_REJECTED:
          canView =
            isRequester ||
            isDepartmentHead ||
            isProcurementManager ||
            isHrApprover;
          break;
        case RequisitionStatus.ACCOUNTS_REVIEW:
        case RequisitionStatus.ACCOUNTS_APPROVED:
        case RequisitionStatus.ACCOUNTS_REJECTED:
          canView =
            isRequester ||
            isDepartmentHead ||
            isProcurementManager ||
            isHrApprover ||
            isAccountsApprover;
          break;
        case RequisitionStatus.NEGOTIATION:
        case RequisitionStatus.PO_GENERATED:
        case RequisitionStatus.COMPLETED:
          canView =
            isRequester ||
            isDepartmentHead ||
            isProcurementManager ||
            isHrApprover ||
            isAccountsApprover ||
            isSeniorManagement;
          break;
        default:
          canView = isSeniorManagement;
      }
      if (!canView)
        return next(
          createError(
            403,
            "Not authorized to view this thread at its current status",
          ),
        );
    } else {
      const allowedRoles: string[] = [
        // UserRole.VENDOR, // DEPRECATED: Vendor role removed
        UserRole.PROCUREMENT_MANAGER, // Primary role now consolidating FINANCE_MANAGER, INVENTORY_MANAGER, SENIOR_MANAGEMENT
        UserRole.HR_APPROVER,
        UserRole.HHRA,
        // The following roles are kept for backward compatibility
        UserRole.FINANCE_MANAGER, // @deprecated - now consolidated with PROCUREMENT_MANAGER
        UserRole.INVENTORY_MANAGER, // @deprecated - now consolidated with PROCUREMENT_MANAGER
        UserRole.SENIOR_MANAGEMENT, // @nullified - now consolidated with PROCUREMENT_MANAGER
      ];
      if (!allowedRoles.includes((req.user as any).role))
        return next(createError(403, "Not authorized to view this thread"));
    }

    // Fetch all comments for that parent to build tree, then return subtree rooted at commentId
    const baseFilter: any = { [parentField]: parentId };
    if (!includeDeleted) baseFilter.isDeleted = { $ne: true };
    const all = await Comment.find(baseFilter).sort({ createdAt: 1 }).lean();
    const map: Record<string, any> = {};
    all.forEach((c) => {
      map[c._id.toString()] = { ...c, replies: [] };
    });
    all.forEach((c) => {
      if (c.parentComment) {
        const p = map[c.parentComment.toString()];
        if (p) p.replies.push(map[c._id.toString()]);
      }
    });
    const threadRoot = map[commentIdParam];
    if (!threadRoot) return next(createError(404, "Comment not found"));

    // Trim to depth
    const trim = (n: any, d: number) => {
      if (d >= depth) {
        n.replies = [];
        return;
      }
      n.replies.forEach((r: any) => trim(r, d + 1));
    };
    trim(threadRoot, 0);

    // Hydrate users in a pass
    const ids = new Set<string>();
    const collect = (n: any) => {
      if (n.author) ids.add(n.author.toString());
      (n.taggedUsers || []).forEach((u: any) => ids.add(u.toString()));
      n.replies.forEach((r: any) => collect(r));
    };
    collect(threadRoot);
    const users = await User.find({ _id: { $in: Array.from(ids) } })
      .select("firstName lastName email")
      .lean();
    const uMap: Record<string, any> = {};
    users.forEach((u) => (uMap[u._id.toString()] = u));
    const hydrate = (n: any) => {
      if (n.author) n.author = uMap[n.author.toString()] || n.author;
      if (n.taggedUsers?.length)
        n.taggedUsers = n.taggedUsers.map((u: any) => uMap[u.toString()] || u);
      n.replies.forEach((r: any) => hydrate(r));
    };
    hydrate(threadRoot);

    res.status(200).json({ success: true, data: threadRoot });
  } catch (error) {
    next(error);
  }
};
