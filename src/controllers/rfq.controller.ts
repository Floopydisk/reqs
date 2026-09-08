import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import RFQ from "../models/rfq.model";
import Requisition from "../models/requisition.model";
import User from "../models/user.model";
import Vendor from "../models/vendor.model";
import {
  RFQStatus,
  RequisitionStatus,
  ItemStatus,
  UserRole,
} from "../types/enums";
import { getUserId } from "../utils/objectIdHelper";
import {
  generateSequentialId,
  getCurrentSequence,
  resetCounter,
} from "../utils/idGenerator";

const formatRFQWithVendorIds = (rfq: any) => {
  const source = typeof rfq.toObject === "function" ? rfq.toObject() : rfq;
  const vendorsFromArray = Array.isArray(source.vendors)
    ? source.vendors
        .map((v: any) =>
          typeof v === "object"
            ? v?._id?.toString?.() || v?.toString?.()
            : v?.toString?.(),
        )
        .filter(Boolean)
    : [];

  const vendorIdFallback = source.vendor
    ? typeof source.vendor === "object"
      ? source.vendor._id?.toString?.() || source.vendor.toString?.()
      : source.vendor.toString?.()
    : undefined;

  const rest = { ...source };
  delete rest.vendors;
  delete rest.vendor;

  return {
    ...rest,
    vendors:
      vendorsFromArray.length > 0
        ? vendorsFromArray
        : vendorIdFallback
          ? [vendorIdFallback]
          : [],
  };
};

const buildRelatedPayload = (
  requisition: any,
  relatedRfqs: any[] = [],
  relatedPos: any[] = [],
) => {
  const departmentName = requisition?.department?.name || "N/A";

  return {
    requests: requisition
      ? [
          {
            _id: requisition._id,
            title: requisition.title || "Request",
            department: departmentName,
          },
        ]
      : [],
    rfqs: relatedRfqs.map((rfq) => ({
      _id: rfq?._id || rfq,
      title: rfq?.title || rfq?.rfqNumber || "RFQ",
      department: departmentName,
    })),
    pos: relatedPos.map((po) => ({
      _id: po?._id || po,
      title: po?.title || "",
      department: departmentName,
    })),
  };
};

const syncRfqCounterWithExistingData = async (
  session?: mongoose.ClientSession,
) => {
  const query = RFQ.findOne({
    rfqNumber: /^RFQ-\d{6}\s*$/,
  })
    .sort({ rfqNumber: -1 })
    .select({ rfqNumber: 1 });

  if (session) {
    query.session(session);
  }

  const latestRfq = await query;
  if (!latestRfq?.rfqNumber) {
    return;
  }

  const latestSequence = Number.parseInt(
    latestRfq.rfqNumber.trim().replace(/^RFQ-/, ""),
    10,
  );

  if (Number.isNaN(latestSequence) || latestSequence < 1) {
    return;
  }

  const currentSequence = await getCurrentSequence("RFQ", "");
  if (currentSequence < latestSequence) {
    await resetCounter("RFQ", "", latestSequence);
  }
};

const createRFQPdfBuffer = (
  rfq: any,
  selectedVendor?: { _id: any; name?: string; email?: string; phone?: string },
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const formatDate = (value?: Date | string) =>
      value
        ? new Intl.DateTimeFormat("en-GB", {
            timeZone: "Africa/Lagos",
            year: "numeric",
            month: "short",
            day: "2-digit",
          }).format(new Date(value))
        : "N/A";
    const fullName = (person: any) =>
      [person?.firstName, person?.lastName].filter(Boolean).join(" ") || "N/A";

    // 1. Bold document title and stable metadata block.
    doc.fontSize(20).font("Helvetica-Bold").text("REQUEST FOR QUOTATION", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica").text("Daystar Requisition & Procurement System", { align: "center" });
    doc.moveDown(1.5);

    // 2. Clean Metadata Block
    const vendorLabel = selectedVendor
      ? `${selectedVendor.name || "N/A"}`
      : "All Vendors";

    const deliveryLoc = rfq.deliveryLocation;
    const locationStr = typeof deliveryLoc === "object" && deliveryLoc !== null
      ? [deliveryLoc.name, deliveryLoc.address, deliveryLoc.contactPerson, deliveryLoc.phoneNumber]
          .filter(Boolean)
          .join(" — ") || "N/A"
      : deliveryLoc || "N/A";
    const requester = (rfq.requisition as any)?.requester;

    doc.fontSize(10).font("Helvetica-Bold").text("RFQ Number: ", 40, doc.y, { continued: true });
    doc.font("Helvetica").text(rfq.rfqNumber || "N/A");

    doc.font("Helvetica-Bold").text("Issue Date: ", { continued: true });
    doc.font("Helvetica").text(formatDate(rfq.issuedAt || rfq.createdAt));

    doc.font("Helvetica-Bold").text("Vendor: ", { continued: true });
    doc.font("Helvetica").text(vendorLabel);

    doc.font("Helvetica-Bold").text("Requester: ", { continued: true });
    doc.font("Helvetica").text(fullName(requester));

    doc.font("Helvetica-Bold").text("Location: ", { continued: true });
    doc.font("Helvetica").text(locationStr);

    doc.font("Helvetica-Bold").text("Delivery Date: ", { continued: true });
    doc.font("Helvetica").text(formatDate(rfq.expectedDeliveryDate));
    doc.moveDown(1.5);

    // 3. Items Table (Visual Priority: Table before evaluation criteria & terms)
    doc.fontSize(12).font("Helvetica-Bold").text("Required Items:");
    doc.moveDown(0.5);

    // Table Header
    const colX = { num: 40, desc: 65, qty: 320, uom: 370, deliv: 440 };
    const drawTableHeader = () => {
      const headerY = doc.y;
      doc.fontSize(9).font("Helvetica-Bold");
      doc.text("#", colX.num, headerY);
      doc.text("Description & Specification", colX.desc, headerY);
      doc.text("Qty", colX.qty, headerY);
      doc.text("UOM", colX.uom, headerY);
      doc.text("Expected Delivery", colX.deliv, headerY);
      doc.y = headerY + 14;
      doc.strokeColor("#cccccc").lineWidth(1).moveTo(40, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.45);
    };
    drawTableHeader();

    // Table Rows
    doc.font("Helvetica").fontSize(9);
    (rfq.items || []).forEach((item: any, index: number) => {
      const desc = item.detailedSpecification
        ? `${item.itemDescription || "N/A"}\nSpec: ${item.detailedSpecification}`
        : item.itemDescription || "N/A";
      const rowHeight = Math.max(18, doc.heightOfString(desc, { width: 245 }) + 6);
      if (doc.y + rowHeight > 730) {
        doc.addPage();
        doc.y = 45;
        drawTableHeader();
      }
      const currentY = doc.y;
      doc.text(String(index + 1), colX.num, currentY);
      doc.text(desc, colX.desc, currentY, { width: 245 });
      doc.text(String(item.quantity ?? "N/A"), colX.qty, currentY);
      doc.text(String(item.uom || "unit"), colX.uom, currentY);
      doc.text(
        formatDate(item.expectedDeliveryDate),
        colX.deliv,
        currentY,
      );
      doc.y = currentY + rowHeight;
      doc.strokeColor("#e5e7eb").lineWidth(0.5).moveTo(40, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.35);
    });

    doc.moveDown(1);

    // 4. Evaluation Criteria
    if (rfq.evaluationCriteria && rfq.evaluationCriteria.trim()) {
      doc.fontSize(11).font("Helvetica-Bold").text("Evaluation Criteria:");
      doc.moveDown(0.3);
      doc.fontSize(9).font("Helvetica").text(rfq.evaluationCriteria);
      doc.moveDown(1);
    }

    // 5. Terms & Conditions
    if (rfq.termsAndConditions && rfq.termsAndConditions.trim()) {
      doc.fontSize(11).font("Helvetica-Bold").text("Terms and Conditions:");
      doc.moveDown(0.3);
      doc.fontSize(9).font("Helvetica").text(rfq.termsAndConditions);
      doc.moveDown(1);
    }

    doc.end();
  });

// @desc    Create RFQ from requisition
// @route   POST /api/requisitions/:requisitionId/rfqs
// @access  Private (PM only)
export const generateRFQsFromRequisition = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { requisitionId } = req.params;
    const {
      vendors,
      itemIds,
      items: itemOverrides, // Optional: [{itemId, quantity, uom, description}]
      title,
      deliveryLocation,
      evaluationCriteria,
      expectedDeliveryDate,
      termsOfService,
      termsAndConditions,
    } = req.body;
    const userId = getUserId(req.user);

    // Validate user is PM
    const user = await User.findById(userId);
    if (!user || user.role !== UserRole.PROCUREMENT_MANAGER) {
      res.status(403).json({
        success: false,
        message: "Only Procurement Managers can generate RFQs",
      });
      return;
    }

    // Get requisition
    const requisition =
      await Requisition.findById(requisitionId).session(session);
    if (!requisition) {
      await session.abortTransaction();
      res
        .status(404)
        .json({ success: false, message: "Requisition not found" });
      return;
    }

    // Enforce Head of Finance approval gate before RFQ generation
    const isHofApproved =
      requisition.status === RequisitionStatus.HOF_APPROVED ||
      requisition.status === RequisitionStatus.PROCUREMENT_REVIEW ||
      requisition.approvals?.some(
        (a: any) =>
          (a.stage === "Finance" || a.approverRole === "hof") &&
          a.status === "approved",
      );

    if (!isHofApproved) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message:
          "Requisition must be approved by the Head of Finance before generating RFQs",
      });
      return;
    }

    // Validate items exist and are approved
    const selectedItems = requisition.items.filter((item: any) =>
      itemIds.includes(item._id.toString()),
    );

    if (selectedItems.length === 0) {
      await session.abortTransaction();
      res
        .status(400)
        .json({ success: false, message: "No valid items selected" });
      return;
    }

    // Enforce Work-Tool HHR gate (Requirement C7)
    for (const item of selectedItems) {
      if (item.isWorkTool) {
        const isHrApproved =
          item.status === ItemStatus.HR_APPROVED ||
          item.status === ItemStatus.PROCUREMENT_REVIEW ||
          item.status === ItemStatus.RFQ_GENERATED ||
          (item.hrApprovedBy && !item.hrRejectedBy);

        if (!isHrApproved) {
          await session.abortTransaction();
          res.status(400).json({
            success: false,
            message: `Work-tool item "${item.itemName}" requires HR approval before RFQ generation. Current item status: ${item.status}`,
          });
          return;
        }
      }
    }

    // Validate vendors array - expects vendor IDs from Vendor Master
    if (!vendors || !Array.isArray(vendors) || vendors.length === 0) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: "At least one vendor ID is required",
      });
      return;
    }

    // Validate all vendor IDs and build a distinct vendor list
    const normalizedVendorIds = [
      ...new Set(vendors.map((v: string) => v.toString())),
    ];
    for (const vendorId of normalizedVendorIds) {
      if (!mongoose.Types.ObjectId.isValid(vendorId)) {
        await session.abortTransaction();
        res
          .status(400)
          .json({ success: false, message: `Invalid vendor ID: ${vendorId}` });
        return;
      }

      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        await session.abortTransaction();
        res
          .status(404)
          .json({ success: false, message: `Vendor not found: ${vendorId}` });
        return;
      }
    }

    // Build one RFQ tied to all selected vendors
    const rfqItems = selectedItems.map((item: any) => {
      const override = Array.isArray(itemOverrides)
        ? itemOverrides.find((o: any) => o.itemId === item._id.toString())
        : undefined;

      return {
        itemId: item._id,
        itemDescription:
          override?.description ||
          `${item.itemName}${item.preferredBrand ? " - " + item.preferredBrand : ""}`,
        detailedSpecification: item.itemDescription,
        uom: override?.uom || item.UOM || "unit",
        quantity: override?.quantity || item.units || 1,
        expectedDeliveryDate: expectedDeliveryDate || requisition.deliveryDate,
      };
    });

    // Safeguard: if a draft RFQ already exists for this requisition, merge vendors
    // and refresh details instead of creating separate RFQs across repeated calls.
    let rfqDoc = await RFQ.findOne({
      requisition: requisitionId,
      status: RFQStatus.DRAFT,
    })
      .sort({ createdAt: -1 })
      .session(session);

    if (rfqDoc) {
      const existingVendorIds = Array.isArray((rfqDoc as any).vendors)
        ? (rfqDoc as any).vendors.map((v: any) => v.toString())
        : (rfqDoc as any).vendor
          ? [(rfqDoc as any).vendor.toString()]
          : [];

      const mergedVendorIds = [
        ...new Set([...existingVendorIds, ...normalizedVendorIds]),
      ];

      (rfqDoc as any).vendors = mergedVendorIds;
      (rfqDoc as any).vendor = mergedVendorIds[0];
      (rfqDoc as any).title = title || requisition.title;
      (rfqDoc as any).items = rfqItems;
      (rfqDoc as any).evaluationCriteria = evaluationCriteria || "";
      (rfqDoc as any).termsAndConditions =
        (termsOfService ?? termsAndConditions) || "";
      (rfqDoc as any).deliveryLocation =
        deliveryLocation || requisition.deliveryLocation;
      (rfqDoc as any).expectedDeliveryDate =
        expectedDeliveryDate || requisition.deliveryDate;
      await rfqDoc.save({ session });
    } else {
      await syncRfqCounterWithExistingData(session);

      let createdRfq: any = null;
      const maxAttempts = 5;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const rfqNumber = await generateSequentialId("RFQ", "", 6);

        try {
          const createdRFQ = await RFQ.create(
            [
              {
                rfqNumber,
                title: title || requisition.title,
                requisition: requisitionId,
                vendors: normalizedVendorIds,
                vendor: normalizedVendorIds[0], // Backward compatibility primary vendor
                items: rfqItems,
                evaluationCriteria: evaluationCriteria || "",
                termsAndConditions:
                  (termsOfService ?? termsAndConditions) || "",
                deliveryLocation:
                  deliveryLocation || requisition.deliveryLocation,
                expectedDeliveryDate:
                  expectedDeliveryDate || requisition.deliveryDate,
                status: RFQStatus.DRAFT,
                createdBy: userId,
              },
            ],
            { session },
          );

          createdRfq = createdRFQ[0];
          break;
        } catch (createError: any) {
          const isRfqNumberCollision =
            createError?.code === 11000 &&
            (createError?.keyPattern?.rfqNumber ||
              createError?.keyValue?.rfqNumber);

          if (!isRfqNumberCollision || attempt === maxAttempts - 1) {
            throw createError;
          }
        }
      }

      rfqDoc = createdRfq;
    }

    if (rfqDoc?.rfqNumber) {
      rfqDoc.rfqNumber = rfqDoc.rfqNumber.trim();
      await rfqDoc.save({ session });
    }

    // Update requisition status
    requisition.status = RequisitionStatus.RFQ_GENERATION;
    const relatedRfqs = new Set(
      (requisition as any).relatedRfqs?.map((id: any) => id.toString()) || [],
    );
    if (rfqDoc?._id) {
      relatedRfqs.add(rfqDoc._id.toString());
    }
    (requisition as any).relatedRfqs = Array.from(relatedRfqs);
    await requisition.save({ session });

    // Update selected items status
    for (const itemId of itemIds) {
      const item = requisition.items.find(
        (i: any) => i._id?.toString() === itemId.toString(),
      );
      if (item) {
        item.status = ItemStatus.RFQ_GENERATED;
      }
    }
    await requisition.save({ session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "RFQ created successfully",
      data: formatRFQWithVendorIds(rfqDoc),
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Get all RFQs for a requisition
// @route   GET /api/requisitions/:requisitionId/rfqs
// @access  Private (PM)
export const getRFQsByRequisition = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { requisitionId } = req.params;

    const rfqs = await RFQ.find({ requisition: requisitionId })
      .populate("createdBy", "firstName lastName email")
      .populate("deliveryLocation", "name address")
      .sort({ createdAt: -1 });

    const formattedRFQs = rfqs.map((rfq) => formatRFQWithVendorIds(rfq));

    res.status(200).json({
      success: true,
      count: formattedRFQs.length,
      data: formattedRFQs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single RFQ
// @route   GET /api/rfqs/:rfqId
// @access  Private (PM)
export const getRFQById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { rfqId } = req.params;

    const rfq = await RFQ.findById(rfqId)
      .populate("requisition", "requisitionNumber title department")
      .populate("createdBy", "firstName lastName email")
      .populate("deliveryLocation", "name address")
      .populate("relatedPos", "title poNumber");

    if (rfq?.requisition) {
      await (rfq.requisition as any).populate("department", "name");
    }

    if (!rfq) {
      res.status(404).json({ success: false, message: "RFQ not found" });
      return;
    }

    const requisitionRelated = await Requisition.findById(rfq.requisition)
      .populate("department", "name")
      .populate("relatedRfqs", "title rfqNumber")
      .select("title department relatedRfqs")
      .lean();

    const departmentName =
      (requisitionRelated as any)?.department?.name || "N/A";

    const relatedRequests = requisitionRelated
      ? [
          {
            _id: (requisitionRelated as any)._id.toString(),
            title: (requisitionRelated as any).title || "Request",
            department: departmentName,
          },
        ]
      : [];

    const relatedRfqs = Array.isArray(requisitionRelated?.relatedRfqs)
      ? requisitionRelated.relatedRfqs.map((item: any) => ({
          _id: item._id?.toString?.() || item.toString(),
          title: item.title || item.rfqNumber || "RFQ",
          department: departmentName,
        }))
      : [];

    const relatedPos = Array.isArray((rfq as any).relatedPos)
        ? (rfq as any).relatedPos.map((item: any) => ({
            _id: item._id?.toString?.() || item.toString(),
            title: item.title || "",
            department: departmentName,
          }))
      : [];

    res.status(200).json({
      success: true,
      data: {
        ...formatRFQWithVendorIds(rfq),
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

// @desc    Update RFQ
// @route   PUT /api/rfqs/:rfqId
// @access  Private (PM only)
export const updateRFQ = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { rfqId } = req.params;
    const userId = getUserId(req.user);

    const user = await User.findById(userId);
    if (!user || user.role !== UserRole.PROCUREMENT_MANAGER) {
      res.status(403).json({
        success: false,
        message: "Only Procurement Managers can update RFQs",
      });
      return;
    }

    const rfq = await RFQ.findById(rfqId);
    if (!rfq) {
      res.status(404).json({ success: false, message: "RFQ not found" });
      return;
    }

    // Only allow editing if RFQ is in DRAFT status
    if (rfq.status !== RFQStatus.DRAFT) {
      res.status(400).json({
        success: false,
        message: "Only draft RFQs can be edited",
      });
      return;
    }

    // Validate vendor IDs if being updated
    if (req.body.vendors) {
      if (!Array.isArray(req.body.vendors) || req.body.vendors.length === 0) {
        res.status(400).json({
          success: false,
          message: "vendors must be a non-empty array",
        });
        return;
      }

      for (const vendorId of req.body.vendors) {
        if (!mongoose.Types.ObjectId.isValid(vendorId)) {
          res.status(400).json({
            success: false,
            message: `Invalid vendor ID: ${vendorId}`,
          });
          return;
        }

        const vendor = await Vendor.findById(vendorId);
        if (!vendor) {
          res.status(404).json({
            success: false,
            message: `Vendor not found in Vendor Master: ${vendorId}`,
          });
          return;
        }
      }
    }

    // Update allowed fields
    const allowedUpdates = [
      "title",
      "vendors",
      "items",
      "evaluationCriteria",
      "termsAndConditions",
      "deliveryLocation",
      "expectedDeliveryDate",
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        (rfq as any)[field] = req.body[field];
      }
    });

    // Map UI field 'termsOfService' to model field 'termsAndConditions'
    if (req.body.termsOfService !== undefined) {
      (rfq as any)["termsAndConditions"] = req.body.termsOfService;
    }

    // Keep legacy primary vendor synchronized
    if (Array.isArray(req.body.vendors) && req.body.vendors.length > 0) {
      (rfq as any)["vendor"] = req.body.vendors[0];
    }

    await rfq.save();

    res.status(200).json({
      success: true,
      message: "RFQ updated successfully",
      data: rfq,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Issue RFQ (send to vendor)
// @route   POST /api/rfqs/:rfqId/issue
// @access  Private (PM only)
export const issueRFQ = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { rfqId } = req.params;
    const userId = getUserId(req.user);

    const user = await User.findById(userId);
    if (!user || user.role !== UserRole.PROCUREMENT_MANAGER) {
      await session.abortTransaction();
      res.status(403).json({
        success: false,
        message: "Only Procurement Managers can issue RFQs",
      });
      return;
    }

    const rfq = await RFQ.findById(rfqId).session(session).populate("vendors");
    if (!rfq) {
      await session.abortTransaction();
      res.status(404).json({ success: false, message: "RFQ not found" });
      return;
    }

    if (rfq.status !== RFQStatus.DRAFT) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: "RFQ has already been issued",
      });
      return;
    }

    // Ensure vendors field is accessible before saving
    const vendorsToKeep = rfq.vendors || [];

    // Update RFQ status
    rfq.status = RFQStatus.ISSUED;
    rfq.issuedAt = new Date();
    rfq.vendors = vendorsToKeep; // Explicitly set vendors before save
    await rfq.save({ session });

    // Update requisition status
    const requisition = await Requisition.findById(rfq.requisition).session(
      session,
    );
    if (
      requisition &&
      requisition.status === RequisitionStatus.RFQ_GENERATION
    ) {
      requisition.status = RequisitionStatus.VENDOR_BIDDING;
      await requisition.save({ session });
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "RFQ issued successfully",
      data: rfq,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Issue multiple RFQs at once
// @route   POST /api/rfqs/issue-multiple
// @access  Private (PM only)
export const issueMultipleRFQs = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { rfqIds } = req.body;
    const userId = getUserId(req.user);

    const user = await User.findById(userId);
    if (!user || user.role !== UserRole.PROCUREMENT_MANAGER) {
      await session.abortTransaction();
      res.status(403).json({
        success: false,
        message: "Only Procurement Managers can issue RFQs",
      });
      return;
    }

    if (!rfqIds || !Array.isArray(rfqIds) || rfqIds.length === 0) {
      await session.abortTransaction();
      res.status(400).json({ success: false, message: "RFQ IDs are required" });
      return;
    }

    const rfqs = await RFQ.find({ _id: { $in: rfqIds } }).session(session);

    const issuedRFQs = [];
    for (const rfq of rfqs) {
      if (rfq.status === RFQStatus.DRAFT) {
        rfq.status = RFQStatus.ISSUED;
        rfq.issuedAt = new Date();
        await rfq.save({ session });
        issuedRFQs.push(rfq);
      }
    }

    // Update requisition status if any RFQs were issued
    if (issuedRFQs.length > 0) {
      const requisitionId = issuedRFQs[0].requisition;
      const requisition =
        await Requisition.findById(requisitionId).session(session);
      if (
        requisition &&
        requisition.status === RequisitionStatus.RFQ_GENERATION
      ) {
        requisition.status = RequisitionStatus.VENDOR_BIDDING;
        await requisition.save({ session });
      }
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: `${issuedRFQs.length} RFQ(s) issued successfully`,
      data: issuedRFQs,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Delete RFQ
// @route   DELETE /api/rfqs/:rfqId
// @access  Private (PM only)
export const deleteRFQ = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { rfqId } = req.params;
    const userId = getUserId(req.user);

    const user = await User.findById(userId);
    if (!user || user.role !== UserRole.PROCUREMENT_MANAGER) {
      res.status(403).json({
        success: false,
        message: "Only Procurement Managers can delete RFQs",
      });
      return;
    }

    const rfq = await RFQ.findById(rfqId);
    if (!rfq) {
      res.status(404).json({ success: false, message: "RFQ not found" });
      return;
    }

    // Only allow deletion if RFQ is in DRAFT or CANCELLED status
    if (rfq.status !== RFQStatus.DRAFT && rfq.status !== RFQStatus.CANCELLED) {
      res.status(400).json({
        success: false,
        message: "Only draft or cancelled RFQs can be deleted",
      });
      return;
    }

    await RFQ.findByIdAndDelete(rfqId);
    await Requisition.findByIdAndUpdate(rfq.requisition, {
      $pull: { relatedRfqs: rfq._id },
    });

    res.status(200).json({
      success: true,
      message: "RFQ deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all RFQs (with filters)
// @route   GET /api/rfqs
// @access  Private (PM)
export const getAllRFQs = async (
  req: Request,
  res: Response,
  next: NextFunction,
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

    // Filter by requisition
    if (req.query.requisition) {
      query.requisition = req.query.requisition;
    }

    const total = await RFQ.countDocuments(query);
    const rfqs = await RFQ.find(query)
      .skip(startIndex)
      .limit(limit)
      .populate({
        path: "requisition",
        select: "requisitionNumber title requester",
        populate: { path: "requester", select: "firstName lastName email" },
      })
      .populate("createdBy", "firstName lastName email")
      .populate("deliveryLocation", "name address contactPerson phoneNumber email")
      .sort({ createdAt: -1 });

    const formattedRFQs = rfqs.map((rfq) => formatRFQWithVendorIds(rfq));

    res.status(200).json({
      success: true,
      count: formattedRFQs.length,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      data: formattedRFQs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download RFQ for one/all/selected vendors as PDF/ZIP
// @route   GET /api/rfqs/:rfqId/download
// @access  Private (PM, Admin)
export const downloadRFQs = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { rfqId } = req.params;
    const vendorIdsParam = req.query.vendorIds as string | string[] | undefined;

    let vendorIds: string[] = [];
    if (Array.isArray(vendorIdsParam)) {
      vendorIds = vendorIdsParam.flatMap((v) => v.split(",")).filter(Boolean);
    } else if (typeof vendorIdsParam === "string" && vendorIdsParam.trim()) {
      vendorIds = vendorIdsParam
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    }

    if (vendorIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      res.status(400).json({
        success: false,
        message: "vendorIds query must contain valid MongoDB ObjectIds",
      });
      return;
    }

    const rfq = await RFQ.findById(rfqId)
      .populate("vendors", "name email phone contactPerson address")
      .populate({
        path: "requisition",
        select: "requisitionNumber title requester",
        populate: { path: "requester", select: "firstName lastName email" },
      })
      .populate("createdBy", "firstName lastName email")
      .populate("deliveryLocation", "name address contactPerson phoneNumber email")
      .lean();

    if (!rfq) {
      res.status(404).json({
        success: false,
        message: "RFQ not found",
      });
      return;
    }

    const vendors = Array.isArray((rfq as any).vendors)
      ? (rfq as any).vendors
      : [];
    const rfqVendorIds = vendors.map((v: any) => v._id.toString());

    const selectedVendors =
      vendorIds.length > 0
        ? vendors.filter((v: any) => vendorIds.includes(v._id.toString()))
        : vendors;

    if (selectedVendors.length === 0) {
      res.status(404).json({
        success: false,
        message:
          vendorIds.length > 0
            ? "No matching vendors found on this RFQ for the provided vendorIds"
            : "No vendors found on this RFQ",
      });
      return;
    }

    // Ensure all requested vendor IDs belong to this RFQ
    if (vendorIds.length > 0) {
      const invalidIds = vendorIds.filter((id) => !rfqVendorIds.includes(id));
      if (invalidIds.length > 0) {
        res.status(400).json({
          success: false,
          message: `Some vendorIds are not tied to this RFQ: ${invalidIds.join(", ")}`,
        });
        return;
      }
    }

    const singleVendorDownload = selectedVendors.length === 1;

    if (singleVendorDownload) {
      const pdf = await createRFQPdfBuffer(rfq, selectedVendors[0]);
      const fileName = `RFQ_${rfq.rfqNumber || rfq._id}_${selectedVendors[0]._id}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`,
      );
      res.status(200).send(pdf);
      return;
    }

    const archiverModule = await import("archiver");
    const archiver = (archiverModule as any).default || (archiverModule as any);
    const zipName = `RFQ_${rfq.rfqNumber || rfq._id}_vendors_${Date.now()}.zip`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err: Error) => next(err));
    archive.pipe(res);

    for (const vendor of selectedVendors) {
      const pdf = await createRFQPdfBuffer(rfq, vendor);
      const fileName = `RFQ_${rfq.rfqNumber || rfq._id}_${vendor._id}.pdf`;
      archive.append(pdf, { name: fileName });
    }

    await archive.finalize();
  } catch (error) {
    next(error);
  }
};

// @desc    Upload vendor quote for RFQ
// @route   POST /api/rfqs/:rfqId/upload-quote
// @access  Private (PM only)
export const uploadVendorQuote = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { rfqId } = req.params;
    const {
      items,
      quoteTotalAmount,
      quoteValidUntil,
      quoteNotes,
      quoteDocument,
    } = req.body;
    const userId = getUserId(req.user);

    // Validate user is PM
    const user = await User.findById(userId);
    if (!user || user.role !== UserRole.PROCUREMENT_MANAGER) {
      await session.abortTransaction();
      res.status(403).json({
        success: false,
        message: "Only Procurement Managers can upload vendor quotes",
      });
      return;
    }

    // Get RFQ
    const rfq = await RFQ.findById(rfqId).session(session);
    if (!rfq) {
      await session.abortTransaction();
      res.status(404).json({ success: false, message: "RFQ not found" });
      return;
    }

    // Validate RFQ status - must be ISSUED
    if (rfq.status !== RFQStatus.ISSUED) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: "Can only upload quotes for issued RFQs",
      });
      return;
    }

    // Update item-level quote information
    if (items && Array.isArray(items)) {
      for (const quoteItem of items) {
        const rfqItem = rfq.items.find(
          (item) => item.itemId.toString() === quoteItem.itemId,
        );

        if (rfqItem) {
          rfqItem.quotedUnitPrice = quoteItem.quotedUnitPrice;
          rfqItem.quotedTotalPrice =
            quoteItem.quotedTotalPrice ||
            quoteItem.quotedUnitPrice * rfqItem.quantity;
          rfqItem.vendorComments = quoteItem.vendorComments || "";
        }
      }
    }

    // Update RFQ-level quote information
    rfq.quoteReceivedAt = new Date();
    rfq.quoteTotalAmount = quoteTotalAmount;
    rfq.quoteValidUntil = quoteValidUntil
      ? new Date(quoteValidUntil)
      : undefined;
    rfq.quoteNotes = quoteNotes || "";
    rfq.quoteDocument = quoteDocument || ""; // S3 URL from upload
    rfq.status = RFQStatus.QUOTE_RECEIVED;

    await rfq.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Vendor quote uploaded successfully",
      data: rfq,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};
