import { Request, Response, NextFunction } from "express";
import { startSession } from "../utils/objectIdHelper";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import JCF, { IJCF } from "../models/jcf.model";
import PurchaseOrder from "../models/purchaseOrder.model";
import Requisition from "../models/requisition.model";
import User from "../models/user.model";
import { db } from "../db";
import { jcfs } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import {
  JCFStatus,
  PurchaseOrderStatus,
  UserRole,
} from "../types/enums";
import { getUserId } from "../utils/objectIdHelper";

// @desc    Create JCF for approved service PO
// @route   POST /api/purchase-orders/:poId/jcf
// @access  Private (Procurement Manager only)
export const createJCFFromPO = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const session = await startSession();
  session.startTransaction();

  try {
    const { poId } = req.params;
    const {
      serviceDescription,
      completionEvidence,
      rating,
      approverId,
      attachments,
    } = req.body;
    const userId = getUserId(req.user);

    // Validate user is PM or Admin
    const user = await User.findById(userId);
    if (
      !user ||
      (user.role !== UserRole.PROCUREMENT_MANAGER &&
        user.role !== UserRole.ADMIN &&
        user.role !== UserRole.SUPER_ADMIN)
    ) {
      await session.abortTransaction();
      res.status(403).json({
        success: false,
        message: "Only Procurement Managers can create Job Completion Forms",
      });
      return;
    }

    // Get Purchase Order
    const po = await PurchaseOrder.findById(poId)
      .populate("requisition")
      .session(session);

    if (!po) {
      await session.abortTransaction();
      res.status(404).json({ success: false, message: "Purchase Order not found" });
      return;
    }

    // Validate PO is approved
    if (po.status !== PurchaseOrderStatus.APPROVED) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: "Purchase Order must be approved before creating JCF",
      });
      return;
    }

    // Validate service description
    if (!serviceDescription || typeof serviceDescription !== "string" || serviceDescription.trim() === "") {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: "Service description is required",
      });
      return;
    }

    // Resolve requester approver
    const requisition = await Requisition.findById(po.requisition).session(session);
    if (!requisition) {
      await session.abortTransaction();
      res.status(404).json({ success: false, message: "Requisition not found for this PO" });
      return;
    }

    const selectedApproverId = approverId || requisition.requester;
    const approverUser = await User.findById(selectedApproverId).session(session);

    if (!approverUser || !approverUser.isActive) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: "Selected requester approver is invalid or inactive",
      });
      return;
    }

    // Create JCF
    const [newJcf] = await JCF.create(
      [
        {
          purchaseOrder: po._id,
          requisition: po.requisition,
          vendor: po.vendor,
          createdBy: user._id,
          approver: approverUser._id,
          serviceDescription: serviceDescription.trim(),
          completionEvidence: completionEvidence || "",
          rating: rating ? Number(rating) : undefined,
          status: JCFStatus.PENDING_APPROVAL,
          approval: {
            approver: approverUser._id,
            status: "pending",
          },
          attachments: Array.isArray(attachments) ? attachments : [],
        },
      ],
      { session },
    );

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Job Completion Form created successfully and submitted for approval",
      data: newJcf,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Get all JCFs
// @route   GET /api/jcfs
// @access  Private
export const getJCFs = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startIndex = (page - 1) * limit;

    const query: any = {};
    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.user?.role === UserRole.STAFF) {
      query.$or = [{ approver: req.user._id }, { createdBy: req.user._id }];
    }

    try {
      const total = await JCF.countDocuments(query);
      const jcfsList = await JCF.find(query)
        .populate("purchaseOrder", "poNumber totalAmount")
        .populate("requisition", "requisitionNumber title")
        .populate("vendor", "name contactPerson email phone")
        .populate("createdBy", "firstName lastName email")
        .populate("approver", "firstName lastName email")
        .sort({ createdAt: -1 })
        .skip(startIndex)
        .limit(limit);

      res.status(200).json({
        success: true,
        count: jcfsList.length,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit,
        },
        data: jcfsList,
      });
      return;
    } catch (e) {
      // Fallback to PostgreSQL
    }

    const pgJcfs = await db.query.jcfs.findMany({
      orderBy: [desc(jcfs.createdAt)],
    });

    let filtered = pgJcfs;
    if (req.query.status) {
      filtered = filtered.filter((j) => j.status === req.query.status);
    }
    const totalPg = filtered.length;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    const data = paginated.map((j) => ({
      _id: j.id,
      jcfNumber: j.jcfNumber,
      purchaseOrder: j.purchaseOrderId,
      requisition: j.requisitionId,
      vendor: j.vendorId,
      createdBy: j.createdById,
      approver: j.approverId,
      serviceDescription: j.serviceDescription,
      completionEvidence: j.completionEvidence,
      rating: j.rating,
      status: j.status,
      approval: j.approval,
      attachments: j.attachments,
      pdfUrl: j.pdfUrl,
      completedAt: j.completedAt,
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
    }));

    res.status(200).json({
      success: true,
      count: data.length,
      pagination: {
        total: totalPg,
        page,
        pages: Math.ceil(totalPg / limit) || 1,
        limit,
      },
      data,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single JCF
// @route   GET /api/jcfs/:id
// @access  Private
export const getJCFById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = String(req.params.id);
    try {
      const jcf = await JCF.findById(id)
        .populate("purchaseOrder", "poNumber totalAmount items generalTerms deliveryDate")
        .populate("requisition", "requisitionNumber title department")
        .populate("vendor", "name contactPerson email phone address")
        .populate("createdBy", "firstName lastName email role")
        .populate("approver", "firstName lastName email role");

      if (jcf) {
        res.status(200).json({
          success: true,
          data: jcf,
        });
        return;
      }
    } catch (e) {
      // Fallback to PostgreSQL
    }

    const pgJcf = await db.query.jcfs.findFirst({
      where: eq(jcfs.id, id),
    });

    if (!pgJcf) {
      res.status(404).json({ success: false, message: "Job Completion Form not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        _id: pgJcf.id,
        jcfNumber: pgJcf.jcfNumber,
        purchaseOrder: pgJcf.purchaseOrderId,
        requisition: pgJcf.requisitionId,
        vendor: pgJcf.vendorId,
        createdBy: pgJcf.createdById,
        approver: pgJcf.approverId,
        serviceDescription: pgJcf.serviceDescription,
        completionEvidence: pgJcf.completionEvidence,
        rating: pgJcf.rating,
        status: pgJcf.status,
        approval: pgJcf.approval,
        attachments: pgJcf.attachments,
        pdfUrl: pgJcf.pdfUrl,
        completedAt: pgJcf.completedAt,
        createdAt: pgJcf.createdAt,
        updatedAt: pgJcf.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get JCF by PO
// @route   GET /api/purchase-orders/:poId/jcf
// @access  Private
export const getJCFByPO = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const poId = String(req.params.poId);
    try {
      const jcf = await JCF.findOne({ purchaseOrder: poId })
        .populate("purchaseOrder", "poNumber totalAmount items")
        .populate("requisition", "requisitionNumber title")
        .populate("vendor", "name contactPerson email")
        .populate("createdBy", "firstName lastName email")
        .populate("approver", "firstName lastName email");

      if (jcf) {
        res.status(200).json({
          success: true,
          data: jcf,
        });
        return;
      }
    } catch (e) {
      // Fallback to PostgreSQL
    }

    const pgJcf = await db.query.jcfs.findFirst({
      where: eq(jcfs.purchaseOrderId, poId),
    });

    if (!pgJcf) {
      res.status(404).json({ success: false, message: "No Job Completion Form found for this purchase order" });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        _id: pgJcf.id,
        jcfNumber: pgJcf.jcfNumber,
        purchaseOrder: pgJcf.purchaseOrderId,
        requisition: pgJcf.requisitionId,
        vendor: pgJcf.vendorId,
        createdBy: pgJcf.createdById,
        approver: pgJcf.approverId,
        serviceDescription: pgJcf.serviceDescription,
        completionEvidence: pgJcf.completionEvidence,
        rating: pgJcf.rating,
        status: pgJcf.status,
        approval: pgJcf.approval,
        attachments: pgJcf.attachments,
        pdfUrl: pgJcf.pdfUrl,
        completedAt: pgJcf.completedAt,
        createdAt: pgJcf.createdAt,
        updatedAt: pgJcf.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update JCF (draft/pending only)
// @route   PUT /api/jcfs/:id
// @access  Private (Creator PM or Admin)
export const updateJCF = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const jcf = await JCF.findById(req.params.id);
    if (!jcf) {
      res.status(404).json({ success: false, message: "Job Completion Form not found" });
      return;
    }

    if (jcf.status === JCFStatus.APPROVED) {
      res.status(400).json({
        success: false,
        message: "Cannot edit an approved Job Completion Form",
      });
      return;
    }

    const userId = getUserId(req.user);
    const isCreator = jcf.createdBy.toString() === userId?.toString();
    const isAdmin =
      req.user?.role === UserRole.ADMIN || req.user?.role === UserRole.SUPER_ADMIN;

    if (!isCreator && !isAdmin) {
      res.status(403).json({
        success: false,
        message: "Only the creating Procurement Manager can edit this form",
      });
      return;
    }

    const { serviceDescription, completionEvidence, rating, attachments, approverId } =
      req.body;

    if (serviceDescription !== undefined) {
      jcf.serviceDescription = serviceDescription.trim();
    }
    if (completionEvidence !== undefined) {
      jcf.completionEvidence = completionEvidence;
    }
    if (rating !== undefined) {
      jcf.rating = Number(rating);
    }
    if (Array.isArray(attachments)) {
      jcf.attachments = attachments;
    }
    if (approverId) {
      const approver = await User.findById(approverId);
      if (!approver || !approver.isActive) {
        res.status(400).json({ success: false, message: "Invalid or inactive approver" });
        return;
      }
      jcf.approver = approver._id;
      if (jcf.approval) {
        jcf.approval.approver = approver._id;
      }
    }

    // Reset status to PENDING_APPROVAL on edit if it was rejected
    if (jcf.status === JCFStatus.REJECTED) {
      jcf.status = JCFStatus.PENDING_APPROVAL;
      if (jcf.approval) {
        jcf.approval.status = "pending";
        jcf.approval.rejectedAt = undefined;
      }
    }

    await jcf.save();

    res.status(200).json({
      success: true,
      message: "Job Completion Form updated successfully",
      data: jcf,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve JCF
// @route   PUT /api/jcfs/:id/approve
// @access  Private (Assigned Requester / Approver only)
export const approveJCF = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { comments } = req.body;
    const userId = getUserId(req.user);

    const jcf = await JCF.findById(req.params.id);
    if (!jcf) {
      res.status(404).json({ success: false, message: "Job Completion Form not found" });
      return;
    }

    if (jcf.status === JCFStatus.APPROVED) {
      res.status(400).json({
        success: false,
        message: "Job Completion Form is already approved",
      });
      return;
    }

    const isAssignedApprover = jcf.approver.toString() === userId?.toString();
    const isAdmin =
      req.user?.role === UserRole.ADMIN || req.user?.role === UserRole.SUPER_ADMIN;

    // Prevent PM creator from self-approving as requester unless Admin
    if (jcf.createdBy.toString() === userId?.toString() && !isAdmin) {
      res.status(403).json({
        success: false,
        message: "Creator cannot approve their own Job Completion Form as requester",
      });
      return;
    }

    if (!isAssignedApprover && !isAdmin) {
      res.status(403).json({
        success: false,
        message: "Only the assigned requester can approve this Job Completion Form",
      });
      return;
    }

    jcf.status = JCFStatus.APPROVED;
    jcf.completedAt = new Date();
    jcf.approval = {
      approver: (req.user as any)._id,
      status: "approved",
      comments: comments || "",
      approvedAt: new Date(),
    };

    await jcf.save();

    // Transition PO status to COMPLETED
    await PurchaseOrder.findByIdAndUpdate(jcf.purchaseOrder, {
      status: PurchaseOrderStatus.COMPLETED,
    });

    res.status(200).json({
      success: true,
      message: "Job Completion Form approved successfully",
      data: jcf,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject JCF
// @route   PUT /api/jcfs/:id/reject
// @access  Private (Assigned Requester / Approver only)
export const rejectJCF = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { comments, reason } = req.body;
    const rejectionReason = comments || reason;

    if (!rejectionReason || rejectionReason.trim() === "") {
      res.status(400).json({
        success: false,
        message: "Rejection comment is required",
      });
      return;
    }

    const userId = getUserId(req.user);
    const jcf = await JCF.findById(req.params.id);
    if (!jcf) {
      res.status(404).json({ success: false, message: "Job Completion Form not found" });
      return;
    }

    const isAssignedApprover = jcf.approver.toString() === userId?.toString();
    const isAdmin =
      req.user?.role === UserRole.ADMIN || req.user?.role === UserRole.SUPER_ADMIN;

    if (!isAssignedApprover && !isAdmin) {
      res.status(403).json({
        success: false,
        message: "Only the assigned requester can reject this Job Completion Form",
      });
      return;
    }

    jcf.status = JCFStatus.REJECTED;
    jcf.approval = {
      approver: (req.user as any)._id,
      status: "rejected",
      comments: rejectionReason.trim(),
      rejectedAt: new Date(),
    };

    await jcf.save();

    res.status(200).json({
      success: true,
      message: "Job Completion Form rejected",
      data: jcf,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate JCF PDF (approved only)
// @route   GET /api/jcfs/:id/pdf
// @access  Private
export const generateJCFPDF = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const jcf = await JCF.findById(req.params.id)
      .populate("purchaseOrder")
      .populate("requisition", "requisitionNumber title")
      .populate("vendor", "name contactPerson email phone address")
      .populate("createdBy", "firstName lastName email")
      .populate("approver", "firstName lastName email");

    if (!jcf) {
      res.status(404).json({ success: false, message: "Job Completion Form not found" });
      return;
    }

    // Gate PDF on approval
    if (jcf.status !== JCFStatus.APPROVED || !jcf.approval?.approvedAt) {
      res.status(400).json({
        success: false,
        message: "Job Completion Form must be approved by requester before downloading PDF",
      });
      return;
    }

    // Keep this document deliberately close to the approved Daystar JCF form in
    // assets/jcf_template.pdf.  The source data remains the approved JCF record;
    // the template is presentation only and is never treated as a source of truth.
    const doc = new PDFDocument({ margin: 72, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="JCF_${jcf.jcfNumber || "Document"}.pdf"`,
    );

    doc.pipe(res);

    const pageWidth = doc.page.width;
    const left = doc.page.margins.left;
    const right = pageWidth - doc.page.margins.right;
    const line = (y: number) => doc.moveTo(left, y).lineTo(right, y).dash(1, { space: 2 }).stroke().undash();
    const field = (label: string, value: string, y: number) => {
      doc.font("Helvetica-Bold").fontSize(10).text(label, left, y, { continued: true });
      doc.font("Helvetica").text(` ${value || ""}`);
      line(y + 16);
    };
    const approverName = `${(jcf.approver as any)?.firstName || ""} ${(jcf.approver as any)?.lastName || ""}`.trim();
    const department = (jcf.requisition as any)?.department?.name || (jcf.requisition as any)?.department || "";

    // Daystar masthead and title
    doc.fillColor("#132653").font("Helvetica-Bold").fontSize(26).text("DAYSTAR", { align: "center" });
    doc.fontSize(11).text("DAYSTAR CHRISTIAN CENTRE", { align: "center" });
    doc.fillColor("black").font("Helvetica").fontSize(18).text("Job Completion Form", { align: "center" });
    doc.moveDown(2.1);

    field("Vendor:", (jcf.vendor as any)?.name || "", doc.y);
    doc.moveDown(1.4);
    field("Job Description (LPO):", jcf.serviceDescription || "", doc.y);
    for (let index = 0; index < 4; index += 1) {
      doc.moveDown(0.7);
      line(doc.y + 12);
    }

    doc.moveDown(1.4);
    field("Comments:", jcf.approval?.comments || jcf.completionEvidence || "", doc.y);
    for (let index = 0; index < 4; index += 1) {
      doc.moveDown(0.7);
      line(doc.y + 12);
    }

    doc.moveDown(1.1);
    doc.font("Helvetica-Bold").fontSize(12).text("Job Completion Acknowledgment");
    doc.moveDown(0.6);
    doc.font("Helvetica").fontSize(10).text(
      "Please review the completed work detailed above before signing this form. If the work meets the required standards and is satisfactory, kindly sign below and forward the form to the Procurement Office.",
    );
    doc.moveDown(0.7);
    doc.text(
      "By signing this document, I confirm that the job has been completed to satisfaction and in accordance with the specified job description. I also acknowledge receipt of all associated materials, equipment, and labour as accurate and acceptable.",
    );
    doc.moveDown(1.5);

    const bottomY = doc.y;
    const half = (right - left) / 2;
    doc.font("Helvetica-Bold").text("User Dept:", left, bottomY, { continued: true });
    doc.font("Helvetica").text(` ${department}`, { width: half - 10 });
    doc.font("Helvetica-Bold").text("Date:", left + half, bottomY, { continued: true });
    doc.font("Helvetica").text(
      ` ${jcf.approval?.approvedAt ? new Date(jcf.approval.approvedAt).toLocaleDateString() : ""}`,
    );
    line(bottomY + 16);
    doc.font("Helvetica-Bold").text("Completion Date:", left, bottomY + 48, { continued: true });
    doc.font("Helvetica").text(
      ` ${jcf.completedAt ? new Date(jcf.completedAt).toLocaleDateString() : ""}`,
    );
    doc.font("Helvetica-Bold").text("Name:", left, bottomY + 92, { continued: true });
    doc.font("Helvetica").text(` ${approverName}`, { width: half - 10 });
    doc.font("Helvetica-Bold").text("Sign:", left + half, bottomY + 92, { continued: true });
    doc.font("Helvetica").text(" Approved electronically");

    doc.end();
  } catch (error) {
    next(error);
  }
};
