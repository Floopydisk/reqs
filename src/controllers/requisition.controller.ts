import { db } from "../db";
import { users, requisitions } from "../db/schema";
import { eq, desc } from "drizzle-orm";
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Request, Response, NextFunction } from "express";
import { ObjectId, isValidObjectId, getUserId } from "../utils/objectIdHelper";
import Requisition from "../models/requisition.model";
import Department from "../models/department.model";
import User from "../models/user.model";
import RequisitionHistory from "../models/requisitionHistory.model";
// import Notification from "../models/notification.model";
import { RequisitionStatus, UserRole, ItemStatus, RequisitionUrgency } from "../types/enums";
import { uploadToS3 } from "../utils/fileUpload";
import emailService from "../utils/emailService";
import requisitionHistoryModel from "../models/requisitionHistory.model";
import {
  notifications,
  // notifyUsers
} from "../utils/notification";
import {
  notifyRequisitionCreated,
  notifyRequisitionSubmitted,
  notifyDepartmentApproval,
  notifyDepartmentRejection,
  notifyRequisitionUpdated,
  notifyRequisitionDeleted,
} from "../utils/requisitionNotifications";
import Location from "../models/location.model";
import { logItemHistory } from "../utils/itemHistory";
import {
  notifyItemDepartmentApproved,
  notifyItemDepartmentRejected,
  notifyBulkItemAction,
} from "../utils/itemNotifications";
import { updateRequisitionStatusFromItems } from "../utils/requisitionStatusAggregation";

const normalizeObjectId = (value: unknown): string | null => {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof ObjectId) {
    return value.toString();
  }

  if (typeof value === "object") {
    const candidate = value as { _id?: unknown; id?: unknown };
    if (candidate._id) {
      return normalizeObjectId(candidate._id);
    }

    if (candidate.id) {
      return normalizeObjectId(candidate.id);
    }
  }

  if (isValidObjectId(value as any)) {
    return (value as any).toString();
  }

  return null;
};

const collectUploadFiles = (req: Request) => {
  const indexed = new Map<number, Express.Multer.File>();
  const fallback: Express.Multer.File[] = [];
  const preferredFields = new Set([
    "uploadImage",
    "file",
    "attachment",
    "image",
    "document",
  ]);

  if (Array.isArray(req.files)) {
    for (const file of req.files) {
      const match = file.fieldname.match(/^uploadImage_(\d+)$/);
      if (match) {
        const index = Number(match[1]);
        if (!Number.isNaN(index)) {
          indexed.set(index, file);
        }
        continue;
      }

      if (preferredFields.has(file.fieldname)) {
        fallback.push(file);
      }
    }
  } else if (req.files && typeof req.files === "object") {
    for (const field of preferredFields) {
      const fileValue = (req.files as Record<string, Express.Multer.File[]>)[
        field
      ];
      if (Array.isArray(fileValue) && fileValue.length > 0) {
        fallback.push(fileValue[0]);
      }
    }
  }

  if (req.file) {
    fallback.unshift(req.file);
  }

  return { indexed, fallback };
};

const applyUploadedImagesToItems = async (
  req: Request,
  items: Array<{ uploadImage?: string }> | undefined,
): Promise<void> => {
  if (!items || items.length === 0) {
    return;
  }

  const { indexed, fallback } = collectUploadFiles(req);

  if (indexed.size > 0) {
    for (const [index, file] of indexed.entries()) {
      if (!items[index]) {
        continue;
      }

      const uploadedImage = await uploadToS3(file, "requisition-item-images");
      items[index].uploadImage = uploadedImage.url;
    }
    return;
  }

  if (fallback.length > 0) {
    const uploadedImage = await uploadToS3(
      fallback[0],
      "requisition-item-images",
    );
    items[0].uploadImage = uploadedImage.url;
  }
};

// @desc    Get requisitions by user
// @route   GET /api/users/:userId/requisitions
// @access  Private/Admin/Self
export const getRequisitionsByUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId } = req.params;

    // Verify user exists
    const user = await db.query.users.findFirst({ where: eq(users.id, String(userId)) });
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startIndex = (page - 1) * limit;

    // Build query
    const status = req.query.status as string;
    const query: any = { requester: userId };
    if (status) {
      query.status = status;
    }

    // Execute query with pagination
    try {
      const total = await Requisition.countDocuments(query);
      const requisitionsList = await Requisition.find(query)
        .skip(startIndex)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate("department", "name")
        .populate("requester", "firstName lastName email")
        .lean();

      res.status(200).json({
        success: true,
        count: requisitionsList.length,
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit) || 1,
        data: requisitionsList,
      });
      return;
    } catch (e) {
      // Fallback to PostgreSQL
    }

    const pgReqs = await db.query.requisitions.findMany({
      where: eq(requisitions.requesterId, String(userId)),
      with: {
        department: true,
        requester: true,
        items: true,
        approvals: true,
      },
      orderBy: [desc(requisitions.createdAt)],
    });

    let filtered = pgReqs;
    if (status) {
      filtered = filtered.filter((r) => r.status === status);
    }
    const totalPg = filtered.length;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    const data = paginated.map((r) => ({
      _id: r.id,
      requisitionNumber: r.requisitionNumber,
      title: r.title,
      urgency: r.urgency,
      justification: r.justification,
      deliveryLocation: r.deliveryLocationId,
      deliveryDate: r.deliveryDate,
      paymentStatus: r.paymentStatus,
      paymentAmount: r.paymentAmount,
      requester: r.requester
        ? {
            _id: r.requester.id,
            firstName: r.requester.firstName,
            lastName: r.requester.lastName,
            email: r.requester.email,
          }
        : r.requesterId,
      department: r.department
        ? {
            _id: r.department.id,
            name: r.department.name,
            code: r.department.code,
          }
        : r.departmentId,
      status: r.status,
      items:
        r.items?.map((it) => ({
          _id: it.id,
          itemName: it.itemName,
          itemType: it.itemType,
          preferredBrand: it.preferredBrand,
          itemDescription: it.itemDescription,
          uploadImage: it.uploadImage,
          units: it.units,
          UOM: it.UOM,
          status: it.status,
        })) || [],
      approvals:
        r.approvals?.map((ap) => ({
          _id: ap.id,
          stage: ap.stage,
          approver: ap.approverId,
          status: ap.status,
          comments: ap.comments,
          timestamp: ap.timestamp,
        })) || [],
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    res.status(200).json({
      success: true,
      count: data.length,
      total: totalPg,
      currentPage: page,
      totalPages: Math.ceil(totalPg / limit) || 1,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all requisitions
// @route   GET /api/requisitions
// @access  Private
export const getRequisitions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    let query = {};

    // Get filter parameters from query
    const title = req.query.title as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const status = req.query.status as string | string[];
    const category = req.query.category as string;
    const vendorCategory = req.query.vendorCategory as string;
    const minPrice = req.query.minPrice
      ? parseFloat(req.query.minPrice as string)
      : undefined;
    const maxPrice = req.query.maxPrice
      ? parseFloat(req.query.maxPrice as string)
      : undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortOrder = (req.query.sortOrder as string) === "asc" ? 1 : -1;

    // Date range filter
    if (startDate && endDate) {
      query = {
        ...query,
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    } else if (startDate) {
      query = { ...query, createdAt: { $gte: new Date(startDate) } };
    } else if (endDate) {
      query = { ...query, createdAt: { $lte: new Date(endDate) } };
    }

    // Status filter
    if (status) {
      if (Array.isArray(status)) {
        query = { ...query, status: { $in: status } };
      } else {
        query = { ...query, status };
      }
    }

    // Category filter (product or service)
    if (category) {
      query = { ...query, category };
    }

    // Vendor category filter
    if (vendorCategory) {
      query = { ...query, vendorCategory };
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceQuery: any = {};
      if (minPrice !== undefined) {
        priceQuery.$gte = minPrice;
      }
      if (maxPrice !== undefined) {
        priceQuery.$lte = maxPrice;
      }
      query = { ...query, estimatedPrice: priceQuery };
    }

    // Title filter
    if (title) {
      query = { ...query, title: { $regex: title, $options: "i" } };
    }

    // Filter requisitions based on user role
    if (req.user!.role === UserRole.STAFF) {
      // Staff can only see their own requisitions (all statuses including DRAFT)
      query = { ...query, requester: req.user!._id };
    } else if (
      req.user!.role === UserRole.HEAD_OF_FINANCE ||
      req.user!.role === UserRole.HEAD_OF_HR ||
      req.user!.role === UserRole.HR_APPROVER ||
      req.user!.role === UserRole.HHRA ||
      req.user!.role === UserRole.ADMIN ||
      req.user!.role === UserRole.SUPER_ADMIN
    ) {
      // Full platform visibility for HOF, HHR, and Admins (Requirements D1, D3)
    } else if (req.user!.role === UserRole.DEPARTMENT_HEAD) {
      const isFinanceOrHrHOD =
        req.user &&
        req.user.department &&
        (
          ["5", "4", "FIN", "HR"].includes((req.user.department as any).code || "") ||
          ["finance", "accounts", "hr", "human resources"].some(kw => (req.user.department as any).name?.toLowerCase().includes(kw))
        );

      if (!isFinanceOrHrHOD) {
        const userDeptId = normalizeObjectId(req.user!.department);
        query = {
          ...query,
          $or: [
            { requester: req.user!._id },
            { department: userDeptId },
          ],
        };
      }
    } else if (req.user!.role === UserRole.PROCUREMENT_MANAGER) {
      const departmentApprovedAndAbove = [
        RequisitionStatus.DEPARTMENT_APPROVED,
        RequisitionStatus.PROCUREMENT_REVIEW,
        RequisitionStatus.RFQ_GENERATION,
        RequisitionStatus.VENDOR_BIDDING,
        RequisitionStatus.VENDOR_ASSIGNED,
        RequisitionStatus.PO_PENDING_APPROVAL,
        RequisitionStatus.PO_APPROVED,
        RequisitionStatus.HHRA_REVIEW,
        RequisitionStatus.HHRA_APPROVED,
        RequisitionStatus.HHRA_REJECTED,
        RequisitionStatus.NEGOTIATION,
        RequisitionStatus.PO_GENERATED,
        RequisitionStatus.PO_GENERATION,
        RequisitionStatus.VENDOR_ACKNOWLEDGED,
        RequisitionStatus.DELIVERED,
        RequisitionStatus.PARTIALLY_DELIVERED,
        RequisitionStatus.INVENTORY_CONFIRMED,
        RequisitionStatus.DEPARTMENT_CONFIRMED,
        RequisitionStatus.COMPLETED,
        RequisitionStatus.PAID,
        RequisitionStatus.CANCELLED,
      ];

      query = {
        ...query,
        $or: [
          { requester: req.user!._id }, // Their own requisitions (any status)
          { status: { $in: departmentApprovedAndAbove } }, // All requisitions department approved and above
        ],
      };
    }

    if (title) {
      query = { ...query, title: { $regex: title, $options: "i" } };
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Try MongoDB first
    try {
      const total = await Requisition.countDocuments(query);
      const requisitions = await Requisition.find(query)
        .populate("requester", "firstName lastName email")
        .populate("department", "name code")
        .populate("items.recommendedVendor")
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit);

      res.status(200).json({
        success: true,
        data: requisitions,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit) || 1,
        },
      });
      return;
    } catch (e) {
      // Fallback to PostgreSQL
    }

    let allPg = await db.query.requisitions.findMany({
      with: {
        requester: true,
        department: true,
        items: true,
        approvals: true,
      },
      orderBy: [desc(requisitions.createdAt)],
    });

    const currentUserId = String(req.user?._id || req.user?.id || "");
    const currentUserRole = req.user?.role;

    if (currentUserRole === UserRole.STAFF) {
      allPg = allPg.filter((r) => r.requesterId === currentUserId);
    } else if (currentUserRole === UserRole.DEPARTMENT_HEAD) {
      const userDeptId = normalizeObjectId(req.user?.department);
      allPg = allPg.filter(
        (r) =>
          r.requesterId === currentUserId ||
          (userDeptId && r.departmentId === userDeptId),
      );
    }

    if (title) {
      const t = title.toLowerCase();
      allPg = allPg.filter((r) => r.title?.toLowerCase().includes(t));
    }
    if (status) {
      if (Array.isArray(status)) {
        allPg = allPg.filter((r) => status.includes(r.status || ""));
      } else {
        allPg = allPg.filter((r) => r.status === status);
      }
    }

    const totalPg = allPg.length;
    const paginated = allPg.slice(skip, skip + limit);

    const data = paginated.map((r) => ({
      _id: r.id,
      requisitionNumber: r.requisitionNumber,
      title: r.title,
      urgency: r.urgency,
      justification: r.justification,
      deliveryLocation: r.deliveryLocationId,
      deliveryDate: r.deliveryDate,
      paymentStatus: r.paymentStatus,
      paymentAmount: r.paymentAmount,
      requester: r.requester
        ? {
            _id: r.requester.id,
            firstName: r.requester.firstName,
            lastName: r.requester.lastName,
            email: r.requester.email,
          }
        : r.requesterId,
      department: r.department
        ? {
            _id: r.department.id,
            name: r.department.name,
            code: r.department.code,
          }
        : r.departmentId,
      status: r.status,
      items:
        r.items?.map((it) => ({
          _id: it.id,
          itemName: it.itemName,
          itemType: it.itemType,
          preferredBrand: it.preferredBrand,
          itemDescription: it.itemDescription,
          uploadImage: it.uploadImage,
          units: it.units,
          UOM: it.UOM,
          status: it.status,
        })) || [],
      approvals:
        r.approvals?.map((ap) => ({
          _id: ap.id,
          stage: ap.stage,
          approver: ap.approverId,
          status: ap.status,
          comments: ap.comments,
          timestamp: ap.timestamp,
        })) || [],
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    res.status(200).json({
      success: true,
      data,
      pagination: {
        total: totalPg,
        page,
        limit,
        pages: Math.ceil(totalPg / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single requisition
// @route   GET /api/requisitions/:id
// @access  Private
export const getRequisition = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const reqId = String(req.params.id);
    let requisition: any = null;
    try {
      requisition = await Requisition.findById(reqId)
        .populate("requester", "firstName lastName email")
        .populate("department", "name code")
        .populate("items.recommendedVendor")
        .populate("relatedRfqs", "title rfqNumber")
        .populate("relatedPos", "title poNumber")
        .populate({
          // set strictpopulate to false to allow nested populate
          strictPopulate: false,
          path: "bids",
          populate: {
            path: "vendor",
            select: "name contactPerson email",
          },
        })
        .populate({ strictPopulate: false, path: "selectedBid" })
        .populate({ strictPopulate: false, path: "purchaseOrder" })
        .populate({ strictPopulate: false, path: "delivery" });
    } catch (e) {
      // Fallback to PostgreSQL
    }

    if (!requisition) {
      const pgReq = await db.query.requisitions.findFirst({
        where: eq(requisitions.id, reqId),
        with: {
          requester: true,
          department: true,
          items: true,
          approvals: true,
        },
      });

      if (!pgReq) {
        res
          .status(404)
          .json({ success: false, message: "Requisition not found" });
        return;
      }

      requisition = {
        _id: pgReq.id,
        requisitionNumber: pgReq.requisitionNumber,
        title: pgReq.title,
        urgency: pgReq.urgency,
        justification: pgReq.justification,
        deliveryLocation: pgReq.deliveryLocationId,
        deliveryDate: pgReq.deliveryDate,
        paymentStatus: pgReq.paymentStatus,
        paymentAmount: pgReq.paymentAmount,
        paymentDate: pgReq.paymentDate,
        paymentReference: pgReq.paymentReference,
        paymentNotes: pgReq.paymentNotes,
        paymentBy: pgReq.paymentById,
        requester: pgReq.requester
          ? {
              _id: pgReq.requester.id,
              firstName: pgReq.requester.firstName,
              lastName: pgReq.requester.lastName,
              email: pgReq.requester.email,
            }
          : pgReq.requesterId,
        department: pgReq.department
          ? {
              _id: pgReq.department.id,
              name: pgReq.department.name,
              code: pgReq.department.code,
            }
          : pgReq.departmentId,
        status: pgReq.status,
        items:
          pgReq.items?.map((it) => ({
            _id: it.id,
            itemName: it.itemName,
            itemType: it.itemType,
            preferredBrand: it.preferredBrand,
            itemDescription: it.itemDescription,
            uploadImage: it.uploadImage,
            units: it.units,
            UOM: it.UOM,
            status: it.status,
            departmentApprovedBy: it.departmentApprovedById,
            departmentApprovedAt: it.departmentApprovedAt,
            hrApprovedBy: it.hrApprovedById,
            hrApprovedAt: it.hrApprovedAt,
            hhraApprovedBy: it.hhraApprovedById,
            hhraApprovedAt: it.hhraApprovedAt,
          })) || [],
        approvals:
          pgReq.approvals?.map((ap) => ({
            _id: ap.id,
            stage: ap.stage,
            approver: ap.approverId,
            status: ap.status,
            comments: ap.comments,
            timestamp: ap.timestamp,
          })) || [],
        createdAt: pgReq.createdAt,
        updatedAt: pgReq.updatedAt,
      };
    }

    // Check if user has permission to view this requisition
    if (req.user!.role === UserRole.STAFF) {
      const requesterId = normalizeObjectId(requisition.requester);
      const currentUserId = normalizeObjectId(req.user!._id);

      if (requesterId !== currentUserId) {
        res.status(403).json({
          success: false,
          message: "Not authorized to access this requisition",
        });
        return;
      }
    } else if (req.user!.role === UserRole.DEPARTMENT_HEAD) {
      const requesterId = normalizeObjectId(requisition.requester);
      const currentUserId = normalizeObjectId(req.user!._id);
      const requisitionDeptId = normalizeObjectId(requisition.department);
      const userDeptId = normalizeObjectId(req.user!.department);

      const isFinanceOrHrHOD =
        req.user &&
        req.user.department &&
        (
          ["5", "4", "FIN", "HR"].includes((req.user.department as any).code || "") ||
          ["finance", "accounts", "hr", "human resources"].some(kw => (req.user.department as any).name?.toLowerCase().includes(kw))
        );

      if (
        !isFinanceOrHrHOD &&
        requesterId !== currentUserId &&
        requisitionDeptId !== userDeptId
      ) {
        res.status(403).json({
          success: false,
          message: "Not authorized to access this requisition",
        });
        return;
      }
    }

    // DEPRECATED: Vendor role removed
    // if (req.user!.role === UserRole.VENDOR) {
    //   const vendor = await Vendor.findOne({ _id: req.user!.vendor });
    //   if (!vendor) {
    //     res.status(404).json({ success: false, message: "Vendor not found" });
    //     return;
    //   }

    //   // Check if requisition is in vendor's category and in bidding stage
    //   const isInCategory = vendor.categories.some(
    //     (category) =>
    //       category.toString() === requisition.vendorCategory?.toString()
    //   );

    //   if (
    //     !isInCategory &&
    //     requisition.status !== RequisitionStatus.VENDOR_BIDDING
    //   ) {
    //     res.status(403).json({
    //       success: false,
    //       message: "Not authorized to access this requisition",
    //     });
    //     return;
    //   }
    // }

    const departmentName =
      (requisition.department as any)?.name ||
      (requisition.department as any)?.code ||
      "N/A";

    const relatedRequests = [
      {
        _id: requisition._id.toString(),
        title: requisition.title || "Request",
        department: departmentName,
      },
    ];

    const relatedRfqs = Array.isArray((requisition as any).relatedRfqs)
      ? (requisition as any).relatedRfqs.map((item: any) => ({
          _id: item._id?.toString?.() || item.toString(),
          title: item.title || item.rfqNumber || "RFQ",
          department: departmentName,
        }))
      : [];

    const relatedPos = Array.isArray((requisition as any).relatedPos)
      ? (requisition as any).relatedPos.map((item: any) => ({
          _id: item._id?.toString?.() || item.toString(),
          title: item.title || "",
          department: departmentName,
        }))
      : [];

    res.status(200).json({
      success: true,
      data: {
        ...(typeof requisition.toObject === "function"
          ? requisition.toObject()
          : requisition),
        related: {
          requests: relatedRequests,
          rfqs: relatedRfqs,
          pos: relatedPos,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create requisition
// @route   POST /api/requisitions
// @access  Private/Staff
export const createRequisition = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      title,
      urgency,
      justification,
      deliveryLocation,
      deliveryDate,
      departmentId,
      department: reqDepartment,
    } = req.body;

    const { items } = req.body;

    // Manual validation
    const errors: { [key: string]: string } = {};
    if (!title || title.trim() === "") errors.title = "Title is required";
    if (urgency && !Object.values(RequisitionUrgency).includes(urgency as any)) {
      errors.urgency = "Invalid urgency value";
    }
    if (!justification || justification.trim() === "")
      errors.justification = "Justification is required";
    if (!deliveryLocation || String(deliveryLocation).trim() === "")
      errors.deliveryLocation = "Delivery location is required";
    if (!deliveryDate || String(deliveryDate).trim() === "")
      errors.deliveryDate = "Delivery date is required";

    // Department validation (Requirement A3)
    const targetDeptId = departmentId || reqDepartment || req.user?.department;
    if (!targetDeptId) {
      errors.department = "Department ID is required";
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      errors.items = "Items are required";
    } else {
      for (const item of items) {
        if (!item.itemName || item.itemName.trim() === "")
          errors["items.itemName"] = "Item name is required";
        if (!item.itemType || item.itemType.trim() === "")
          errors["items.itemType"] = "Item type is required";
        if (!item.itemDescription || item.itemDescription.trim() === "")
          errors["items.itemDescription"] = "Item description is required";
        if (typeof item.isWorkTool !== "boolean")
          errors["items.isWorkTool"] = "isWorkTool must be a boolean";

        // Convert empty strings to undefined for optional fields
        if (item.preferredBrand === "") item.preferredBrand = undefined;
        if (item.uploadImage === "") item.uploadImage = undefined;
        if (item.UOM === "") item.UOM = undefined;
        // Delete recommendedVendor if supplied
        delete item.recommendedVendor;
      }
    }

    const location = await Location.findById(deliveryLocation);
    if (!location)
      errors.deliveryLocation = `Location with ID ${deliveryLocation} not found`;

    // Verify department exists
    let chosenDepartment: any = null;
    if (targetDeptId) {
      chosenDepartment = await Department.findById(targetDeptId);
      if (!chosenDepartment) {
        errors.department = `Department with ID ${targetDeptId} not found`;
      }
    }

    // Role-based department selection policy
    if (chosenDepartment && req.user!.role === UserRole.STAFF) {
      const userDeptId = normalizeObjectId(req.user?.department);
      const chosenDeptId = normalizeObjectId(chosenDepartment._id);
      if (userDeptId && chosenDeptId && userDeptId !== chosenDeptId) {
        res.status(403).json({
          success: false,
          message: "Staff may only create requisitions for their assigned department",
        });
        return;
      }
    }

    if (Object.keys(errors).length > 0) {
      res
        .status(400)
        .json({ success: false, message: "Validation Error", errors });
      return;
    }

    await applyUploadedImagesToItems(req, items);

    // Set initial item status to pending
    if (items && Array.isArray(items)) {
      items.forEach((item: any) => {
        item.status = "pending";
      });
    }

    const requisitionData: {
      title: any;
      urgency?: any;
      justification: any;
      deliveryLocation: any;
      deliveryDate: any;
      items: any;
      requester: any;
      department: any;
      status: RequisitionStatus;
      approvals?: {
        stage: string;
        approver: any;
        status: "approved" | "rejected" | "pending";
        timestamp: Date;
      }[];
    } = {
      title,
      urgency: urgency || undefined,
      justification,
      deliveryLocation: location!._id,
      deliveryDate,
      items,
      requester: (req.user as any)._id,
      department: chosenDepartment._id,
      status: RequisitionStatus.DRAFT, // All users start with DRAFT status
    };

    // Create the requisition
    const newRequisition = await Requisition.create(requisitionData);

    // Log item creation history for each item
    if (newRequisition.items && newRequisition.items.length > 0) {
      for (const item of newRequisition.items) {
        await logItemHistory(
          newRequisition._id.toString(),
          (item as any)._id.toString(),
          "created",
          (req.user as any)._id.toString(),
          undefined,
          "pending",
          "Item created with requisition",
        );
      }
    }

    // Record the creation in history
    await RequisitionHistory.create({
      requisition: newRequisition._id,
      action: "created",
      status: newRequisition.status,
      user: getUserId(req.user),
      details: "Requisition created",
    });

    // Notify department head about new requisition (all users follow same flow)
    await notifyRequisitionCreated(
      newRequisition,
      (req.user as any)._id.toString(),
    );

    res.status(201).json({
      success: true,
      data: newRequisition,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update requisition
// @route   PUT /api/requisitions/:id
// @access  Private
export const updateRequisition = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    let requisition = await Requisition.findById(req.params.id);

    if (!requisition) {
      res
        .status(404)
        .json({ success: false, message: "Requisition not found" });
      return;
    }

    // Check if user has permission to update this requisition
    // Allow creator and department head to edit until department approval
    const isCreator =
      requisition.requester.toString() === (req.user as any)._id.toString();
    const isDepartmentHead = req.user!.role === UserRole.DEPARTMENT_HEAD;
    const isFromSameDepartment =
      requisition.department.toString() === req.user!.department?.toString();

    if (!isCreator && !(isDepartmentHead && isFromSameDepartment)) {
      res.status(403).json({
        success: false,
        message: "Not authorized to update this requisition",
      });
      return;
    }

    // Define statuses that prevent editing (after department approval)
    const restrictedStatuses = [
      RequisitionStatus.DEPARTMENT_APPROVED,
      RequisitionStatus.DEPARTMENT_REJECTED,
      RequisitionStatus.PROCUREMENT_REVIEW,
      RequisitionStatus.VENDOR_BIDDING,
      RequisitionStatus.HHRA_REVIEW,
      RequisitionStatus.HHRA_APPROVED,
      RequisitionStatus.HHRA_REJECTED,
      RequisitionStatus.NEGOTIATION,
      RequisitionStatus.PO_GENERATED,
      RequisitionStatus.PO_GENERATION,
      RequisitionStatus.VENDOR_ACKNOWLEDGED,
      RequisitionStatus.DELIVERED,
      RequisitionStatus.INVENTORY_CONFIRMED,
      RequisitionStatus.DEPARTMENT_CONFIRMED,
      RequisitionStatus.COMPLETED,
      RequisitionStatus.PAID,
      RequisitionStatus.CANCELLED,
    ];

    // Users can update requisitions in DRAFT or SUBMITTED status (before HOD approval)
    // Once department head approves, editing is restricted
    if (restrictedStatuses.includes(requisition.status)) {
      res.status(400).json({
        success: false,
        message:
          "Cannot update requisition after department head approval. Current status: " +
          requisition.status,
      });
      return;
    }

    // Only accept the new parameters
    const { title, urgency, justification, deliveryLocation, deliveryDate } =
      req.body;

    let { items } = req.body;

    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch (error) {
        res
          .status(400)
          .json({ success: false, message: "Invalid items format" });
        return;
      }
    } else if (Array.isArray(items)) {
      items = items.map((item) => {
        if (typeof item === "string") {
          try {
            return JSON.parse(item);
          } catch (error) {
            res
              .status(400)
              .json({ success: false, message: "Invalid items format" });
            return;
          }
        }
        return item;
      });
    }

    // Manual validation
    const errors: { [key: string]: string } = {};
    if (title) {
      if (typeof title !== "string" || title.trim() === "") {
        errors.title = "Title is required and must be a string";
      }
    }

    if (urgency) {
      if (
        typeof urgency !== "string" ||
        !["low", "medium", "high"].includes(urgency)
      ) {
        errors.urgency = "Urgency must be one of 'low', 'medium', or 'high'";
      }
    }

    if (justification) {
      if (typeof justification !== "string" || justification.trim() === "") {
        errors.justification = "Justification is required and must be a string";
      }
    }

    if (deliveryLocation) {
      const location = await Location.findById(deliveryLocation);
      if (!location) {
        errors.deliveryLocation = `Location with ID ${deliveryLocation} not found`;
      }
    }

    if (deliveryDate) {
      if (isNaN(Date.parse(deliveryDate))) {
        errors.deliveryDate = "Invalid date format for deliveryDate";
      }
    }

    if (items) {
      if (!Array.isArray(items) || items.length === 0) {
        errors.items = "Items must be a non-empty array";
      } else {
        for (const item of items) {
          if (!item.itemName)
            errors["items.itemName"] = "Item name is required";
          if (!item.itemType)
            errors["items.itemType"] = "Item type is required";
          if (!item.itemDescription)
            errors["items.itemDescription"] = "Item description is required";
          if (typeof item.isWorkTool !== "boolean")
            errors["items.isWorkTool"] = "isWorkTool must be a boolean";

          // Note: recommendedVendor validation removed - vendor system deprecated
          // RFQ workflow uses Vendor Master for vendor selection
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      res
        .status(400)
        .json({ success: false, message: "Validation Error", errors });
      return;
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (urgency !== undefined) updateData.urgency = urgency || undefined;
    if (justification !== undefined) updateData.justification = justification;
    if (deliveryLocation !== undefined) updateData.deliveryLocation = deliveryLocation;
    if (deliveryDate !== undefined) updateData.deliveryDate = deliveryDate;
    if (items !== undefined) {
      // Clean up recommendedVendor on items
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          delete item.recommendedVendor;
        });
      }
      updateData.items = items;
    }

    requisition = await Requisition.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      },
    );

    // Create history record
    await requisitionHistoryModel.create({
      requisition: requisition!._id,
      action: "updated",
      status: requisition!.status,
      user: (req.user as any)._id.toString(),
      details: "Requisition updated",
    });

    // Notify stakeholders about requisition update
    await notifyRequisitionUpdated(
      requisition,
      (req.user as any)._id.toString(),
    );

    res.status(200).json({
      success: true,
      data: requisition,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete requisition
// @route   DELETE /api/requisitions/:id
// @access  Private/Staff
export const deleteRequisition = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const requisition = await Requisition.findById(req.params.id);

    if (!requisition) {
      res
        .status(404)
        .json({ success: false, message: "Requisition not found" });
      return;
    }

    // Check if user has permission to delete this requisition
    if (
      req.user!.role === UserRole.STAFF &&
      requisition.requester.toString() !== (req.user as any)._id.toString()
    ) {
      res.status(403).json({
        success: false,
        message: "Not authorized to delete this requisition",
      });
      return;
    }

    // Define statuses that prevent deletion (department approved or beyond)
    const restrictedStatuses = [
      RequisitionStatus.DEPARTMENT_APPROVED,
      RequisitionStatus.DEPARTMENT_REJECTED,
      RequisitionStatus.PROCUREMENT_REVIEW,
      RequisitionStatus.VENDOR_BIDDING,
      RequisitionStatus.HHRA_REVIEW,
      RequisitionStatus.HHRA_APPROVED,
      RequisitionStatus.HHRA_REJECTED,
      RequisitionStatus.NEGOTIATION,
      RequisitionStatus.PO_GENERATED,
      RequisitionStatus.PO_GENERATION,
      RequisitionStatus.VENDOR_ACKNOWLEDGED,
      RequisitionStatus.DELIVERED,
      RequisitionStatus.INVENTORY_CONFIRMED,
      RequisitionStatus.DEPARTMENT_CONFIRMED,
      RequisitionStatus.COMPLETED,
      RequisitionStatus.PAID,
      RequisitionStatus.CANCELLED,
    ];

    // Staff can delete requisitions in DRAFT or SUBMITTED status (within department)
    // Once department head approves, deletion is restricted
    if (
      req.user!.role === UserRole.STAFF &&
      restrictedStatuses.includes(requisition.status)
    ) {
      res.status(400).json({
        success: false,
        message:
          "Cannot delete requisition after department head approval. Current status: " +
          requisition.status,
      });
      return;
    }

    await requisition.deleteOne();

    // Notify stakeholders about requisition deletion
    await notifyRequisitionDeleted(
      requisition,
      (req.user as any)._id.toString(),
    );

    // Create history record
    await requisitionHistoryModel.create({
      requisition: requisition._id,
      action: "deleted",
      status: requisition.status,
      user: (req.user as any)._id.toString(),
      details: "Requisition deleted",
    });

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get active eligible approvers for requisitions
// @route   GET /api/requisitions/eligible-approvers
// @access  Private
export const getEligibleApprovers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { departmentId } = req.query;

    const allowedRoles = [
      UserRole.DEPARTMENT_HEAD,
      UserRole.HEAD_OF_FINANCE,
      UserRole.HEAD_OF_HR,
      UserRole.HR_APPROVER,
      UserRole.HHRA,
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN,
    ];

    const filter: any = {
      isActive: true,
      role: { $in: allowedRoles },
    };

    if (departmentId && isValidObjectId(departmentId as string)) {
      const dept = await Department.findById(departmentId);
      if (dept?.head) {
        filter.$or = [
          { role: { $in: allowedRoles } },
          { _id: dept.head },
        ];
        delete filter.role;
      }
    }

    const rawApprovers = await User.find(filter).select("_id firstName lastName email role designation department isActive").populate("department", "name code").sort({ firstName: 1, lastName: 1 });
    const approvers = rawApprovers.map((a: any) => ({ id: a._id?.toString() || a.id?.toString(), ...(a.toObject ? a.toObject() : a) }));

    res.status(200).json({
      success: true,
      count: approvers.length,
      data: approvers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit requisition for approval (removes from draft status)
// @route   PUT /api/requisitions/:id/submit
// @access  Private/Staff
export const submitRequisition = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const requisition = await Requisition.findById(req.params.id);

    if (!requisition) {
      res
        .status(404)
        .json({ success: false, message: "Requisition not found" });
      return;
    }

    // Check if user has permission to submit this requisition
    if (requisition.requester.toString() !== (req.user as any)._id.toString()) {
      res.status(403).json({
        success: false,
        message: "Not authorized to submit this requisition",
      });
      return;
    }

    // Check if requisition is in draft status
    if (requisition.status !== RequisitionStatus.DRAFT) {
      res.status(400).json({
        success: false,
        message: "Requisition is not in draft status",
      });
      return;
    }

    const { assignedApprover, approverId } = req.body;
    const selectedApproverId = assignedApprover || approverId;

    let targetApproverUser: any = null;

    if (selectedApproverId) {
      targetApproverUser = await db.query.users.findFirst({ where: eq(users.id, String(String(selectedApproverId))) });
      if (!targetApproverUser || !targetApproverUser.isActive) {
        res.status(400).json({
          success: false,
          message: "Selected approver is invalid or inactive",
        });
        return;
      }
    } else {
      // PM-generated requests require selecting an eligible HOD (Requirement C5)
      if (req.user!.role === UserRole.PROCUREMENT_MANAGER) {
        res.status(400).json({
          success: false,
          message: "Procurement Manager must select an eligible department approver before submitting",
        });
        return;
      }

      // Fallback to department.head for legacy / staff requests
      const department = await Department.findById(requisition.department);
      if (department?.head) {
        targetApproverUser = await db.query.users.findFirst({ where: eq(users.id, String(String(department.head))) });
      }
    }

    // Update status to submitted
    requisition.status = RequisitionStatus.SUBMITTED;
    if (targetApproverUser) {
      requisition.assignedApprover = targetApproverUser.id;
    }

    // Initialize approvals array if it doesn't exist
    if (!requisition.approvals) {
      requisition.approvals = [];
    }

    // Add pending approval assignment
    if (targetApproverUser) {
      requisition.approvals.push({
        stage: "Department",
        approver: targetApproverUser.id,
        status: "pending",
        timestamp: new Date(),
      });
    }

    await requisition.save();

    // Create history record for submission
    await requisitionHistoryModel.create({
      requisition: requisition._id,
      action: "submitted",
      status: requisition.status,
      user: (req.user as any)._id.toString(),
      details: `Requisition submitted for approval${targetApproverUser ? ` to ${targetApproverUser.firstName} ${targetApproverUser.lastName}` : ""}`,
    });

    // Notify department head / assigned approver
    await notifyRequisitionSubmitted(
      requisition,
      (req.user as any)._id.toString(),
    );

    res.status(200).json({
      success: true,
      data: requisition,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve/Reject requisition by department head
// @route   PUT /api/requisitions/:id/department-approval
// @access  Private/DepartmentHead
export const departmentApproval = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status, comments } = req.body;

    const requisition = await Requisition.findById(req.params.id);

    if (!requisition) {
      res
        .status(404)
        .json({ success: false, message: "Requisition not found" });
      return;
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, String(req.user!._id)), with: { department: true } });
    const isFinanceHOD =
      user &&
      (user.role === UserRole.HEAD_OF_FINANCE ||
        (user.role === UserRole.DEPARTMENT_HEAD &&
          user.department &&
          ((user.department as any).code === "5" ||
            (user.department as any).code === "FIN" ||
            (user.department as any).name?.toLowerCase().includes("finance") ||
            (user.department as any).name?.toLowerCase().includes("accounts"))));

    const isHrHOD =
      user &&
      (user.role === UserRole.HEAD_OF_HR ||
        user.role === UserRole.HHRA ||
        (user.role === UserRole.DEPARTMENT_HEAD &&
          user.department &&
          ((user.department as any).code === "4" ||
            (user.department as any).code === "HR" ||
            (user.department as any).name?.toLowerCase().includes("hr") ||
            (user.department as any).name?.toLowerCase().includes("human resources"))));

    const isAdmin =
      req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.SUPER_ADMIN;

    const currentUserId = (req.user as any)._id.toString();

    let isAuthorizedApprover = false;
    let approvalStage = "Department";
    let approverRole = "hod";

    if (isFinanceHOD) {
      isAuthorizedApprover = true;
      approvalStage = "Finance";
      approverRole = "hof";
    } else if (isHrHOD) {
      isAuthorizedApprover = true;
      approvalStage = "HR";
      approverRole = "hhr";
    } else if (isAdmin) {
      isAuthorizedApprover = true;
      approvalStage = "Department";
      approverRole = "hod";
    } else if (requisition.assignedApprover && requisition.assignedApprover.toString() === currentUserId) {
      isAuthorizedApprover = true;
      approvalStage = "Department";
      approverRole = "hod";
    } else {
      const department = await Department.findById(requisition.department);
      const deptHeadId = normalizeObjectId(department?.head);
      if (
        deptHeadId === currentUserId ||
        (req.user!.role === UserRole.DEPARTMENT_HEAD &&
          normalizeObjectId(req.user!.department) === normalizeObjectId(requisition.department))
      ) {
        isAuthorizedApprover = true;
        approvalStage = "Department";
        approverRole = "hod";
      }
    }

    if (!isAuthorizedApprover) {
      res.status(403).json({
        success: false,
        message: "Not authorized to approve/reject this requisition",
      });
      return;
    }

    if (requisition.status === RequisitionStatus.CANCELLED) {
      res.status(400).json({
        success: false,
        message: "Cannot approve a cancelled requisition",
      });
      return;
    }

    // Make sure the approvals array exists
    if (!requisition.approvals) {
      requisition.approvals = [];
    }

    const cleanComment = typeof comments === "string" && comments.trim() ? comments.trim() : undefined;

    // Update or add approval record
    const stageIndex = requisition.approvals.findIndex(
      (a: any) => a.stage === approvalStage || a.approverRole === approverRole,
    );

    if (stageIndex !== -1) {
      requisition.approvals[stageIndex].status = status;
      requisition.approvals[stageIndex].approver = (req.user as any)._id;
      requisition.approvals[stageIndex].comments = cleanComment;
      requisition.approvals[stageIndex].timestamp = new Date();
    } else {
      requisition.approvals.push({
        stage: approvalStage,
        approver: (req.user as any)._id,
        approverRole,
        status: status,
        comments: cleanComment,
        timestamp: new Date(),
      } as any);
    }

    // Update requisition status based on approval status
    if (status === "approved") {
      requisition.requestApprovedAt = new Date();

      if (approverRole === "hod") {
        const hasWorkTool = requisition.items?.some((i: any) => i.isWorkTool && i.status !== ItemStatus.CANCELLED);
        if (hasWorkTool) {
          requisition.items.forEach((item: any) => {
            if (item.isWorkTool && item.status === ItemStatus.PENDING) {
              item.status = ItemStatus.HR_REVIEW;
            } else if (!item.isWorkTool && item.status === ItemStatus.PENDING) {
              item.status = ItemStatus.DEPARTMENT_APPROVED;
            }
          });
          requisition.status = RequisitionStatus.HR_REVIEW;
        } else {
          requisition.items.forEach((item: any) => {
            if (item.status === ItemStatus.PENDING) {
              item.status = ItemStatus.DEPARTMENT_APPROVED;
            }
          });
          requisition.status = RequisitionStatus.DEPARTMENT_APPROVED;
        }
      } else if (approverRole === "hhr") {
        requisition.items.forEach((item: any) => {
          if (item.isWorkTool && (item.status === ItemStatus.HR_REVIEW || item.status === ItemStatus.PENDING)) {
            item.status = ItemStatus.HR_APPROVED;
            item.hrApprovedBy = (req.user as any)._id;
            item.hrApprovedAt = new Date();
          }
        });
        await updateRequisitionStatusFromItems(requisition);
      } else {
        // HoF or Admin approval
        requisition.items.forEach((item: any) => {
          if (item.status === ItemStatus.PENDING) {
            item.status = item.isWorkTool ? ItemStatus.HR_APPROVED : ItemStatus.DEPARTMENT_APPROVED;
          }
        });
        requisition.status = RequisitionStatus.HOF_APPROVED;
      }
    } else {
      requisition.status = RequisitionStatus.DEPARTMENT_REJECTED;
    }

    await requisition.save();

    // Create history record
    await requisitionHistoryModel.create({
      requisition: requisition._id,
      action: status === "approved" ? "approved" : "rejected",
      status: requisition.status,
      user: (req.user as any)._id.toString(),
      details: `Department ${
        status === "approved" ? "approved" : "rejected"
      } requisition${cleanComment ? `: ${cleanComment}` : ""}`,
    });

    // Notify stakeholders about department decision
    if (status === "approved") {
      await notifyDepartmentApproval(
        requisition,
        (req.user as any)._id.toString(),
        cleanComment,
      );
    } else {
      await notifyDepartmentRejection(
        requisition,
        (req.user as any)._id.toString(),
        cleanComment || "Rejected by department",
      );
    }

    res.status(200).json({
      success: true,
      data: requisition,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Decline requisition by department head
// @route   PUT /api/requisitions/:id/department-rejection
// @access  Private/DepartmentHead
export const departmentRejection = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { comments, reason } = req.body;
    const rejectionComment = comments || reason;

    if (!rejectionComment || typeof rejectionComment !== "string" || rejectionComment.trim() === "") {
      res.status(400).json({
        success: false,
        message: "Rejection comments are required",
      });
      return;
    }

    req.body.status = "rejected";
    req.body.comments = rejectionComment.trim();
    return departmentApproval(req, res, next);
  } catch (error) {
    next(error);
  }
};

// @desc    HHRA approval and payment tracking
// @route   PUT /api/requisitions/:id/hhra-approval
// @access  Private/HHRA, HRApprover, AccountsApprover
export const hhraApproval = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await db.query.users.findFirst({ where: eq(users.id, String(req.user!._id)), with: { department: true } });
    const isFinanceHOD =
      user &&
      (user.role === UserRole.HEAD_OF_FINANCE ||
        (user.role === UserRole.DEPARTMENT_HEAD &&
          user.department &&
          ((user.department as any).code === "5" ||
            (user.department as any).code === "FIN" ||
            (user.department as any).name?.toLowerCase().includes("finance") ||
            (user.department as any).name?.toLowerCase().includes("accounts"))));

    const isHrHOD =
      user &&
      (user.role === UserRole.HEAD_OF_HR ||
        user.role === UserRole.HHRA ||
        (user.role === UserRole.DEPARTMENT_HEAD &&
          user.department &&
          ((user.department as any).code === "4" ||
            (user.department as any).code === "HR" ||
            (user.department as any).name?.toLowerCase().includes("hr") ||
            (user.department as any).name?.toLowerCase().includes("human resources"))));

    if (!user || (user.role !== UserRole.HHRA && user.role !== UserRole.HR_APPROVER && user.role !== UserRole.ACCOUNTS_APPROVER && !isFinanceHOD && !isHrHOD)) {
      res.status(403).json({
        success: false,
        message: "Only Head of Finance, Head of HR, or HHRA can perform this approval",
      });
      return;
    }

    const {
      status,
      comments,
      paymentStatus,
      paymentAmount,
      paymentReference,
      paymentNotes,
    } = req.body;

    const requisition = await Requisition.findById(req.params.id);

    if (!requisition) {
      res
        .status(404)
        .json({ success: false, message: "Requisition not found" });
      return;
    }

    // Check if requisition is in HHRA review status or legacy HR review status
    if (
      requisition.status !== RequisitionStatus.HHRA_REVIEW &&
      requisition.status !== RequisitionStatus.HR_REVIEW &&
      requisition.status !== RequisitionStatus.DEPARTMENT_CONFIRMED
    ) {
      res.status(400).json({
        success: false,
        message:
          "Requisition is not in HHRA review status or department confirmed status",
      });
      return;
    }

    // Ensure approvals array exists
    if (!requisition.approvals) {
      requisition.approvals = [];
    }

    // Find the appropriate approval record
    let approvalIndex = requisition.approvals.findIndex(
      (approval: any) => approval.stage === "HHRA",
    );

    // If HHRA approval not found, look for legacy HR approval
    if (approvalIndex === -1) {
      approvalIndex = requisition.approvals.findIndex(
        (approval: any) => approval.stage === "HR",
      );
    }

    if (approvalIndex === -1) {
      // Create a new HHRA approval record if none exists
      const userId = getUserId(req.user);
      if (userId) {
        requisition.approvals.push({
          stage: "HHRA",
          approver: userId,
          status: status,
          comments: comments,
          timestamp: new Date(),
        });
      }
    } else {
      // Update existing approval record
      requisition.approvals[approvalIndex].status = status;
      requisition.approvals[approvalIndex].comments = comments;
      const userId = getUserId(req.user);
      if (userId) {
        requisition.approvals[approvalIndex].approver = userId;
      }
      requisition.approvals[approvalIndex].timestamp = new Date();
    }

    // Update payment information if provided
    if (paymentStatus) {
      requisition.paymentStatus = paymentStatus;
    }
    if (paymentAmount) {
      requisition.paymentAmount = paymentAmount;
    }
    if (paymentReference) {
      requisition.paymentReference = paymentReference;
    }
    if (paymentNotes) {
      requisition.paymentNotes = paymentNotes;
    }

    // Set payment date and user if fully paid
    if (paymentStatus === "fully_paid") {
      requisition.paymentDate = new Date();
      requisition.paymentBy = (req.user as any)._id;
      requisition.status = RequisitionStatus.PAID;
    } else {
      // Update requisition status based on approval status
      if (status === "approved") {
        requisition.status = RequisitionStatus.HHRA_APPROVED;
      } else {
        requisition.status = RequisitionStatus.HHRA_REJECTED;
      }
    }

    await requisition.save();

    // Create history record
    let historyAction;
    let historyDetails;

    if (paymentStatus === "fully_paid") {
      historyAction = "payment_completed";
      historyDetails = `Payment completed for requisition. Reference: ${
        paymentReference || "N/A"
      }`;
    } else {
      historyAction = status === "approved" ? "hhra_approved" : "hhra_rejected";
      historyDetails = `HHRA ${
        status === "approved" ? "approved" : "rejected"
      } requisition${comments ? `: ${comments}` : ""}`;
    }

    await requisitionHistoryModel.create({
      requisition: requisition._id ? requisition._id : "",
      action: historyAction,
      status: requisition.status,
      user: getUserId(req.user),
      details: historyDetails,
    });

    // Notify relevant parties about the approval/rejection/payment
    // const requester = await db.query.users.findFirst({ where: eq(users.id, String(requisition.requester)) });
    const department = await Department.findById(requisition.department);
    let departmentHead = null;

    if (department && department.head) {
      departmentHead = await db.query.users.findFirst({ where: eq(users.id, String(department.head)) });
    }

    const targetUserIds = [
      requisition.requester.toString(),
      departmentHead && departmentHead.id
        ? departmentHead.id.toString()
        : null,
    ].filter(Boolean) as string[];

    await notifications.emit("notify", {
      type: "requisition_status_changed",
      actorId: getUserId(req.user)?.toString() || "",
      targetUserIds,
      resource: {
        kind: "requisition",
        id: requisition._id ? requisition._id.toString() : "",
      },
      metadata: {
        resourceNumber: requisition.requisitionNumber,
        title: requisition.title,
        newStatus: requisition.status,
        message:
          paymentStatus === "fully_paid"
            ? "Payment has been processed for this requisition"
            : `Requisition has been ${
                status === "approved" ? "approved" : "rejected"
              } by HHRA${comments ? ` with comment: ${comments}` : ""}`,
      },
    });

    res.status(200).json({
      success: true,
      data: requisition,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload requisition attachment
// @route   POST /api/requisitions/:id/attachments
// @access  Private
export const uploadAttachment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const requisition = await Requisition.findById(req.params.id);

    if (!requisition) {
      res
        .status(404)
        .json({ success: false, message: "Requisition not found" });
      return;
    }

    // Check if user has permission to upload attachment
    if (
      req.user!.role === UserRole.STAFF &&
      requisition.requester.toString() !== (req.user as any)._id.toString()
    ) {
      res.status(403).json({
        success: false,
        message: "Not authorized to upload attachment to this requisition",
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: "Please upload a file" });
      return;
    }

    const uploadedFile = await uploadToS3(req.file, "requisition-attachments");

    // Add attachment to requisition
    requisition.attachments = requisition.attachments || [];
    requisition.attachments.push(uploadedFile);
    await requisition.save();

    // Create history record
    await requisitionHistoryModel.create({
      requisition: requisition._id,
      action: "attachment_added",
      status: requisition.status,
      user: (req.user as any)._id.toString(),
      details: `Attachment added: ${uploadedFile.name}`,
    });

    res.status(200).json({
      success: true,
      data: uploadedFile,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get requisition history
// @route   GET /api/requisitions/:id/history
// @access  Private
export const getRequisitionHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const requisition = await Requisition.findById(req.params.id);

    if (!requisition) {
      res
        .status(404)
        .json({ success: false, message: "Requisition not found" });
      return;
    }

    // Check if user has permission to view this requisition's history
    if (
      req.user!.role === UserRole.STAFF &&
      requisition.requester.toString() !== (req.user as any)._id.toString()
    ) {
      res.status(403).json({
        success: false,
        message: "Not authorized to access this requisition's history",
      });
      return;
    }

    if (
      req.user!.role === UserRole.DEPARTMENT_HEAD &&
      requisition.department.toString() !== req.user!.department?.toString()
    ) {
      res.status(403).json({
        success: false,
        message: "Not authorized to access this requisition's history",
      });
      return;
    }

    // DEPRECATED: Vendor role removed
    // if (req.user!.role === UserRole.VENDOR) {
    //   const vendor = await Vendor.findOne({ _id: req.user!.vendor });
    //   if (!vendor) {
    //     res.status(404).json({ success: false, message: "Vendor not found" });
    //     return;
    //   }

    //   // Check if requisition is in vendor's category and in bidding stage or later
    //   const isInCategory = vendor.categories.some(
    //     (category) =>
    //       category.toString() === requisition.vendorCategory?.toString()
    //   );

    //   if (
    //     !isInCategory ||
    //     requisition.status === RequisitionStatus.DRAFT ||
    //     requisition.status === RequisitionStatus.SUBMITTED ||
    //     requisition.status === RequisitionStatus.DEPARTMENT_APPROVED ||
    //     requisition.status === RequisitionStatus.DEPARTMENT_REJECTED
    //   ) {
    //     res.status(403).json({
    //       success: false,
    //       message: "Not authorized to access this requisition's history",
    //     });
    //     return;
    //   }
    // }

    // Get requisition history
    const history = await requisitionHistoryModel
      .find({
        requisition: req.params.id,
      })
      .populate("user", "firstName lastName email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get requisitions by department
// @route   GET /api/departments/:departmentId/requisitions
// @access  Private/Admin/DepartmentHead
export const getRequisitionsByDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { departmentId } = req.params;

    console.log("User info:", {
      id: req.user!._id,
      role: req.user!.role,
      department: req.user!.department,
      name: `${req.user!.firstName} ${req.user!.lastName}`,
    });

    console.log("Requested department:", departmentId);

    // Verify department exists
    const department = await Department.findById(departmentId);
    if (!department) {
      res.status(404).json({ success: false, message: "Department not found" });
      return;
    }

    console.log("Found department:", {
      id: department._id?.toString(),
      name: department.name,
      head: department.head
        ? typeof department.head === "object"
          ? (department.head as any)._id?.toString()
          : department.head.toString()
        : "null",
    });

    const isFinanceOrHrHOD =
      req.user &&
      req.user.role === UserRole.DEPARTMENT_HEAD &&
      req.user.department &&
      (
        ["5", "4", "FIN", "HR"].includes((req.user.department as any).code || "") ||
        ["finance", "accounts", "hr", "human resources"].some(kw => (req.user.department as any).name?.toLowerCase().includes(kw))
      );

    // For department heads and HHRA, check if they're accessing their own department (bypassing for Finance/HR heads)
    if (
      (req.user!.role === UserRole.DEPARTMENT_HEAD && !isFinanceOrHrHOD) ||
      (req.user!.role === UserRole.HHRA && !isFinanceOrHrHOD)
    ) {
      const userDeptId = req.user!.department?.toString();
      const requestedDeptId = departmentId.toString();

      console.log("Department ID comparison:", {
        userDepartment: userDeptId,
        requestedDepartment: requestedDeptId,
        userRole: req.user!.role,
        isMatch: requestedDeptId === userDeptId,
      });

      const isDepartmentHead =
        department.head?.toString() === req.user!._id.toString();

      if (
        !userDeptId ||
        (!isDepartmentHead && requestedDeptId !== userDeptId)
      ) {
        console.log(
          "Access denied: Department mismatch or user is not department head",
        );
        res.status(403).json({
          success: false,
          message: "Not authorized to access requisitions from this department",
        });
        return;
      }
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startIndex = (page - 1) * limit;

    // Filtering
    const status = req.query.status as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const query: any = { department: departmentId };

    // For Department Heads, only show SUBMITTED and above statuses
    if (
      req.user!.role === UserRole.DEPARTMENT_HEAD ||
      req.user!.role === UserRole.HHRA
    ) {
      const submittedAndAboveStatuses = [
        RequisitionStatus.SUBMITTED,
        RequisitionStatus.DEPARTMENT_APPROVED,
        RequisitionStatus.DEPARTMENT_REJECTED,
        RequisitionStatus.PROCUREMENT_REVIEW,
        RequisitionStatus.VENDOR_BIDDING,
        RequisitionStatus.HHRA_REVIEW,
        RequisitionStatus.HHRA_APPROVED,
        RequisitionStatus.HHRA_REJECTED,
        RequisitionStatus.NEGOTIATION,
        RequisitionStatus.PO_GENERATED,
        RequisitionStatus.PO_GENERATION,
        RequisitionStatus.VENDOR_ACKNOWLEDGED,
        RequisitionStatus.DELIVERED,
        RequisitionStatus.INVENTORY_CONFIRMED,
        RequisitionStatus.DEPARTMENT_CONFIRMED,
        RequisitionStatus.COMPLETED,
        RequisitionStatus.PAID,
        RequisitionStatus.CANCELLED,
      ];
      query.status = { $in: submittedAndAboveStatuses };
    }

    if (status) {
      // If a specific status is requested, use that (but respect HOD restrictions)
      if (
        req.user!.role === UserRole.DEPARTMENT_HEAD ||
        req.user!.role === UserRole.HHRA
      ) {
        // Make sure the requested status is in the allowed list
        const submittedAndAboveStatuses = [
          RequisitionStatus.SUBMITTED,
          RequisitionStatus.DEPARTMENT_APPROVED,
          RequisitionStatus.DEPARTMENT_REJECTED,
          RequisitionStatus.PROCUREMENT_REVIEW,
          RequisitionStatus.VENDOR_BIDDING,
          RequisitionStatus.HHRA_REVIEW,
          RequisitionStatus.HHRA_APPROVED,
          RequisitionStatus.HHRA_REJECTED,
          RequisitionStatus.NEGOTIATION,
          RequisitionStatus.PO_GENERATED,
          RequisitionStatus.PO_GENERATION,
          RequisitionStatus.VENDOR_ACKNOWLEDGED,
          RequisitionStatus.DELIVERED,
          RequisitionStatus.INVENTORY_CONFIRMED,
          RequisitionStatus.DEPARTMENT_CONFIRMED,
          RequisitionStatus.COMPLETED,
          RequisitionStatus.PAID,
          RequisitionStatus.CANCELLED,
        ];
        if (submittedAndAboveStatuses.includes(status as RequisitionStatus)) {
          query.status = status;
        }
        // If they request DRAFT, ignore it
      } else {
        query.status = status;
      }
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else if (startDate) {
      query.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.createdAt = { $lte: new Date(endDate) };
    }

    // Get total count
    const total = await Requisition.countDocuments(query);

    // Get requisitions
    const requisitions = await Requisition.find(query)
      .populate("requester", "firstName lastName email")
      // .populate("vendorCategory", "name") // DEPRECATED - field removed
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    // Pagination result
    const pagination = {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    };

    res.status(200).json({
      success: true,
      count: requisitions.length,
      pagination,
      data: requisitions,
    });
  } catch (error) {
    next(error);
  }
};

// Removed duplicate getRequisitionsByUser function declaration - function is already defined above

// @desc    Cancel requisition
// @route   PUT /api/requisitions/:id/cancel
// @access  Private
export const cancelRequisition = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { reason } = req.body;

    if (!reason) {
      res.status(400).json({
        success: false,
        message: "Please provide a reason for cancellation",
      });
      return;
    }

    const requisition = await Requisition.findById(req.params.id);

    if (!requisition) {
      res
        .status(404)
        .json({ success: false, message: "Requisition not found" });
      return;
    }

    // Check permissions based on role and requisition status
    if (req.user!.role === UserRole.STAFF) {
      // Staff can only cancel their own requisitions in draft or submitted status
      if (
        requisition.requester.toString() !==
        (req.user as any)._id.toString().toString()
      ) {
        res.status(403).json({
          success: false,
          message: "Not authorized to cancel this requisition",
        });
        return;
      }

      if (
        requisition.status !== RequisitionStatus.DRAFT &&
        requisition.status !== RequisitionStatus.SUBMITTED
      ) {
        res.status(400).json({
          success: false,
          message:
            "Staff can only cancel requisitions in draft or submitted status",
        });
        return;
      }
    } else if (req.user!.role === UserRole.DEPARTMENT_HEAD) {
      // Department head can cancel requisitions from their department in specific statuses
      if (
        requisition.department.toString() !== req.user!.department?.toString()
      ) {
        res.status(403).json({
          success: false,
          message: "Not authorized to cancel this requisition",
        });
        return;
      }

      if (
        requisition.status !== RequisitionStatus.SUBMITTED &&
        requisition.status !== RequisitionStatus.DEPARTMENT_APPROVED
      ) {
        res.status(400).json({
          success: false,
          message:
            "Department head can only cancel requisitions in submitted or department approved status",
        });
        return;
      }
    } else if (req.user!.role === UserRole.PROCUREMENT_MANAGER) {
      // Procurement manager can cancel requisitions in specific statuses
      if (
        requisition.status !== RequisitionStatus.DEPARTMENT_APPROVED &&
        requisition.status !== RequisitionStatus.VENDOR_BIDDING &&
        requisition.status !== RequisitionStatus.HR_REVIEW &&
        requisition.status !== RequisitionStatus.HR_APPROVED &&
        requisition.status !== RequisitionStatus.ACCOUNTS_APPROVED
      ) {
        res.status(400).json({
          success: false,
          message: "Cannot cancel requisition in its current status",
        });
        return;
      }
    } else if (
      req.user!.role !== UserRole.ADMIN &&
      req.user!.role !== UserRole.SUPER_ADMIN
    ) {
      // Other roles cannot cancel requisitions
      res.status(403).json({
        success: false,
        message: "Not authorized to cancel requisitions",
      });
      return;
    }

    // Check if requisition is already cancelled or completed
    if (
      requisition.status === RequisitionStatus.CANCELLED ||
      requisition.status === RequisitionStatus.COMPLETED
    ) {
      res.status(400).json({
        success: false,
        message:
          "Cannot cancel requisition that is already cancelled or completed",
      });
      return;
    }

    // Update requisition status to cancelled
    requisition.status = RequisitionStatus.CANCELLED;
    requisition.cancellationReason = reason;
    requisition.cancelledBy = (req.user as any)._id.toString() as string;
    requisition.cancelledAt = new Date();

    await requisition.save();

    // Create history record
    await requisitionHistoryModel.create({
      requisition: requisition._id,
      action: "cancelled",
      status: requisition.status,
      user: (req.user as any)._id.toString(),
      details: `Requisition cancelled: ${reason}`,
    });

    // Notify requester if cancelled by someone else
    if (
      requisition.requester.toString() !==
      (req.user as any)._id.toString().toString()
    ) {
      const requester = await db.query.users.findFirst({ where: eq(users.id, String(requisition.requester)) });
      if (requester) {
        await emailService.sendRequisitionCancellationNotification(
          {
            email: requester.email,
            name: `${requester.firstName} ${requester.lastName}`,
          },
          {
            requisitionNumber: requisition.requisitionNumber,
            title: requisition.title,
            reason: reason,
            cancelledBy: `${req.user!.firstName} ${req.user!.lastName}`,
          },
        );
      }
    }

    res.status(200).json({
      success: true,
      data: requisition,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// ITEM-LEVEL APPROVAL ENDPOINTS
// ============================================

const canActorReviewItems = (
  currentUser: any,
  requisition: any,
  action: "approve" | "reject" = "approve",
): { allowed: boolean; message?: string } => {
  if (!currentUser) {
    return { allowed: false, message: "Not authorized to access this resource" };
  }

  const isAdmin =
    currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN;
  if (isAdmin) return { allowed: true };

  const isFinanceHOD =
    currentUser.role === UserRole.HEAD_OF_FINANCE ||
    (currentUser.role === UserRole.DEPARTMENT_HEAD &&
      currentUser.department &&
      ((currentUser.department as any).code === "5" ||
        (currentUser.department as any).code === "FIN" ||
        (currentUser.department as any).name?.toLowerCase().includes("finance") ||
        (currentUser.department as any).name?.toLowerCase().includes("accounts") ||
        currentUser.designation === "Head, Finance"));
  if (isFinanceHOD) return { allowed: true };

  const isHrHOD =
    currentUser.role === UserRole.HEAD_OF_HR ||
    currentUser.role === UserRole.HHRA ||
    currentUser.role === UserRole.HR_APPROVER ||
    (currentUser.role === UserRole.DEPARTMENT_HEAD &&
      ((currentUser.department &&
        ((currentUser.department as any).code === "4" ||
          (currentUser.department as any).code === "HR" ||
          (currentUser.department as any).name?.toLowerCase().includes("hr") ||
          (currentUser.department as any).name?.toLowerCase().includes("human resources"))) ||
        currentUser.designation === "Head, Human Resources & Admin"));
  if (isHrHOD) return { allowed: true };

  const currentUserId = normalizeObjectId(currentUser._id);
  const isAssigned =
    requisition.assignedApprover &&
    normalizeObjectId(requisition.assignedApprover) === currentUserId;
  if (isAssigned) return { allowed: true };

  const isDepartmentHead =
    currentUser.role === UserRole.DEPARTMENT_HEAD || currentUser.role === UserRole.HHRA;

  const userDepartmentId = normalizeObjectId(currentUser.department);
  const requisitionDepartmentId = normalizeObjectId(requisition.department);

  if (isDepartmentHead) {
    if (userDepartmentId && requisitionDepartmentId && userDepartmentId === requisitionDepartmentId) {
      return { allowed: true };
    }
    return {
      allowed: false,
      message: `You can only ${action} items from your department`,
    };
  }

  return {
    allowed: false,
    message: `Only Department Heads, Head of Finance, or HHRA can ${action} items`,
  };
};

// @desc    Approve single item (Department Head, HOF, HHRA)
// @route   PUT /api/requisitions/:id/items/:itemId/approve
// @access  Private/DepartmentHead/HOF/HHRA
export const approveItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id, itemId } = req.params;
    const { comments } = req.body;
    const userId = getUserId(req.user);

    const requisition = await Requisition.findById(id);
    if (!requisition) {
      res
        .status(404)
        .json({ success: false, message: "Requisition not found" });
      return;
    }

    // Use the already-populated req.user (set by `protect`) to avoid mismatch
    const currentUser = req.user as any;
    const reviewCheck = canActorReviewItems(currentUser, requisition, "approve");
    if (!reviewCheck.allowed) {
      res.status(403).json({
        success: false,
        message: reviewCheck.message || "Only Department Heads can approve items",
      });
      return;
    }

    const approvalAllowedStatuses = [
      RequisitionStatus.SUBMITTED,
      RequisitionStatus.DEPARTMENT_REJECTED,
      RequisitionStatus.HR_REVIEW,
    ];

    if (!approvalAllowedStatuses.includes(requisition.status)) {
      res.status(400).json({
        success: false,
        message:
          "Can only approve items while the requisition is in department review",
      });
      return;
    }

    // Find item
    const item = requisition.items.find(
      (i: any) => i._id?.toString() === itemId,
    );
    if (!item) {
      res.status(404).json({ success: false, message: "Item not found" });
      return;
    }

    const previousStatus = item.status || ItemStatus.PENDING;

    // Allow approval for pending or previously department-rejected items
    const isReinstatingRejected =
      previousStatus === ItemStatus.DEPARTMENT_REJECTED;

    if (previousStatus !== ItemStatus.PENDING && !isReinstatingRejected) {
      res.status(400).json({
        success: false,
        message: `Item is already ${item.status}`,
      });
      return;
    }

    // Update item approval status
    item.status = item.isWorkTool
      ? ItemStatus.HR_REVIEW
      : ItemStatus.DEPARTMENT_APPROVED;
    item.departmentApprovedBy = userId!;
    item.departmentApprovedAt = new Date();
    if (comments) {
      item.departmentComments = comments;
    }

    if (isReinstatingRejected) {
      item.departmentRejectedBy = undefined;
      item.departmentRejectedAt = undefined;
      item.departmentComments = comments || undefined;
    }

    await updateRequisitionStatusFromItems(requisition);
    await requisition.save();

    // Log item history
    await logItemHistory(
      requisition._id!.toString(),
      item._id!.toString(),
      "department_approved",
      userId!.toString(),
      previousStatus,
      item.status,
      comments ||
        (isReinstatingRejected
          ? "Item reinstated and approved after previous rejection"
          : "Item approved by Department Head"),
    );

    await notifyItemDepartmentApproved(
      requisition._id!.toString(),
      item._id!.toString(),
      userId!.toString(),
    );

    res.status(200).json({
      success: true,
      message: item.isWorkTool
        ? "Item approved and sent to HR for review"
        : isReinstatingRejected
          ? "Item reinstated and approved"
          : "Item approved by Department Head",
      data: { requisition, item },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject single item (Department Head)
// @route   PUT /api/requisitions/:id/items/:itemId/reject
// @access  Private/DepartmentHead
export const rejectItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id, itemId } = req.params;
    const { comments } = req.body;
    const userId = getUserId(req.user);

    if (!comments) {
      res.status(400).json({
        success: false,
        message: "Comments are required when rejecting an item",
      });
      return;
    }

    const requisition = await Requisition.findById(id);
    if (!requisition) {
      res
        .status(404)
        .json({ success: false, message: "Requisition not found" });
      return;
    }

    // Use the already-populated req.user (set by `protect`) to avoid mismatch
    const currentUser = req.user as any;
    const reviewCheck = canActorReviewItems(currentUser, requisition, "reject");
    if (!reviewCheck.allowed) {
      res.status(403).json({
        success: false,
        message: reviewCheck.message || "Only Department Heads can reject items",
      });
      return;
    }

    const rejectionAllowedStatuses = [
      RequisitionStatus.SUBMITTED,
      RequisitionStatus.DEPARTMENT_REJECTED,
      RequisitionStatus.HR_REVIEW,
      RequisitionStatus.DEPARTMENT_APPROVED,
    ];

    if (!rejectionAllowedStatuses.includes(requisition.status)) {
      res.status(400).json({
        success: false,
        message:
          "Can only reject items while the requisition is in department review",
      });
      return;
    }

    // Find item
    const item = requisition.items.find(
      (i: any) => i._id?.toString() === itemId,
    );
    if (!item) {
      res.status(404).json({ success: false, message: "Item not found" });
      return;
    }

    const previousStatus = item.status || ItemStatus.PENDING;

    // Allow rejection for pending or department-approved items
    const allowedItemStatuses = [
      ItemStatus.PENDING,
      ItemStatus.DEPARTMENT_APPROVED,
    ];

    if (!allowedItemStatuses.includes(previousStatus as ItemStatus)) {
      res.status(400).json({
        success: false,
        message: `Cannot reject item with status ${item.status}`,
      });
      return;
    }

    // Update item rejection status
    item.status = ItemStatus.DEPARTMENT_REJECTED;
    item.departmentRejectedBy = userId!;
    item.departmentRejectedAt = new Date();
    item.departmentComments = comments;

    // Clear approval fields if re-rejecting previously approved item
    if (previousStatus === ItemStatus.DEPARTMENT_APPROVED) {
      item.departmentApprovedBy = undefined;
      item.departmentApprovedAt = undefined;
    }

    await updateRequisitionStatusFromItems(requisition);
    await requisition.save();

    // Log item history
    await logItemHistory(
      requisition._id!.toString(),
      item._id!.toString(),
      "department_rejected",
      userId!.toString(),
      previousStatus,
      ItemStatus.DEPARTMENT_REJECTED,
      comments,
    );

    await notifyItemDepartmentRejected(
      requisition._id!.toString(),
      item._id!.toString(),
      userId!.toString(),
      comments,
    );

    res.status(200).json({
      success: true,
      message: "Item rejected by Department Head",
      data: { requisition, item },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk approve items (Department Head)
// @route   PUT /api/requisitions/:id/items/bulk-approve
// @access  Private/DepartmentHead
export const bulkApproveItems = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { itemIds, comments } = req.body;
    const userId = getUserId(req.user);

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      res.status(400).json({
        success: false,
        message: "Item IDs array is required",
      });
      return;
    }

    if (!userId) {
      res.status(403).json({
        success: false,
        message: "Not authorized to approve items",
      });
      return;
    }

    const requisition = await Requisition.findById(id);
    if (!requisition) {
      res
        .status(404)
        .json({ success: false, message: "Requisition not found" });
      return;
    }

    const currentUser = req.user as any;
    const reviewCheck = canActorReviewItems(currentUser, requisition, "approve");
    if (!reviewCheck.allowed) {
      res.status(403).json({
        success: false,
        message: reviewCheck.message || "Only Department Heads can approve items",
      });
      return;
    }

    const approvalAllowedStatuses = [
      RequisitionStatus.SUBMITTED,
      RequisitionStatus.DEPARTMENT_REJECTED,
      RequisitionStatus.HR_REVIEW,
    ];

    if (!approvalAllowedStatuses.includes(requisition.status)) {
      res.status(400).json({
        success: false,
        message:
          "Can only approve items while the requisition is in department review",
      });
      return;
    }

    const approvedItems = [];
    const approvedItemIds: string[] = [];
    const errors = [];

    for (const itemId of itemIds) {
      const item = requisition.items.find(
        (i: any) => i._id?.toString() === itemId,
      );

      if (!item) {
        errors.push({ itemId, error: "Item not found" });
        continue;
      }

      const previousStatus = item.status || ItemStatus.PENDING;
      const isReinstatingRejected =
        previousStatus === ItemStatus.DEPARTMENT_REJECTED;

      if (previousStatus !== ItemStatus.PENDING && !isReinstatingRejected) {
        errors.push({ itemId, error: `Item is already ${item.status}` });
        continue;
      }

      // Update item approval status
      item.status = item.isWorkTool
        ? ItemStatus.HR_REVIEW
        : ItemStatus.DEPARTMENT_APPROVED;
      item.departmentApprovedBy = userId!;
      item.departmentApprovedAt = new Date();
      if (comments) {
        item.departmentComments = comments;
      }

      if (isReinstatingRejected) {
        item.departmentRejectedBy = undefined;
        item.departmentRejectedAt = undefined;
        item.departmentComments = comments || undefined;
      }

      approvedItems.push(item);
      approvedItemIds.push(item._id!.toString());

      // Log item history
      await logItemHistory(
        requisition._id!.toString(),
        item._id!.toString(),
        "department_approved",
        userId!.toString(),
        previousStatus,
        item.status,
        comments ||
          (isReinstatingRejected
            ? "Item reinstated and approved after previous rejection"
            : "Item bulk approved by Department Head"),
      );
    }

    await updateRequisitionStatusFromItems(requisition);
    await requisition.save();

    if (approvedItemIds.length > 0) {
      await notifyBulkItemAction(
        requisition._id!.toString(),
        approvedItemIds,
        "approved",
        userId.toString(),
        "department",
      );
    }

    res.status(200).json({
      success: true,
      message: `${approvedItems.length} item(s) approved`,
      data: {
        requisitionId: requisition._id?.toString(),
        approved: approvedItems.length,
        items: approvedItems.map((item: any) => ({
          itemId: item._id?.toString(),
          itemName: item.itemName,
          status: item.status,
          departmentApprovedBy: item.departmentApprovedBy,
          departmentApprovedAt: item.departmentApprovedAt,
          departmentComments: item.departmentComments,
        })),
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk reject items (Department Head)
// @route   PUT /api/requisitions/:id/items/bulk-reject
// @access  Private/DepartmentHead
export const bulkRejectItems = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { itemIds, comments } = req.body;
    const userId = getUserId(req.user);

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      res.status(400).json({
        success: false,
        message: "Item IDs array is required",
      });
      return;
    }

    if (!comments || comments.trim() === "") {
      res.status(400).json({
        success: false,
        message: "Comments are required when rejecting items",
      });
      return;
    }

    if (!userId) {
      res.status(403).json({
        success: false,
        message: "Not authorized to reject items",
      });
      return;
    }

    const requisition = await Requisition.findById(id);
    if (!requisition) {
      res
        .status(404)
        .json({ success: false, message: "Requisition not found" });
      return;
    }

    const currentUser = req.user as any;
    const reviewCheck = canActorReviewItems(currentUser, requisition, "reject");
    if (!reviewCheck.allowed) {
      res.status(403).json({
        success: false,
        message: reviewCheck.message || "Only Department Heads can reject items",
      });
      return;
    }

    const rejectionAllowedStatuses = [
      RequisitionStatus.SUBMITTED,
      RequisitionStatus.DEPARTMENT_REJECTED,
      RequisitionStatus.HR_REVIEW,
    ];

    if (!rejectionAllowedStatuses.includes(requisition.status)) {
      res.status(400).json({
        success: false,
        message:
          "Can only reject items while the requisition is in department review",
      });
      return;
    }

    const rejectedItems = [];
    const rejectedItemIds: string[] = [];
    const errors = [];

    for (const itemId of itemIds) {
      const item = requisition.items.find(
        (i: any) => i._id?.toString() === itemId,
      );

      if (!item) {
        errors.push({ itemId, error: "Item not found" });
        continue;
      }

      const previousStatus = item.status || ItemStatus.PENDING;

      // Allow rejection for pending or department-approved items
      const allowedItemStatuses = [
        ItemStatus.PENDING,
        ItemStatus.DEPARTMENT_APPROVED,
      ];

      if (!allowedItemStatuses.includes(previousStatus as ItemStatus)) {
        errors.push({
          itemId,
          error: `Cannot reject item with status ${item.status}`,
        });
        continue;
      }

      // Update item rejection status
      item.status = ItemStatus.DEPARTMENT_REJECTED;
      item.departmentRejectedBy = userId!;
      item.departmentRejectedAt = new Date();
      item.departmentComments = comments;

      // Clear approval fields if re-rejecting previously approved item
      if (previousStatus === ItemStatus.DEPARTMENT_APPROVED) {
        item.departmentApprovedBy = undefined;
        item.departmentApprovedAt = undefined;
      }

      rejectedItems.push(item);
      rejectedItemIds.push(item._id!.toString());

      // Log item history
      await logItemHistory(
        requisition._id!.toString(),
        item._id!.toString(),
        "department_rejected",
        userId!.toString(),
        previousStatus,
        ItemStatus.DEPARTMENT_REJECTED,
        comments,
      );
    }

    await updateRequisitionStatusFromItems(requisition);
    await requisition.save();

    if (rejectedItemIds.length > 0) {
      await notifyBulkItemAction(
        requisition._id!.toString(),
        rejectedItemIds,
        "rejected",
        userId.toString(),
        "department",
      );
    }

    res.status(200).json({
      success: true,
      message: `${rejectedItems.length} item(s) rejected`,
      data: {
        requisitionId: requisition._id?.toString(),
        rejected: rejectedItems.length,
        items: rejectedItems.map((item: any) => ({
          itemId: item._id?.toString(),
          itemName: item.itemName,
          status: item.status,
          departmentRejectedBy: item.departmentRejectedBy,
          departmentRejectedAt: item.departmentRejectedAt,
          departmentComments: item.departmentComments,
        })),
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    HR approve working tool item
// @route   PUT /api/requisitions/:id/items/:itemId/hr-approve
// @access  Private/HR_APPROVER
export const hrApproveItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id, itemId } = req.params;
    const { comments } = req.body;
    const userId = getUserId(req.user);

    const requisition = await Requisition.findById(id);
    if (!requisition) {
      res
        .status(404)
        .json({ success: false, message: "Requisition not found" });
      return;
    }

    // Verify user is HR approver
    const user = await db.query.users.findFirst({ where: eq(users.id, String(userId)), with: { department: true } });
    const isHrHOD =
      user &&
      (user.role === UserRole.HR_APPROVER ||
        user.role === UserRole.HHRA ||
        user.role === UserRole.HEAD_OF_HR ||
        (user.role === UserRole.DEPARTMENT_HEAD &&
          user.department &&
          ((user.department as any).code === "4" ||
            (user.department as any).code === "HR" ||
            (user.department as any).name?.toLowerCase().includes("hr") ||
            (user.department as any).name?.toLowerCase().includes("human resources"))));

    if (!user || !isHrHOD) {
      res.status(403).json({
        success: false,
        message: "Only HR Approvers can approve working tool items",
      });
      return;
    }

    // Find item
    const item = requisition.items.find(
      (i: any) => i._id?.toString() === itemId,
    );
    if (!item) {
      res.status(404).json({ success: false, message: "Item not found" });
      return;
    }

    // Verify item is a working tool
    if (!item.isWorkTool) {
      res.status(400).json({
        success: false,
        message: "Only working tools require HR approval",
      });
      return;
    }

    // Check if item is in HR_REVIEW status
    if (item.status !== ItemStatus.HR_REVIEW) {
      res.status(400).json({
        success: false,
        message: `Item must be in HR review status. Current status: ${item.status}`,
      });
      return;
    }

    // Update item HR approval status
    item.status = ItemStatus.HR_APPROVED;
    item.hrApprovedBy = userId!;
    item.hrApprovedAt = new Date();
    if (comments) {
      item.hrComments = comments;
    }

    if (!requisition.approvals) {
      requisition.approvals = [];
    }

    const hrApprovalIndex = requisition.approvals.findIndex(
      (a: any) => a.stage === "HR" || a.stage === "HHRA" || a.approverRole === "hhr",
    );

    const cleanComment = typeof comments === "string" && comments.trim() ? comments.trim() : "Working tool approved by HR";

    if (hrApprovalIndex !== -1) {
      requisition.approvals[hrApprovalIndex].status = "approved";
      requisition.approvals[hrApprovalIndex].approver = userId!;
      requisition.approvals[hrApprovalIndex].comments = cleanComment;
      requisition.approvals[hrApprovalIndex].timestamp = new Date();
    } else {
      requisition.approvals.push({
        stage: "HR",
        approver: userId!,
        approverRole: "hhr",
        status: "approved",
        comments: cleanComment,
        timestamp: new Date(),
      } as any);
    }

    await updateRequisitionStatusFromItems(requisition);
    await requisition.save();

    // Log item history
    await logItemHistory(
      requisition._id!.toString(),
      item._id!.toString(),
      "item_approved_by_hr",
      userId!.toString(),
      ItemStatus.HR_REVIEW,
      ItemStatus.HR_APPROVED,
      comments || "Working tool approved by HR",
    );

    res.status(200).json({
      success: true,
      message: "Working tool item approved by HR",
      data: { requisition, item },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    HR reject working tool item
// @route   PUT /api/requisitions/:id/items/:itemId/hr-reject
// @access  Private/HR_APPROVER
export const hrRejectItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id, itemId } = req.params;
    const { comments } = req.body;
    const userId = getUserId(req.user);

    if (!comments) {
      res.status(400).json({
        success: false,
        message: "Comments are required when rejecting an item",
      });
      return;
    }

    const requisition = await Requisition.findById(id);
    if (!requisition) {
      res
        .status(404)
        .json({ success: false, message: "Requisition not found" });
      return;
    }

    // Verify user is HR approver
    const user = await db.query.users.findFirst({ where: eq(users.id, String(userId)), with: { department: true } });
    const isHrHOD =
      user &&
      (user.role === UserRole.HR_APPROVER ||
        user.role === UserRole.HHRA ||
        user.role === UserRole.HEAD_OF_HR ||
        (user.role === UserRole.DEPARTMENT_HEAD &&
          user.department &&
          ((user.department as any).code === "4" ||
            (user.department as any).code === "HR" ||
            (user.department as any).name?.toLowerCase().includes("hr") ||
            (user.department as any).name?.toLowerCase().includes("human resources"))));

    if (!user || !isHrHOD) {
      res.status(403).json({
        success: false,
        message: "Only HR Approvers can reject working tool items",
      });
      return;
    }

    // Find item
    const item = requisition.items.find(
      (i: any) => i._id?.toString() === itemId,
    );
    if (!item) {
      res.status(404).json({ success: false, message: "Item not found" });
      return;
    }

    // Verify item is a working tool
    if (!item.isWorkTool) {
      res.status(400).json({
        success: false,
        message: "Only working tools require HR approval",
      });
      return;
    }

    // Check if item is in HR_REVIEW status
    if (item.status !== ItemStatus.HR_REVIEW) {
      res.status(400).json({
        success: false,
        message: `Item must be in HR review status. Current status: ${item.status}`,
      });
      return;
    }

    // Update item HR rejection status
    item.status = ItemStatus.HR_REJECTED;
    item.hrRejectedBy = userId!;
    item.hrRejectedAt = new Date();
    item.hrComments = comments;

    await updateRequisitionStatusFromItems(requisition);
    await requisition.save();

    // Log item history
    await logItemHistory(
      requisition._id!.toString(),
      item._id!.toString(),
      "item_rejected_by_hr",
      userId!.toString(),
      ItemStatus.HR_REVIEW,
      ItemStatus.HR_REJECTED,
      comments,
    );

    res.status(200).json({
      success: true,
      message: "Working tool item rejected by HR",
      data: { requisition, item },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get items ready for PM procurement review (approved by HOD/HR)
// @route   GET /api/requisitions/procurement-review/items
// @access  Private/ProcurementManager
export const getItemsForProcurementReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = getUserId(req.user);

    // Verify user is PM
    const user = await db.query.users.findFirst({ where: eq(users.id, String(userId)) });
    if (!user || user.role !== UserRole.PROCUREMENT_MANAGER) {
      res.status(403).json({
        success: false,
        message:
          "Only Procurement Managers can access procurement review items",
      });
      return;
    }

    // Find all requisitions with items ready for procurement review
    const requisitions = await Requisition.find({
      $or: [
        { status: RequisitionStatus.HOF_APPROVED },
        { status: RequisitionStatus.PROCUREMENT_REVIEW },
        { "approvals.stage": "Finance", "approvals.status": "approved" },
        { "approvals.approverRole": "hof", "approvals.status": "approved" },
      ],
    })
      .populate("requester", "firstName lastName email")
      .populate("department", "name")
      .populate("deliveryLocation", "name address")
      .sort({ createdAt: -1 });

    // Extract approved items
    const approvedItems: any[] = [];

    for (const req of requisitions) {
      for (const item of req.items) {
        if (
          item.status === ItemStatus.DEPARTMENT_APPROVED ||
          item.status === ItemStatus.HR_APPROVED
        ) {
          approvedItems.push({
            requisitionId: req._id,
            requisitionNumber: req.requisitionNumber,
            requisitionTitle: req.title,
            requester: req.requester,
            department: req.department,
            itemId: item._id,
            itemName: item.itemName,
            itemDescription: item.itemDescription,
            itemType: item.itemType,
            preferredBrand: item.preferredBrand,
            quantity: item.units,
            UOM: item.UOM,
            isWorkTool: item.isWorkTool,
            status: item.status,
            approvedBy: item.isWorkTool
              ? item.hrApprovedBy
              : item.departmentApprovedBy,
            approvedAt: item.isWorkTool
              ? item.hrApprovedAt
              : item.departmentApprovedAt,
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      count: approvedItems.length,
      data: approvedItems,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Move requisition to procurement review
// @route   PUT /api/requisitions/:id/procurement-review
// @access  Private/ProcurementManager
export const moveToProcurementReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = getUserId(req.user);

    // Verify user is PM
    const user = await db.query.users.findFirst({ where: eq(users.id, String(userId)) });
    if (!user || user.role !== UserRole.PROCUREMENT_MANAGER) {
      res.status(403).json({
        success: false,
        message:
          "Only Procurement Managers can move requisitions to procurement review",
      });
      return;
    }

    const requisition = await Requisition.findById(id);
    if (!requisition) {
      res
        .status(404)
        .json({ success: false, message: "Requisition not found" });
      return;
    }

    // Check if requisition has approved items
    const hasApprovedItems = requisition.items.some(
      (item: any) =>
        item.status === ItemStatus.DEPARTMENT_APPROVED ||
        item.status === ItemStatus.HR_APPROVED,
    );

    if (!hasApprovedItems) {
      res.status(400).json({
        success: false,
        message: "No approved items found in this requisition",
      });
      return;
    }

    // Update requisition status
    requisition.status = RequisitionStatus.PROCUREMENT_REVIEW;
    await requisition.save();

    // Create history record
    await requisitionHistoryModel.create({
      requisition: requisition._id,
      action: "status_changed_to_procurement_review",
      status: RequisitionStatus.PROCUREMENT_REVIEW,
      user: userId!.toString(),
      details: "Moved to procurement review by PM",
    });

    res.status(200).json({
      success: true,
      message: "Requisition moved to procurement review",
      data: requisition,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record payment for requisition
// @route   POST /api/requisitions/:id/payment
// @access  Private/Finance/Admin
export const recordPayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentAmount, paymentReference, paymentNotes } = req.body;
    const userId = getUserId(req.user);

    // Verify user has permission (Finance or Admin)
    const user = await db.query.users.findFirst({ where: eq(users.id, String(userId)), with: { department: true } });
    const isFinanceHOD =
      user &&
      (user.role === UserRole.HEAD_OF_FINANCE ||
        (user.role === UserRole.DEPARTMENT_HEAD &&
          user.department &&
          ((user.department as any).code === "FIN" ||
            (user.department as any).name?.toLowerCase() === "finance")));

    if (
      !user ||
      (!isFinanceHOD &&
        user.role !== UserRole.ADMIN &&
        user.role !== UserRole.SUPER_ADMIN)
    ) {
      res.status(403).json({
        success: false,
        message: "Only Finance or Admin users can record payments",
      });
      return;
    }

    const requisition = await Requisition.findById(id);
    if (!requisition) {
      res
        .status(404)
        .json({ success: false, message: "Requisition not found" });
      return;
    }

    // Validate requisition is delivered
    if (
      requisition.status !== RequisitionStatus.DELIVERED &&
      requisition.status !== RequisitionStatus.PARTIALLY_DELIVERED
    ) {
      res.status(400).json({
        success: false,
        message: "Can only record payment for delivered requisitions",
      });
      return;
    }

    if (!paymentAmount || paymentAmount <= 0) {
      res.status(400).json({
        success: false,
        message: "Valid payment amount is required",
      });
      return;
    }

    // Update payment information
    const currentPayment = requisition.paymentAmount || 0;
    requisition.paymentAmount = currentPayment + paymentAmount;
    requisition.paymentDate = new Date();
    requisition.paymentReference = paymentReference || "";
    requisition.paymentNotes = paymentNotes || "";
    requisition.paymentBy = userId!;

    // Determine payment status (you'd need to know total amount due)
    // For now, we'll set it based on whether this is a partial or full payment
    requisition.paymentStatus = "partially_paid"; // Update this logic as needed

    await requisition.save();

    // Create history record
    await requisitionHistoryModel.create({
      requisition: requisition._id,
      action: "payment_recorded",
      status: requisition.status,
      user: userId!.toString(),
      details: `Payment recorded: ${paymentAmount}. ${paymentNotes || ""}`,
    });

    res.status(200).json({
      success: true,
      message: "Payment recorded successfully",
      data: {
        requisition,
        paymentAmount,
        totalPaid: requisition.paymentAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update payment status
// @route   PUT /api/requisitions/:id/payment-status
// @access  Private/Finance/Admin
export const updatePaymentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;
    const userId = getUserId(req.user);

    // Verify user has permission
    const user = await db.query.users.findFirst({ where: eq(users.id, String(userId)), with: { department: true } });
    const isFinanceHOD =
      user &&
      (user.role === UserRole.HEAD_OF_FINANCE ||
        (user.role === UserRole.DEPARTMENT_HEAD &&
          user.department &&
          ((user.department as any).code === "FIN" ||
            (user.department as any).name?.toLowerCase() === "finance")));

    if (
      !user ||
      (!isFinanceHOD &&
        user.role !== UserRole.ADMIN &&
        user.role !== UserRole.SUPER_ADMIN)
    ) {
      res.status(403).json({
        success: false,
        message: "Only Finance or Admin users can update payment status",
      });
      return;
    }

    const requisition = await Requisition.findById(id);
    if (!requisition) {
      res
        .status(404)
        .json({ success: false, message: "Requisition not found" });
      return;
    }

    if (
      !paymentStatus ||
      !["unpaid", "partially_paid", "fully_paid"].includes(paymentStatus)
    ) {
      res.status(400).json({
        success: false,
        message:
          "Valid payment status is required (unpaid, partially_paid, fully_paid)",
      });
      return;
    }

    const oldStatus = requisition.paymentStatus;
    requisition.paymentStatus = paymentStatus;

    // If marking as fully paid, mark requisition as completed
    if (paymentStatus === "fully_paid") {
      requisition.status = RequisitionStatus.COMPLETED;
    }

    await requisition.save();

    // Create history record
    await requisitionHistoryModel.create({
      requisition: requisition._id,
      action: "payment_status_updated",
      status: requisition.status,
      user: userId!.toString(),
      details: `Payment status changed from ${oldStatus} to ${paymentStatus}`,
    });

    res.status(200).json({
      success: true,
      message: "Payment status updated successfully",
      data: requisition,
    });
  } catch (error) {
    next(error);
  }
};
