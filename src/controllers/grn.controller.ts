import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import GRN from "../models/grn.model";
import PurchaseOrder from "../models/purchaseOrder.model";
import Requisition from "../models/requisition.model";
import User from "../models/user.model";
import RFQ from "../models/rfq.model";
import { db } from "../db";
import { grns } from "../db/schema";
import { eq } from "drizzle-orm";
import {
  GRNStatus,
  PurchaseOrderStatus,
  RequisitionStatus,
  ItemStatus,
  UserRole,
  RFQStatus,
} from "../types/enums";
import { getUserId } from "../utils/objectIdHelper";

// @desc    Create GRN from Purchase Order
// @route   POST /api/purchase-orders/:poId/grn
// @access  Private (Store Manager)
export const createGRNFromPO = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { poId } = req.params;
    const { items, generalRemarks, receiverId } = req.body;
    const userId = getUserId(req.user);

    // Validate user is Store or Warehouse Manager (Requirement I2)
    const user = await User.findById(userId);
    const isStoreOrWarehouseManager =
      user &&
      (user.role === UserRole.STORE_MANAGER ||
        user.role === UserRole.WAREHOUSE_MANAGER ||
        user.role === UserRole.ADMIN ||
        user.role === UserRole.SUPER_ADMIN);

    if (!user || !isStoreOrWarehouseManager) {
      await session.abortTransaction();
      res.status(403).json({
        success: false,
        message: "Only Store and Warehouse Managers can create GRNs",
      });
      return;
    }

    // Get Purchase Order
    const po = await PurchaseOrder.findById(poId)
      .populate("requisition")
      .session(session);

    if (!po) {
      await session.abortTransaction();
      res
        .status(404)
        .json({ success: false, message: "Purchase Order not found" });
      return;
    }

    // Validate PO is approved
    if (po.status !== PurchaseOrderStatus.APPROVED) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: "Purchase Order must be approved before creating GRN",
      });
      return;
    }

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      res
        .status(400)
        .json({ success: false, message: "At least one item is required" });
      return;
    }

    // Get requisition to determine default receiver
    const requisition = await Requisition.findById(po.requisition).session(
      session
    );
    if (!requisition) {
      await session.abortTransaction();
      res
        .status(404)
        .json({ success: false, message: "Related requisition not found" });
      return;
    }

    // Use provided receiverId or default to requester
    const receiver = receiverId || requisition.requester;

    // Validate receiver exists
    const receiverUser = await User.findById(receiver);
    if (!receiverUser) {
      await session.abortTransaction();
      res.status(404).json({ success: false, message: "Receiver not found" });
      return;
    }

    // Get existing GRNs for this PO to calculate previously received quantities
    const existingGrns = await GRN.find({
      purchaseOrder: poId,
      status: { $ne: GRNStatus.REJECTED }
    }).session(session);

    const deliveredQuantitiesMap = new Map<string, number>();
    for (const exGrn of existingGrns) {
      for (const exItem of exGrn.items) {
        const idStr = exItem.itemId.toString();
        deliveredQuantitiesMap.set(
          idStr,
          (deliveredQuantitiesMap.get(idStr) || 0) + exItem.quantityReceived
        );
      }
    }

    // Create GRN items from request with PO validation
    const grnItems = [];
    for (const item of items) {
      // Find corresponding PO item for validation
      const poItem = po.items.find(
        (pi: any) => pi.itemId?.toString() === item.itemId.toString()
      );

      if (!poItem) {
        await session.abortTransaction();
        res.status(400).json({
          success: false,
          message: `Item with ID ${item.itemId} not found in this Purchase Order`,
        });
        return;
      }

      const previouslyReceived = deliveredQuantitiesMap.get(poItem.itemId?.toString() || "") || 0;
      const remainingQty = poItem.quantity - previouslyReceived;
      const quantityReceived = item.quantityReceived || 0;

      if (quantityReceived < 0) {
        await session.abortTransaction();
        res.status(400).json({
          success: false,
          message: `Invalid quantity received for item ${poItem.itemDescription}`,
        });
        return;
      }

      if (quantityReceived > remainingQty) {
        await session.abortTransaction();
        res.status(400).json({
          success: false,
          message: `Quantity received (${quantityReceived}) for item ${poItem.itemDescription} exceeds remaining quantity (${remainingQty})`,
        });
        return;
      }

      const quantityOrdered = item.quantityOrdered || poItem.quantity || 0;
      const quantityVariance = quantityReceived - quantityOrdered;
      const hasQuantityDiscrepancy = Math.abs(quantityVariance) > 0;

      grnItems.push({
        itemId: item.itemId,
        itemDescription: item.itemDescription || poItem.itemDescription,
        quantityOrdered,
        quantityReceived,
        uom: item.uom || poItem.uom,
        condition: item.condition || "Good",
        remarks: item.remarks || "",
        // Validation fields from PO
        unitPriceFromPO: poItem.unitPrice || 0,
        totalPriceFromPO: poItem.totalPrice || 0,
        quantityVariance,
        hasQuantityDiscrepancy,
      });
    }

    // Check for discrepancies and add warnings to general remarks
    const discrepancies = grnItems.filter(
      (item: any) => item.hasQuantityDiscrepancy
    );
    let enhancedRemarks = generalRemarks || "";

    if (discrepancies.length > 0) {
      const discrepancyWarning = `\n\n⚠️ QUANTITY DISCREPANCIES DETECTED:\n${discrepancies
        .map(
          (item: any) =>
            `- ${item.itemDescription}: Ordered ${
              item.quantityOrdered
            }, Received ${item.quantityReceived} (Variance: ${
              item.quantityVariance > 0 ? "+" : ""
            }${item.quantityVariance})`
        )
        .join("\n")}`;
      enhancedRemarks += discrepancyWarning;
    }

    // Create GRN
    const grn = new GRN({
      purchaseOrder: poId,
      requisition: po.requisition,
      items: grnItems,
      generalRemarks: enhancedRemarks,
      createdBy: userId,
      receiver: receiver,
      approvals: [
        {
          approver: receiver,
          approverRole: "receiver",
          status: "pending",
        },
      ],
      status: GRNStatus.PENDING_RECEIVER_CONFIRMATION,
    });

    await grn.save({ session });

    await session.commitTransaction();

    const responseMessage =
      discrepancies.length > 0
        ? `GRN created with ${discrepancies.length} quantity discrepancy(ies). Please review before final confirmation.`
        : "GRN created successfully";

    res.status(201).json({
      success: true,
      message: responseMessage,
      data: grn,
      warnings:
        discrepancies.length > 0
          ? {
              hasDiscrepancies: true,
              discrepancyCount: discrepancies.length,
              discrepancies: discrepancies.map((item: any) => ({
                itemDescription: item.itemDescription,
                quantityOrdered: item.quantityOrdered,
                quantityReceived: item.quantityReceived,
                variance: item.quantityVariance,
              })),
            }
          : null,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Get all GRNs for a Purchase Order
// @route   GET /api/purchase-orders/:poId/grns
// @access  Private
export const getGRNsByPO = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { poId } = req.params;

    try {
      const grnList = await GRN.find({ purchaseOrder: poId })
        .populate("createdBy", "firstName lastName email")
        .populate("receiver", "firstName lastName email")
        .populate("approvals.approver", "firstName lastName email")
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        count: grnList.length,
        data: grnList,
      });
      return;
    } catch (e) {
      // Fallback to PostgreSQL
    }

    const pgGrns = await db.query.grns.findMany({
      where: eq(grns.purchaseOrderId, String(poId)),
    });

    const data = pgGrns.map((g) => ({
      _id: g.id,
      grnNumber: g.grnNumber,
      purchaseOrder: g.purchaseOrderId,
      requisition: g.requisitionId,
      items: g.items,
      generalRemarks: g.generalRemarks,
      createdBy: g.createdById,
      receiver: g.receiverId,
      approvals: g.approvals,
      status: g.status,
      deliveredAt: g.deliveredAt,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    }));

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single GRN
// @route   GET /api/grns/:grnId
// @access  Private
export const getGRNById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { grnId } = req.params;

    try {
      const grn = await GRN.findById(grnId)
        .populate("purchaseOrder")
        .populate("requisition", "requisitionNumber title")
        .populate("createdBy", "firstName lastName email")
        .populate("receiver", "firstName lastName email")
        .populate("approvals.approver", "firstName lastName email");

      if (grn) {
        res.status(200).json({
          success: true,
          data: grn,
        });
        return;
      }
    } catch (error) {
      // Fallback to PostgreSQL
    }

    const pgGrn = await db.query.grns.findFirst({
      where: eq(grns.id, String(grnId)),
    });

    if (!pgGrn) {
      res.status(404).json({ success: false, message: "GRN not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        _id: pgGrn.id,
        grnNumber: pgGrn.grnNumber,
        purchaseOrder: pgGrn.purchaseOrderId,
        requisition: pgGrn.requisitionId,
        items: pgGrn.items,
        generalRemarks: pgGrn.generalRemarks,
        createdBy: pgGrn.createdById,
        receiver: pgGrn.receiverId,
        approvals: pgGrn.approvals,
        status: pgGrn.status,
        deliveredAt: pgGrn.deliveredAt,
        createdAt: pgGrn.createdAt,
        updatedAt: pgGrn.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Receiver confirms GRN
// @route   POST /api/grns/:grnId/receiver-confirm
// @access  Private (Receiver)
export const receiverConfirmGRN = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { grnId } = req.params;
    const { comments } = req.body;
    const userId = getUserId(req.user);

    const grn = await GRN.findById(grnId).session(session);
    if (!grn) {
      await session.abortTransaction();
      res.status(404).json({ success: false, message: "GRN not found" });
      return;
    }

    // Validate user is the receiver
    if (!userId || grn.receiver.toString() !== userId.toString()) {
      await session.abortTransaction();
      res.status(403).json({
        success: false,
        message: "Only the assigned receiver can confirm this GRN",
      });
      return;
    }

    // Validate GRN status
    if (grn.status !== GRNStatus.PENDING_RECEIVER_CONFIRMATION) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: "GRN is not pending receiver confirmation",
      });
      return;
    }

    // Update receiver approval
    const receiverApproval = grn.approvals.find(
      (approval) => approval.approverRole === "receiver"
    );

    if (receiverApproval) {
      receiverApproval.status = "approved";
      receiverApproval.approvedAt = new Date();
      receiverApproval.comments = comments || "";
    }

    // Add PM approval requirement
    const pmUser = await User.findOne({
      role: UserRole.PROCUREMENT_MANAGER,
    }).session(session);
    if (pmUser) {
      grn.approvals.push({
        approver: pmUser._id as mongoose.Types.ObjectId,
        approverRole: "pm",
        status: "pending",
      } as any);
    }

    // Update GRN status
    grn.status = GRNStatus.PENDING_PM_CONFIRMATION;
    await grn.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "GRN confirmed by receiver, awaiting PM confirmation",
      data: grn,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Receiver rejects GRN
// @route   POST /api/grns/:grnId/receiver-reject
// @access  Private (Receiver)
export const receiverRejectGRN = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { grnId } = req.params;
    const { comments } = req.body;
    const userId = getUserId(req);

    const grn = await GRN.findById(grnId).session(session);
    if (!grn) {
      await session.abortTransaction();
      res.status(404).json({ success: false, message: "GRN not found" });
      return;
    }

    // Validate user is the receiver
    if (!userId || grn.receiver.toString() !== userId.toString()) {
      await session.abortTransaction();
      res.status(403).json({
        success: false,
        message: "Only the assigned receiver can reject this GRN",
      });
      return;
    }

    // Validate GRN status
    if (grn.status !== GRNStatus.PENDING_RECEIVER_CONFIRMATION) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: "GRN is not pending receiver confirmation",
      });
      return;
    }

    // Update receiver approval
    const receiverApproval = grn.approvals.find(
      (approval) => approval.approverRole === "receiver"
    );

    if (receiverApproval) {
      receiverApproval.status = "rejected";
      receiverApproval.approvedAt = new Date();
      receiverApproval.comments = comments || "";
    }

    // Update GRN status
    grn.status = GRNStatus.REJECTED;
    await grn.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "GRN rejected by receiver",
      data: grn,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    PM final confirmation of GRN
// @route   POST /api/grns/:grnId/pm-confirm
// @access  Private (PM)
export const pmConfirmGRN = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { grnId } = req.params;
    const { comments } = req.body;
    const userId = getUserId(req.user);

    // Validate user is PM
    const user = await User.findById(userId);
    if (!user || user.role !== UserRole.PROCUREMENT_MANAGER) {
      await session.abortTransaction();
      res.status(403).json({
        success: false,
        message: "Only Procurement Managers can provide final GRN confirmation",
      });
      return;
    }

    const grn = await GRN.findById(grnId)
      .populate("purchaseOrder")
      .populate("requisition")
      .session(session);

    if (!grn) {
      await session.abortTransaction();
      res.status(404).json({ success: false, message: "GRN not found" });
      return;
    }

    // Validate GRN status
    if (grn.status !== GRNStatus.PENDING_PM_CONFIRMATION) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: "GRN is not pending PM confirmation",
      });
      return;
    }

    // Update PM approval
    const pmApproval = grn.approvals.find(
      (approval) => approval.approverRole === "pm"
    );

    if (pmApproval) {
      pmApproval.status = "approved";
      pmApproval.approvedAt = new Date();
      pmApproval.comments = comments || "";
    }

    // Update GRN status
    grn.status = GRNStatus.DELIVERED;
    grn.deliveredAt = new Date();
    await grn.save({ session });

    // Fetch all GRNs for this PO that have status GRNStatus.DELIVERED
    const deliveredGrns = await GRN.find({
      purchaseOrder: grn.purchaseOrder,
      status: GRNStatus.DELIVERED,
    }).session(session);

    // Sum up delivered quantities
    const deliveredQtyByPoItemId = new Map<string, number>();
    for (const dGrn of deliveredGrns) {
      for (const item of dGrn.items) {
        const idStr = item.itemId.toString();
        deliveredQtyByPoItemId.set(idStr, (deliveredQtyByPoItemId.get(idStr) || 0) + item.quantityReceived);
      }
    }

    // Update PO status to completed if all items fully delivered
    const po = await PurchaseOrder.findById(grn.purchaseOrder).session(session);
    if (!po) {
      await session.abortTransaction();
      res.status(404).json({ success: false, message: "Purchase Order not found" });
      return;
    }

    let allItemsFullyDelivered = true;
    for (const poItem of po.items) {
      const totalDelivered = deliveredQtyByPoItemId.get(poItem.itemId?.toString() || "") || 0;
      if (totalDelivered < poItem.quantity) {
        allItemsFullyDelivered = false;
      }
    }

    if (allItemsFullyDelivered) {
      po.status = PurchaseOrderStatus.COMPLETED;
    } else {
      po.status = PurchaseOrderStatus.APPROVED;
    }
    await po.save({ session });

    // Update RFQ status to Completed if all items fully delivered
    if (po.rfq) {
      const rfq = await RFQ.findById(po.rfq).session(session);
      if (rfq && allItemsFullyDelivered) {
        rfq.status = RFQStatus.COMPLETED;
        await rfq.save({ session });
      }
    }

    // Update requisition and item statuses
    const requisition = await Requisition.findById(grn.requisition).session(
      session
    );
    if (requisition) {
      // Update item statuses to DELIVERED for fully delivered items
      for (const reqItem of requisition.items) {
        const poItem = po.items.find(
          (pi: any) => pi.itemId?.toString() === reqItem._id?.toString()
        );
        if (poItem) {
          const totalDelivered = deliveredQtyByPoItemId.get(poItem.itemId?.toString() || "") || 0;
          if (totalDelivered >= poItem.quantity) {
            reqItem.status = ItemStatus.DELIVERED;
          }
        }
      }

      if (allItemsFullyDelivered) {
        requisition.status = RequisitionStatus.DELIVERED;
      } else {
        requisition.status = RequisitionStatus.PARTIALLY_DELIVERED;
      }

      await requisition.save({ session });
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "GRN confirmed successfully. Delivery complete.",
      data: grn,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Update GRN (before receiver confirmation)
// @route   PUT /api/grns/:grnId
// @access  Private (Store Manager)
export const updateGRN = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { grnId } = req.params;
    const userId = getUserId(req.user);

    const user = await User.findById(userId);
    const isStoreOrWarehouseManager =
      user &&
      (user.role === UserRole.STORE_MANAGER ||
        user.role === UserRole.WAREHOUSE_MANAGER ||
        user.role === UserRole.ADMIN ||
        user.role === UserRole.SUPER_ADMIN);

    if (!user || !isStoreOrWarehouseManager) {
      res.status(403).json({
        success: false,
        message: "Only Store and Warehouse Managers can update GRNs",
      });
      return;
    }

    const grn = await GRN.findById(grnId);
    if (!grn) {
      res.status(404).json({ success: false, message: "GRN not found" });
      return;
    }

    // Only allow editing if GRN is in DRAFT or PENDING_RECEIVER_CONFIRMATION status
    if (
      grn.status !== GRNStatus.DRAFT &&
      grn.status !== GRNStatus.PENDING_RECEIVER_CONFIRMATION
    ) {
      res.status(400).json({
        success: false,
        message: "GRN cannot be edited in current status",
      });
      return;
    }

    // Validate receiver if changed
    if (req.body.receiver) {
      const receiverUser = await User.findById(req.body.receiver);
      if (!receiverUser) {
        res.status(404).json({ success: false, message: "Receiver not found" });
        return;
      }
      grn.receiver = req.body.receiver;

      const receiverApproval = grn.approvals.find(
        (approval) => approval.approverRole === "receiver"
      );
      if (receiverApproval) {
        receiverApproval.approver = req.body.receiver;
        receiverApproval.status = "pending";
        receiverApproval.approvedAt = undefined;
        receiverApproval.comments = undefined;
      }
    }

    if (req.body.generalRemarks !== undefined) {
      grn.generalRemarks = req.body.generalRemarks;
    }

    // If items are being updated, validate them
    if (req.body.items) {
      const po = await PurchaseOrder.findById(grn.purchaseOrder);
      if (!po) {
        res.status(404).json({ success: false, message: "Purchase Order not found" });
        return;
      }

      // Query other GRNs for this PO (excluding the current one we are updating)
      const otherGrns = await GRN.find({
        purchaseOrder: grn.purchaseOrder,
        _id: { $ne: grn._id },
        status: { $ne: GRNStatus.REJECTED }
      });

      const deliveredQuantitiesMap = new Map<string, number>();
      for (const exGrn of otherGrns) {
        for (const exItem of exGrn.items) {
          const idStr = exItem.itemId.toString();
          deliveredQuantitiesMap.set(
            idStr,
            (deliveredQuantitiesMap.get(idStr) || 0) + exItem.quantityReceived
          );
        }
      }

      const grnItems = [];
      for (const item of req.body.items) {
        const poItem = po.items.find(
          (pi: any) => pi.itemId?.toString() === item.itemId.toString()
        );
        if (!poItem) {
          res.status(400).json({
            success: false,
            message: `Item with ID ${item.itemId} not found in this Purchase Order`,
          });
          return;
        }

        const previouslyReceived = deliveredQuantitiesMap.get(poItem.itemId?.toString() || "") || 0;
        const remainingQty = poItem.quantity - previouslyReceived;
        const quantityReceived = item.quantityReceived || 0;

        if (quantityReceived < 0) {
          res.status(400).json({
            success: false,
            message: `Invalid quantity received for item ${poItem.itemDescription}`,
          });
          return;
        }

        if (quantityReceived > remainingQty) {
          res.status(400).json({
            success: false,
            message: `Quantity received (${quantityReceived}) for item ${poItem.itemDescription} exceeds remaining quantity (${remainingQty})`,
          });
          return;
        }

        const quantityOrdered = item.quantityOrdered || poItem.quantity || 0;
        const quantityVariance = quantityReceived - quantityOrdered;
        const hasQuantityDiscrepancy = Math.abs(quantityVariance) > 0;

        grnItems.push({
          itemId: item.itemId,
          itemDescription: item.itemDescription || poItem.itemDescription,
          quantityOrdered,
          quantityReceived,
          uom: item.uom || poItem.uom,
          condition: item.condition || "Good",
          remarks: item.remarks || "",
          unitPriceFromPO: poItem.unitPrice || 0,
          totalPriceFromPO: poItem.totalPrice || 0,
          quantityVariance,
          hasQuantityDiscrepancy,
        });
      }

      grn.items = grnItems as any;

      // Check for discrepancies and add warnings to general remarks
      const discrepancies = grnItems.filter(
        (item: any) => item.hasQuantityDiscrepancy
      );
      if (discrepancies.length > 0) {
        const discrepancyWarning = `\n\n⚠️ QUANTITY DISCREPANCIES DETECTED:\n${discrepancies
          .map(
            (item: any) =>
              `- ${item.itemDescription}: Ordered ${
                item.quantityOrdered
              }, Received ${item.quantityReceived} (Variance: ${
                item.quantityVariance > 0 ? "+" : ""
              }${item.quantityVariance})`
          )
          .join("\n")}`;
        grn.generalRemarks = (grn.generalRemarks || "") + discrepancyWarning;
      }
    }

    await grn.save();

    res.status(200).json({
      success: true,
      message: "GRN updated successfully",
      data: grn,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all GRNs (with filters)
// @route   GET /api/grns
// @access  Private
export const getAllGRNs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startIndex = (page - 1) * limit;

    const query: any = {};

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by PO
    if (req.query.purchaseOrder) {
      query.purchaseOrder = req.query.purchaseOrder;
    }

    // Filter by requisition
    if (req.query.requisition) {
      query.requisition = req.query.requisition;
    }

    const total = await GRN.countDocuments(query);
    const grns = await GRN.find(query)
      .skip(startIndex)
      .limit(limit)
      .populate("purchaseOrder", "poNumber")
      .populate("requisition", "requisitionNumber title")
      .populate("createdBy", "firstName lastName email")
      .populate("receiver", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: grns.length,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      data: grns,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete GRN
// @route   DELETE /api/grns/:grnId
// @access  Private (Store Manager)
export const deleteGRN = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { grnId } = req.params;
    const userId = getUserId(req.user);

    const user = await User.findById(userId);
    const isStoreOrWarehouseManager =
      user &&
      (user.role === UserRole.STORE_MANAGER ||
        user.role === UserRole.WAREHOUSE_MANAGER ||
        user.role === UserRole.ADMIN ||
        user.role === UserRole.SUPER_ADMIN);

    if (!user || !isStoreOrWarehouseManager) {
      res.status(403).json({
        success: false,
        message: "Only Store and Warehouse Managers can delete GRNs",
      });
      return;
    }

    const grn = await GRN.findById(grnId);
    if (!grn) {
      res.status(404).json({ success: false, message: "GRN not found" });
      return;
    }

    // Only allow deletion if GRN is in DRAFT or REJECTED status
    if (grn.status !== GRNStatus.DRAFT && grn.status !== GRNStatus.REJECTED) {
      res.status(400).json({
        success: false,
        message: "Only draft or rejected GRNs can be deleted",
      });
      return;
    }

    await GRN.findByIdAndDelete(grnId);

    res.status(200).json({
      success: true,
      message: "GRN deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate GRN PDF (delivered GRNs only)
// @route   GET /api/grns/:grnId/pdf
// @access  Private
export const generateGRNPDF = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const grn = await GRN.findById(req.params.grnId)
      .populate("purchaseOrder", "poNumber vendor deliveryDate")
      .populate("requisition", "requisitionNumber")
      .populate("createdBy", "firstName lastName")
      .populate("receiver", "firstName lastName department");

    if (!grn) {
      res.status(404).json({ success: false, message: "GRN not found" });
      return;
    }

    // A GRN is an official receiving document only after both confirmations.
    if (grn.status !== GRNStatus.DELIVERED) {
      res.status(400).json({
        success: false,
        message: "GRN must be fully delivered before downloading its PDF",
      });
      return;
    }

    const po = grn.purchaseOrder as any;
    const receiver = grn.receiver as any;
    const vendor = po?.vendor as any;
    const doc = new PDFDocument({ margin: 54, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="GRN_${grn.grnNumber}.pdf"`);
    doc.pipe(res);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const formatDate = (value?: Date) => value ? new Date(value).toLocaleDateString() : "";
    const nameOf = (user: any) => `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
    const value = (item: any, key: string) => String(item ?? key);
    const line = (y: number) => doc.moveTo(left, y).lineTo(right, y).lineWidth(1.2).stroke();

    doc.font("Helvetica-Bold").fontSize(18).text("GOODS RECEIVED NOTE", { align: "center" });
    doc.moveDown(0.65);
    line(doc.y);
    doc.moveDown(2.1);
    doc.fontSize(10).text(`GRN NUMBER: ${grn.grnNumber}`);
    doc.text(`DATE: ${formatDate(grn.deliveredAt || grn.createdAt)}`);
    doc.moveDown(1.5);

    const blockY = doc.y;
    const rightBlock = left + 285;
    doc.font("Helvetica-Bold").text("DELIVERY INFORMATION:", left, blockY);
    doc.text("SUPPLIER INFORMATION:", rightBlock, blockY);
    doc.font("Helvetica").fontSize(9.5);
    doc.text(`DELIVERY NOTE NUMBER: ${po?.poNumber || ""}`, left, blockY + 30);
    doc.text(`DELIVERY DATE: ${formatDate(po?.deliveryDate || grn.deliveredAt)}`, left, blockY + 47);
    doc.text(`CARRIER/DRIVER NAME: ${nameOf(grn.createdBy)}`, left, blockY + 64);
    doc.text(`SUPPLIER NAME: ${vendor?.name || ""}`, rightBlock, blockY + 30);
    doc.text(`SUPPLIER ADDRESS: ${vendor?.address || ""}`, rightBlock, blockY + 47, { width: right - rightBlock });
    doc.text(`SUPPLIER CONTACT INFORMATION: ${vendor?.phone || vendor?.email || ""}`, rightBlock, blockY + 64, { width: right - rightBlock });
    doc.y = blockY + 115;
    doc.font("Helvetica-Bold").fontSize(10).text("RECEIVED BY:");
    doc.moveDown(1.1);
    doc.text(`Name: ${nameOf(receiver)}`);
    doc.text(`Receiving Department: ${receiver?.department?.name || receiver?.department || ""}`);
    doc.moveDown(1);

    const columns = [left, left + 63, left + 172, left + 262, left + 352, left + 447, right];
    const tableTop = doc.y;
    const headers = ["ITEM", "DESCRIPTION", "UNIT OF\nMEASURE", "QUANTITY\nORDERED", "QUANTITY\nRECEIVED", "UNIT\nPRICE", "TOTAL\nPRICE"];
    const rowHeight = 32;
    const drawTableHeader = (top: number) => {
      doc.rect(left, top, right - left, 18).fill("#0d47a1");
      doc.fillColor("white").font("Helvetica-Bold").fontSize(10).text("RECEIVED ITEMS", left, top + 3, { width: right - left, align: "center" });
      doc.fillColor("black").rect(left, top + 18, right - left, rowHeight).stroke();
      headers.forEach((header, index) => {
        doc.text(header, columns[index] + 4, top + 21, { width: columns[index + 1] - columns[index] - 8 });
        doc.moveTo(columns[index], top + 18).lineTo(columns[index], top + 18 + rowHeight).stroke();
      });
      doc.moveTo(right, top + 18).lineTo(right, top + 18 + rowHeight).stroke();
    };
    const rows = grn.items;
    let tableY = tableTop;
    drawTableHeader(tableY);
    tableY += 18 + rowHeight;
    doc.font("Helvetica").fontSize(8.5);
    rows.forEach((item, index) => {
      if (tableY + rowHeight > doc.page.height - 110) {
        doc.addPage();
        tableY = doc.page.margins.top;
        drawTableHeader(tableY);
        tableY += 18 + rowHeight;
      }
      doc.rect(left, tableY, right - left, rowHeight).stroke();
      columns.forEach((column, columnIndex) => doc.moveTo(column, tableY).lineTo(column, tableY + rowHeight).stroke());
      const unitPrice = item.unitPriceFromPO || 0;
      const totalPrice = unitPrice * item.quantityReceived;
      [index + 1, item.itemDescription, item.uom, item.quantityOrdered, item.quantityReceived, unitPrice.toFixed(2), totalPrice.toFixed(2)]
        .forEach((cell, columnIndex) => doc.text(value(cell, ""), columns[columnIndex] + 4, tableY + 5, { width: columns[columnIndex + 1] - columns[columnIndex] - 8 }));
      tableY += rowHeight;
    });

    const totalAmount = grn.items.reduce((sum, item) => sum + ((item.unitPriceFromPO || 0) * item.quantityReceived), 0);
    doc.y = tableY + 18;
    const totalsY = doc.y;
    const totalsLeft = right - 225;
    doc.rect(totalsLeft, totalsY, 125, 18).stroke();
    doc.rect(totalsLeft + 125, totalsY, 100, 18).stroke();
    doc.font("Helvetica-Bold").fontSize(10).text("TOTAL ITEMS", totalsLeft + 6, totalsY + 3);
    doc.font("Helvetica").text(String(grn.items.length), totalsLeft + 131, totalsY + 3);
    doc.rect(totalsLeft, totalsY + 18, 125, 18).stroke();
    doc.rect(totalsLeft + 125, totalsY + 18, 100, 18).stroke();
    doc.font("Helvetica-Bold").text("TOTAL AMOUNT", totalsLeft + 6, totalsY + 21);
    doc.font("Helvetica").text(totalAmount.toFixed(2), totalsLeft + 131, totalsY + 21);
    doc.y = totalsY + 58;
    doc.font("Helvetica-Bold").fontSize(10).text("RECEIVED CONDITION:");
    doc.font("Helvetica").text([...new Set(grn.items.map((item) => item.condition))].join(", "));
    doc.moveDown(1.5);
    doc.font("Helvetica-Bold").text("COMMENTS:");
    doc.font("Helvetica").text(grn.generalRemarks || "");
    doc.end();
  } catch (error) {
    next(error);
  }
};
