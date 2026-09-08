import { Request, Response, NextFunction } from "express";
import PurchaseOrder from "../models/purchaseOrder.model";
import RFQ from "../models/rfq.model";
import Requisition from "../models/requisition.model";
import Location from "../models/location.model";
import User from "../models/user.model";
import {
  PurchaseOrderStatus,
  RequisitionStatus,
  RFQStatus,
  UserRole,
} from "../types/enums";
import { uploadToS3 } from "../utils/fileUpload";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";

const buildRelatedPayload = (
  requisition: any,
  relatedRfqs: any[] = [],
  relatedPos: any[] = [],
  rfq?: any,
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
    rfqs:
      relatedRfqs.length > 0
        ? relatedRfqs.map((item) => ({
            _id: item?._id || item,
            title: item?.title || item?.rfqNumber || "RFQ",
            department: departmentName,
          }))
        : rfq
          ? [
              {
                _id: rfq._id,
                title: rfq.title || rfq.rfqNumber || "RFQ",
                department: departmentName,
              },
            ]
          : [],
    pos: relatedPos.map((item) => ({
      _id: item?._id || item,
      title: item?.title || "Purchase Order",
      department: departmentName,
    })),
  };
};

// @desc    Get all purchase orders
// @route   GET /api/purchase-orders
// @access  Private
export const getPurchaseOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    let query = {};

    const isFinanceOrHrHOD =
      req.user &&
      req.user.role === UserRole.DEPARTMENT_HEAD &&
      req.user.department &&
      (
        ["5", "4", "FIN", "HR"].includes(req.user.department.code || "") ||
        req.user.department.name?.toLowerCase().includes("finance") ||
        req.user.department.name?.toLowerCase().includes("accounts") ||
        req.user.department.name?.toLowerCase().includes("hr") ||
        req.user.department.name?.toLowerCase().includes("human resources")
      );

    // Filter purchase orders based on user role
    // DEPRECATED: Vendor role removed - vendors no longer log in to system
    // if (req.user?.role === UserRole.VENDOR) {
    //   query = { vendor: req.user?.vendor };
    // } else
    if (
      req.user?.role === UserRole.PROCUREMENT_MANAGER ||
      req.user?.role === UserRole.HHRA ||
      req.user?.role === UserRole.HEAD_OF_FINANCE ||
      req.user?.role === UserRole.HEAD_OF_HR ||
      isFinanceOrHrHOD
    ) {
      // Procurement manager, HHRA, Head of Finance, Head of HR, and Finance/HR department heads can see all purchase orders
      // No additional filter needed
    } else if (
      req.user?.role === UserRole.STAFF ||
      req.user?.role === UserRole.DEPARTMENT_HEAD
    ) {
      // Staff and department head can see purchase orders for requisitions they created or are responsible for
      if (req.user?.role === UserRole.STAFF) {
        const requisitions = await Requisition.find({
          requester: req.user?._id,
        });
        const requisitionIds = requisitions.map((req) => req._id);
        query = { requisition: { $in: requisitionIds } };
      } else {
        const requisitions = await Requisition.find({
          department: req.user?.department,
        });
        const requisitionIds = requisitions.map((req) => req._id);
        query = { requisition: { $in: requisitionIds } };
      }
    }

    const purchaseOrders = await PurchaseOrder.find(query)
      .populate("requisition", "requisitionNumber title category")
      .populate("rfq", "rfqNumber")
      .populate("vendor", "name contactPerson email phone address")
      .populate(
        "deliveryLocation",
        "name address contactPerson phoneNumber email",
      )
      .populate("deliveryContact", "firstName lastName email")
      .populate("createdBy", "firstName lastName email")
      .populate("approvals.approver", "firstName lastName email role")
      .sort({ createdAt: -1 });

    // Compute discovery fields for each PO (Requirement I1)
    const formattedPOs = purchaseOrders.map((po: any) => {
      const title =
        po.title ||
        (po.requisition && po.requisition.title) ||
        "Purchase Order";
      const plain = po.toObject ? po.toObject() : { ...po };
      plain.title = title;

      const isApproved = po.status === PurchaseOrderStatus.APPROVED;
      const isService =
        po.serviceClassificationOverride === "service" ||
        (po.items &&
          po.items.length > 0 &&
          po.items.every(
            (i: any) =>
              i.lineType === "service_charge" ||
              i.lineType === "service" ||
              Number(i.quantity) === 0,
          )) ||
        (po.requisition as any)?.category === "service";

      plain.canCreateGrn =
        isApproved &&
        !isService &&
        po.status !== PurchaseOrderStatus.COMPLETED &&
        po.status !== PurchaseOrderStatus.CANCELLED;

      plain.canCreateJcf =
        isApproved &&
        isService &&
        po.status !== PurchaseOrderStatus.COMPLETED &&
        po.status !== PurchaseOrderStatus.CANCELLED;

      return plain;
    });

    res.status(200).json({
      success: true,
      count: formattedPOs.length,
      data: formattedPOs,
    });
  } catch (error) {
    next(error);
  }
};
export const getPurchaseOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = String(req.params.id || "").trim();
    const purchaseOrder = await PurchaseOrder.findById(id)
      .populate("requisition")
      .populate("rfq", "rfqNumber")
      .populate("vendor", "name contactPerson email phone address")
      .populate(
        "deliveryLocation",
        "name address contactPerson phoneNumber email",
      )
      .populate("deliveryContact", "firstName lastName email")
      .populate("createdBy", "firstName lastName email")
      .populate("approvals.approver", "firstName lastName email role");

    if (!purchaseOrder) {
      res
        .status(404)
        .json({ success: false, message: "Purchase order not found" });
      return;
    }

    const requisitionDoc = await Requisition.findById(purchaseOrder.requisition)
      .populate("department", "name")
      .populate("relatedRfqs", "title rfqNumber")
      .populate("relatedPos", "title poNumber");

    if (req.user?.role === UserRole.STAFF) {
      if (
        !requisitionDoc ||
        requisitionDoc.requester.toString() !== (req.user as any)._id.toString()
      ) {
        res.status(403).json({
          success: false,
          message: "Not authorized to access this purchase order",
        });
        return;
      }
    }

    const isApproved = purchaseOrder.status === PurchaseOrderStatus.APPROVED;
    const isService =
      purchaseOrder.serviceClassificationOverride === "service" ||
      (purchaseOrder.items &&
        purchaseOrder.items.length > 0 &&
        purchaseOrder.items.every(
          (i: any) =>
            i.lineType === "service_charge" ||
            i.lineType === "service" ||
            Number(i.quantity) === 0,
        )) ||
      (requisitionDoc as any)?.category === "service";

    const poPlain: any = purchaseOrder.toObject ? purchaseOrder.toObject() : { ...purchaseOrder };
    // A legacy document may contain a URL before final approval. Never expose
    // that URL: downloads must go through the approval-gated PDF endpoint.
    if (purchaseOrder.status !== PurchaseOrderStatus.APPROVED) {
      delete poPlain.pdfUrl;
    }
    poPlain.canCreateGrn =
      isApproved &&
      !isService &&
      purchaseOrder.status !== PurchaseOrderStatus.COMPLETED &&
      purchaseOrder.status !== PurchaseOrderStatus.CANCELLED;

    poPlain.canCreateJcf =
      isApproved &&
      isService &&
      purchaseOrder.status !== PurchaseOrderStatus.COMPLETED &&
      purchaseOrder.status !== PurchaseOrderStatus.CANCELLED;

    const isFinanceOrHrHOD =
      req.user &&
      req.user.role === UserRole.DEPARTMENT_HEAD &&
      req.user.department &&
      (
        ["5", "4", "FIN", "HR"].includes(req.user.department.code || "") ||
        req.user.department.name?.toLowerCase().includes("finance") ||
        req.user.department.name?.toLowerCase().includes("accounts") ||
        req.user.department.name?.toLowerCase().includes("hr") ||
        req.user.department.name?.toLowerCase().includes("human resources")
      );

    if (req.user?.role === UserRole.DEPARTMENT_HEAD && !isFinanceOrHrHOD) {
      if (
        !requisitionDoc ||
        requisitionDoc.department.toString() !==
          req.user?.department?.toString()
      ) {
        res.status(403).json({
          success: false,
          message: "Not authorized to access this purchase order",
        });
        return;
      }
    }

    const related = buildRelatedPayload(
      requisitionDoc,
      (requisitionDoc as any)?.relatedRfqs || [],
      (requisitionDoc as any)?.relatedPos || [],
      purchaseOrder.rfq,
    );

    poPlain.title =
      poPlain.title ||
      ((poPlain.requisition as any) && (poPlain.requisition as any).title) ||
      "Purchase Order";

    res.status(200).json({
      success: true,
      data: {
        ...poPlain,
        related,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create purchase order from RFQ (New workflow)
// @route   POST /api/rfqs/:rfqId/purchase-order
// @access  Private/ProcurementManager
export const createPurchaseOrderFromRFQ = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { rfqId } = req.params;
    const {
      title,
      poTitle,
      selectedItemIds, // PM can select subset of RFQ items to bundle
      selectedVendorId,
      deliveryDate,
      deliveryLocation,
      deliveryContact,
      shipping,
      generalTerms,
      evaluationCriteria,
      termsOfService,
      paymentTerms,
      vendorQuote,
      totalAmount,
      items: submittedItems,
    } = req.body;

    // Validate user is PM
    const user = await User.findById(req.user?._id);
    if (!user || user.role !== UserRole.PROCUREMENT_MANAGER) {
      await session.abortTransaction();
      res.status(403).json({
        success: false,
        message: "Only Procurement Managers can create Purchase Orders",
      });
      return;
    }

    // Find the RFQ with vendor info
    const rfq = await RFQ.findById(rfqId)
      .populate("requisition")
      .populate("vendors") // Also populate vendors array
      .populate("vendor")
      .session(session);

    if (!rfq) {
      await session.abortTransaction();
      res.status(404).json({ success: false, message: "RFQ not found" });
      return;
    }

    // Validate RFQ has vendor assigned (fallback to first vendor in vendors array)
    const assignedVendor =
      rfq.vendor ||
      (Array.isArray(rfq.vendors) && rfq.vendors.length > 0
        ? rfq.vendors[0]
        : null);

    if (!assignedVendor) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message:
          "RFQ must have at least one vendor assigned before creating PO",
      });
      return;
    }

    // Allow frontend to choose a specific vendor from the RFQ vendor list
    const rfqVendorIds = Array.isArray(rfq.vendors)
      ? rfq.vendors.map((v: any) =>
          typeof v === "object" ? v?._id?.toString?.() : v?.toString?.(),
        )
      : [];

    const selectedVendorFromRequest =
      typeof selectedVendorId === "string" && selectedVendorId.trim()
        ? selectedVendorId.trim()
        : null;

    if (
      selectedVendorFromRequest &&
      rfqVendorIds.length > 0 &&
      !rfqVendorIds.includes(selectedVendorFromRequest)
    ) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: "Selected vendor is not assigned to this RFQ",
      });
      return;
    }

    const isValidObjectId = (value: any) =>
      typeof value === "string" && mongoose.Types.ObjectId.isValid(value);

    // Resolve delivery location: accept ObjectId or resolve by location name
    let resolvedDeliveryLocation: any =
      deliveryLocation ||
      (rfq.deliveryLocation as any)?._id ||
      rfq.deliveryLocation;

    if (
      typeof resolvedDeliveryLocation === "string" &&
      resolvedDeliveryLocation.trim() &&
      !isValidObjectId(resolvedDeliveryLocation)
    ) {
      const locationByName = await Location.findOne({
        name: resolvedDeliveryLocation.trim(),
      })
        .select("_id")
        .session(session);

      if (locationByName?._id) {
        resolvedDeliveryLocation = locationByName._id;
      }
    }

    if (
      !resolvedDeliveryLocation ||
      !isValidObjectId(resolvedDeliveryLocation.toString())
    ) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: "A valid delivery location is required",
      });
      return;
    }

    // Resolve delivery contact: fallback to current PM user
    let resolvedDeliveryContact: any = deliveryContact;
    if (!isValidObjectId(resolvedDeliveryContact)) {
      resolvedDeliveryContact = req.user?._id;
    }

    if (
      !resolvedDeliveryContact ||
      !isValidObjectId(resolvedDeliveryContact.toString())
    ) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: "A valid delivery contact is required",
      });
      return;
    }

    // Validate RFQ has quote received
    const allowedStatuses = [RFQStatus.QUOTE_RECEIVED, RFQStatus.ISSUED];
    if (!allowedStatuses.includes(rfq.status)) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: `Can only create PO from RFQs with received quotes. Current status: ${rfq.status}`,
      });
      return;
    }

    const requestedTitle =
      (typeof poTitle === "string" && poTitle.trim()) ||
      (typeof title === "string" && title.trim()) ||
      (rfq as any).title ||
      ((rfq.requisition as any)?.title ?? "Purchase Order");

    const selectedItemIdSet = new Set(
      Array.isArray(selectedItemIds)
        ? selectedItemIds.map((itemId: any) => itemId.toString())
        : [],
    );

    const selectedRfqItems =
      selectedItemIdSet.size > 0
        ? rfq.items.filter((item: any) =>
            selectedItemIdSet.has(item.itemId.toString()),
          )
        : rfq.items;

    const submittedItemArray = Array.isArray(submittedItems)
      ? submittedItems
      : [];

    const itemSource =
      submittedItemArray.length > 0 ? submittedItemArray : selectedRfqItems;

    if (itemSource.length === 0) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: "No valid items selected for PO",
      });
      return;
    }

    const rfqItemLookup = new Map(
      rfq.items.map((item: any) => [item.itemId.toString(), item]),
    );

    // Build PO items from frontend edits when available, otherwise fall back to RFQ quote data
    const poItems = itemSource.map((sourceItem: any) => {
      const sourceItemId =
        sourceItem.itemId?.toString?.() || sourceItem.id?.toString?.() || "";
      const rfqItem = sourceItemId ? rfqItemLookup.get(sourceItemId) : null;
      const itemDescription =
        sourceItem.itemDescription || rfqItem?.itemDescription || "";
      const quantity = Number(sourceItem.quantity ?? rfqItem?.quantity ?? 0);
      const uom = sourceItem.uom || rfqItem?.uom || "";
      const unitPrice = Number(
        sourceItem.unitPrice ??
          sourceItem.quotedUnitPrice ??
          rfqItem?.quotedUnitPrice ??
          0,
      );
      const totalPrice = Number(
        sourceItem.totalPrice ??
          sourceItem.quotedTotalPrice ??
          unitPrice * quantity,
      );
      const brand =
        sourceItem.brand ||
        (itemDescription.includes(" - ")
          ? itemDescription.split(" - ")[1]
          : "");

      const lineType = sourceItem.lineType || (rfqItem ? "requisition" : "custom");

      return {
        itemId: rfqItem?.itemId || sourceItem.itemId || sourceItem.id || undefined,
        lineType,
        itemDescription,
        detailsSpecification:
          sourceItem.detailsSpecification ||
          sourceItem.detailedSpecification ||
          rfqItem?.detailedSpecification ||
          "",
        quantity,
        uom,
        brand,
        unitPrice,
        totalPrice,
      };
    });

    // Financial breakdown calculations (Requirement H2, H6)
    const subtotal = poItems.reduce(
      (sum: number, item: any) => sum + (item.totalPrice || 0),
      0,
    );

    // Discount
    const discInput = req.body.discount ?? req.body.discountAmount ?? 0;
    const discType = req.body.discountType || (req.body.discount !== undefined ? "percentage" : "fixed");
    let calculatedDiscountAmount = 0;
    if (discType === "percentage") {
      calculatedDiscountAmount = Math.round((subtotal * Number(discInput) / 100) * 100) / 100;
    } else {
      calculatedDiscountAmount = Math.round(Number(discInput) * 100) / 100;
    }

    const taxableAmount = Math.max(0, subtotal - calculatedDiscountAmount);

    // VAT
    const vatInput = req.body.vat ?? req.body.vatRate ?? req.body.vatAmount ?? 0;
    const isVatRate = req.body.vatRate !== undefined || (req.body.vat !== undefined && Number(req.body.vat) <= 100);
    let calculatedVatAmount = 0;
    if (req.body.vatAmount !== undefined) {
      calculatedVatAmount = Math.round(Number(req.body.vatAmount) * 100) / 100;
    } else if (isVatRate) {
      calculatedVatAmount = Math.round((taxableAmount * Number(vatInput) / 100) * 100) / 100;
    } else {
      calculatedVatAmount = Math.round(Number(vatInput) * 100) / 100;
    }

    const calculatedTotal = Math.round((subtotal - calculatedDiscountAmount + calculatedVatAmount) * 100) / 100;

    if (totalAmount !== undefined && totalAmount !== null) {
      const numTotal = Number(totalAmount);
      if (isNaN(numTotal) || numTotal < 0) {
        await session.abortTransaction();
        res.status(400).json({ success: false, message: "Total amount must be a non-negative finite number" });
        return;
      }
      if (Math.abs(numTotal - calculatedTotal) > 0.1) {
        await session.abortTransaction();
        res.status(400).json({
          success: false,
          message: `Supplied totalAmount (${numTotal}) does not match calculated total (${calculatedTotal})`,
        });
        return;
      }
    }

    // Get vendor ID (handle both object and string references)
    const defaultVendorId =
      typeof assignedVendor === "object" ? assignedVendor._id : assignedVendor;
    const vendorId = selectedVendorFromRequest || defaultVendorId;

    // Delivery address snapshot (Requirement H9)
    const locationDoc = await Location.findById(resolvedDeliveryLocation).session(session);
    const deliveryAddressSnapshot = locationDoc
      ? {
          name: locationDoc.name || "",
          address: locationDoc.address || "",
          contactPerson: locationDoc.contactPerson || "",
          phoneNumber: locationDoc.phoneNumber || "",
          email: locationDoc.email || "",
        }
      : undefined;

    // Vendor quotes (Requirement H5)
    const rawQuotes = Array.isArray(req.body.vendorQuotes) ? req.body.vendorQuotes : [];
    const vendorQuoteUrl = vendorQuote || rfq.quoteDocument || "";
    const quotes =
      rawQuotes.length > 0
        ? rawQuotes
        : vendorQuoteUrl
          ? [
              {
                vendor: vendorId,
                filename: "Quote Document",
                url: vendorQuoteUrl,
                uploadedAt: new Date(),
              },
            ]
          : [];

    // Create purchase order using vendor ObjectId from RFQ
    const purchaseOrder = await PurchaseOrder.create(
      [
        {
          title: requestedTitle,
          requisition: rfq.requisition,
          rfq: rfq._id,
          vendor: vendorId,
          items: poItems,
          subtotal,
          discount: Number(discInput) || 0,
          discountType: discType,
          discountAmount: calculatedDiscountAmount,
          vat: Number(vatInput) || 0,
          vatRate: isVatRate ? Number(vatInput) : undefined,
          vatAmount: calculatedVatAmount,
          totalAmount: calculatedTotal,
          deliveryLocation: resolvedDeliveryLocation,
          deliveryAddressSnapshot,
          deliveryDate: deliveryDate || rfq.items[0]?.expectedDeliveryDate,
          deliveryContact: resolvedDeliveryContact,
          shipping: shipping || "Vendor Delivery",
          generalTerms: generalTerms || "",
          termsOfService:
            termsOfService || (rfq as any).termsAndConditions || "",
          paymentTerms: paymentTerms || "",
          quoteUrl: vendorQuoteUrl,
          vendorQuote: vendorQuoteUrl,
          vendorQuotes: quotes,
          serviceClassificationOverride: req.body.serviceClassificationOverride,
          serviceClassificationReason: req.body.serviceClassificationReason,
          approvals: [],
          status: PurchaseOrderStatus.DRAFT,
          createdBy: req.user?._id,
        },
      ],
      { session },
    );

    const createdPO = purchaseOrder[0];

    await RFQ.findByIdAndUpdate(
      rfq._id,
      { $addToSet: { relatedPos: createdPO._id } },
      { session },
    );

    await Requisition.findByIdAndUpdate(
      rfq.requisition,
      { $addToSet: { relatedPos: createdPO._id } },
      { session },
    );

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      data: createdPO,
      message:
        "Purchase order created successfully from RFQ. Submit for approval.",
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Update purchase order
// @route   PUT /api/purchase-orders/:id
// @access  Private/ProcurementManager
export const updatePurchaseOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);

    if (!purchaseOrder) {
      res
        .status(404)
        .json({ success: false, message: "Purchase order not found" });
      return;
    }

    // Role check: Only creating PM or Admin can edit (Requirement H4)
    const userId = (req.user as any)?._id?.toString();
    const isOwner = purchaseOrder.createdBy?.toString() === userId;
    const isAdmin =
      req.user?.role === UserRole.ADMIN || req.user?.role === UserRole.SUPER_ADMIN;

    if (!isOwner && !isAdmin) {
      res.status(403).json({
        success: false,
        message: "Not authorized to update this purchase order",
      });
      return;
    }

    // Check allowed statuses: DRAFT, SUBMITTED, or REJECTED
    const allowedEditStatuses = [
      PurchaseOrderStatus.DRAFT,
      PurchaseOrderStatus.SUBMITTED,
      PurchaseOrderStatus.ISSUED,
      PurchaseOrderStatus.REJECTED,
    ];

    if (!allowedEditStatuses.includes(purchaseOrder.status)) {
      res.status(400).json({
        success: false,
        message: `Cannot update purchase order in status ${purchaseOrder.status}. Edits are only permitted in draft, submitted, or rejected status before approvals.`,
      });
      return;
    }

    // If edited while submitted or rejected, invalidate prior approvals (Requirement H4)
    if (
      purchaseOrder.status === PurchaseOrderStatus.SUBMITTED ||
      purchaseOrder.status === PurchaseOrderStatus.REJECTED
    ) {
      purchaseOrder.approvals = [];
    }

    // Update fields
    const {
      title,
      items,
      deliveryLocation,
      deliveryDate,
      deliveryContact,
      shipping,
      generalTerms,
      termsOfService,
      paymentTerms,
      discount,
      discountType,
      discountAmount,
      vat,
      vatRate,
      vatAmount,
      vendorQuotes,
      serviceClassificationOverride,
      serviceClassificationReason,
    } = req.body;

    if (title) purchaseOrder.title = title;
    if (deliveryDate) purchaseOrder.deliveryDate = deliveryDate;
    if (deliveryContact) purchaseOrder.deliveryContact = deliveryContact;
    if (shipping) purchaseOrder.shipping = shipping;
    if (generalTerms !== undefined) purchaseOrder.generalTerms = generalTerms;
    if (termsOfService !== undefined) purchaseOrder.termsOfService = termsOfService;
    if (paymentTerms !== undefined) purchaseOrder.paymentTerms = paymentTerms;
    if (serviceClassificationOverride !== undefined) {
      purchaseOrder.serviceClassificationOverride = serviceClassificationOverride;
    }
    if (serviceClassificationReason !== undefined) {
      purchaseOrder.serviceClassificationReason = serviceClassificationReason;
    }
    if (Array.isArray(vendorQuotes)) {
      purchaseOrder.vendorQuotes = vendorQuotes;
    }

    if (deliveryLocation) {
      purchaseOrder.deliveryLocation = deliveryLocation;
      const locationDoc = await Location.findById(deliveryLocation);
      if (locationDoc) {
        purchaseOrder.deliveryAddressSnapshot = {
          name: locationDoc.name || "",
          address: locationDoc.address || "",
          contactPerson: locationDoc.contactPerson || "",
          phoneNumber: locationDoc.phoneNumber || "",
          email: locationDoc.email || "",
        };
      }
    }

    if (Array.isArray(items) && items.length > 0) {
      purchaseOrder.items = items.map((item: any) => ({
        itemId: item.itemId || item.id || undefined,
        lineType: item.lineType || (item.itemId ? "requisition" : "custom"),
        itemDescription: item.itemDescription || "",
        detailsSpecification: item.detailsSpecification || "",
        quantity: Number(item.quantity || 0),
        uom: item.uom || "",
        brand: item.brand || "",
        unitPrice: Number(item.unitPrice || 0),
        totalPrice: Number(item.totalPrice || (Number(item.unitPrice || 0) * Number(item.quantity || 0))),
      }));
    }

    // Recalculate totals
    const subtotal = purchaseOrder.items.reduce(
      (sum: number, item: any) => sum + (item.totalPrice || 0),
      0,
    );
    purchaseOrder.subtotal = subtotal;

    const discVal = discount ?? discountAmount ?? purchaseOrder.discount ?? 0;
    const discTyp = discountType || purchaseOrder.discountType || "fixed";
    purchaseOrder.discount = Number(discVal);
    purchaseOrder.discountType = discTyp;
    let calcDiscountAmount = 0;
    if (discTyp === "percentage") {
      calcDiscountAmount = Math.round((subtotal * Number(discVal) / 100) * 100) / 100;
    } else {
      calcDiscountAmount = Math.round(Number(discVal) * 100) / 100;
    }
    purchaseOrder.discountAmount = calcDiscountAmount;

    const taxableAmount = Math.max(0, subtotal - calcDiscountAmount);

    const vatVal = vat ?? vatRate ?? vatAmount ?? purchaseOrder.vat ?? 0;
    const isVatRateType = vatRate !== undefined || purchaseOrder.vatRate !== undefined || Number(vatVal) <= 100;
    let calcVatAmount = 0;
    if (vatAmount !== undefined) {
      calcVatAmount = Math.round(Number(vatAmount) * 100) / 100;
    } else if (isVatRateType) {
      calcVatAmount = Math.round((taxableAmount * Number(vatVal) / 100) * 100) / 100;
    } else {
      calcVatAmount = Math.round(Number(vatVal) * 100) / 100;
    }
    purchaseOrder.vat = Number(vatVal);
    purchaseOrder.vatRate = isVatRateType ? Number(vatVal) : undefined;
    purchaseOrder.vatAmount = calcVatAmount;

    purchaseOrder.totalAmount = Math.round((subtotal - calcDiscountAmount + calcVatAmount) * 100) / 100;

    await purchaseOrder.save();

    res.status(200).json({
      success: true,
      data: purchaseOrder,
      message: "Purchase order updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Acknowledge purchase order
// @route   PUT /api/purchase-orders/:id/acknowledge
// @access  Private/Vendor
export const acknowledgePurchaseOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);

    if (!purchaseOrder) {
      res
        .status(404)
        .json({ success: false, message: "Purchase order not found" });
      return;
    }

    // Check if user is the vendor for this purchase order
    if (purchaseOrder.vendor.toString() !== req.user?.vendor?.toString()) {
      res.status(403).json({
        success: false,
        message: "Not authorized to acknowledge this purchase order",
      });
      return;
    }

    // Check if purchase order is in issued status
    if (purchaseOrder.status !== PurchaseOrderStatus.ISSUED) {
      res.status(400).json({
        success: false,
        message: "Purchase order is not in issued status",
      });
      return;
    }

    // Update purchase order
    purchaseOrder.status = PurchaseOrderStatus.ACKNOWLEDGED;
    ((purchaseOrder.acknowledgedBy = req.user?._id as mongoose.Types.ObjectId),
      (purchaseOrder.acknowledgedAt = new Date()));
    await purchaseOrder.save();

    // Update requisition status
    const requisition = await Requisition.findById(purchaseOrder.requisition);
    if (requisition) {
      requisition.status = RequisitionStatus.VENDOR_ACKNOWLEDGED;
      await requisition.save();
    }

    res.status(200).json({
      success: true,
      data: purchaseOrder,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel purchase order
// @route   PUT /api/purchase-orders/:id/cancel
// @access  Private/ProcurementManager
export const cancelPurchaseOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { reason } = req.body;

    const purchaseOrder = await PurchaseOrder.findById(req.params.id);

    if (!purchaseOrder) {
      res
        .status(404)
        .json({ success: false, message: "Purchase order not found" });
      return;
    }

    // Check if purchase order is not already fulfilled or cancelled
    if (
      purchaseOrder.status === PurchaseOrderStatus.FULFILLED ||
      purchaseOrder.status === PurchaseOrderStatus.CANCELLED
    ) {
      res.status(400).json({
        success: false,
        message: "Purchase order is already fulfilled or cancelled",
      });
      return;
    }

    // Update purchase order
    purchaseOrder.status = PurchaseOrderStatus.CANCELLED;
    purchaseOrder.notes = purchaseOrder.notes
      ? `${purchaseOrder.notes}\n\nCancellation reason: ${reason}`
      : `Cancellation reason: ${reason}`;
    await purchaseOrder.save();

    // Update requisition status
    const requisition = await Requisition.findById(purchaseOrder.requisition);
    if (requisition) {
      requisition.status = RequisitionStatus.CANCELLED;
      await requisition.save();
    }

    res.status(200).json({
      success: true,
      data: purchaseOrder,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload purchase order attachment
// @route   POST /api/purchase-orders/:id/attachments
// @access  Private/ProcurementManager
export const uploadAttachment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);

    if (!purchaseOrder) {
      res
        .status(404)
        .json({ success: false, message: "Purchase order not found" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: "Please upload a file" });
      return;
    }

    const uploadedFile = await uploadToS3(
      req.file,
      "purchase-order-attachments",
    );

    // Add attachment to purchase order
    purchaseOrder.attachments = purchaseOrder.attachments || [];
    purchaseOrder.attachments.push(uploadedFile);
    await purchaseOrder.save();

    res.status(200).json({
      success: true,
      data: uploadedFile,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate purchase order PDF
// @route   GET /api/purchase-orders/:id/pdf
// @access  Private
export const generatePurchaseOrderPDF = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id)
      .populate("requisition", "requisitionNumber title department")
      .populate("rfq", "rfqNumber")
      .populate("vendor", "name contactPerson email phone address")
      .populate(
        "deliveryLocation",
        "name address contactPerson phoneNumber email",
      )
      .populate("deliveryContact", "firstName lastName email")
      .populate("createdBy", "firstName lastName email");

    if (!purchaseOrder) {
      res
        .status(404)
        .json({ success: false, message: "Purchase order not found" });
      return;
    }

    // @deprecated - Vendor permission check removed
    // Check if user has permission to view this purchase order
    // if (
    //   req.user?.role === UserRole.VENDOR &&
    //   purchaseOrder.vendor._id.toString() !== req.user?.vendor?.toString()
    // ) {
    // Gate PDF download on full approval (both HOF and HHR) (Requirement H10)
    const hasHhr = purchaseOrder.approvals?.some(
      (a: any) => a.approverRole === "hhr" && a.approvedAt && a.status !== "rejected",
    );
    const isApproved =
      purchaseOrder.status === PurchaseOrderStatus.APPROVED && hasHhr;

    if (!isApproved) {
      res.status(400).json({
        success: false,
        message:
          "Purchase order must be fully approved (both HOF and HHR) before downloading PDF",
      });
      return;
    }

    // Create a temporary directory if it doesn't exist
    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    // Create a unique filename
    const filename = `PO_${purchaseOrder.poNumber}_${uuidv4()}.pdf`;
    const filePath = path.join(tempDir, filename);

    // Create PDF document
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);
    const brandPrimary = "#0B3A66";
    const brandAccent = "#E0AA3E";
    const headerBg = "#F5F8FC";
    const rowAlt = "#FAFBFD";
    const textMuted = "#5C667A";
    const pageLeft = 40;
    const pageRight = doc.page.width - 40;
    const contentWidth = pageRight - pageLeft;
    const footerReserved = 55;

    const currency = (value: any) =>
      Number(value || 0).toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    const logoCandidates = [
      path.join(process.cwd(), "requisite", "public", "daystar_logo.png"),
      path.join(process.cwd(), "requisite", "public", "logo.png"),
      path.join(process.cwd(), "public", "daystar_logo.png"),
      path.join(process.cwd(), "public", "logo.png"),
    ];
    const logoPath = logoCandidates.find((candidate) =>
      fs.existsSync(candidate),
    );

    let pageNumber = 1;
    const drawFooter = () => {
      const y = doc.page.height - 32;
      doc
        .save()
        .strokeColor("#D7DEE9")
        .lineWidth(1)
        .moveTo(pageLeft, y - 10)
        .lineTo(pageRight, y - 10)
        .stroke()
        .restore();

      doc
        .fontSize(9)
        .fillColor(textMuted)
        .text(
          `Generated ${new Date().toLocaleString()} | PO ${purchaseOrder.poNumber}`,
          pageLeft,
          y,
          { width: contentWidth / 2, align: "left" },
        )
        .text(`Page ${pageNumber}`, pageLeft + contentWidth / 2, y, {
          width: contentWidth / 2,
          align: "right",
        });
    };

    doc.on("pageAdded", () => {
      pageNumber += 1;
      drawFooter();
    });

    const ensureRoom = (requiredHeight: number) => {
      if (doc.y + requiredHeight > doc.page.height - footerReserved) {
        doc.addPage();
        doc.y = 70;
      }
    };

    const sectionHeading = (title: string) => {
      ensureRoom(30);
      doc
        .fontSize(11)
        .fillColor(brandPrimary)
        .text(title.toUpperCase(), pageLeft, doc.y)
        .moveDown(0.25);
      const y = doc.y;
      doc
        .save()
        .strokeColor(brandAccent)
        .lineWidth(1.2)
        .moveTo(pageLeft, y)
        .lineTo(pageRight, y)
        .stroke()
        .restore();
      doc.y = y + 8;
    };

    const keyValue = (label: string, value: string) => {
      const lineHeight = 14;
      ensureRoom(lineHeight + 2);
      const startY = doc.y;
      doc
        .fontSize(10)
        .fillColor(textMuted)
        .text(`${label}:`, pageLeft, startY, { width: 120 })
        .fontSize(10)
        .fillColor("#1F2937")
        .text(value || "N/A", pageLeft + 120, startY, {
          width: contentWidth - 120,
        });
      doc.y = Math.max(doc.y, startY + lineHeight);
    };

    // Header block
    const headerTop = 40;
    doc
      .save()
      .fillColor(headerBg)
      .roundedRect(pageLeft, headerTop, contentWidth, 92, 8)
      .fill()
      .restore();

    if (logoPath) {
      doc.image(logoPath, pageLeft + 12, headerTop + 16, { fit: [105, 60] });
    }

    doc
      .fontSize(20)
      .fillColor(brandPrimary)
      .text("PURCHASE ORDER", pageLeft + 130, headerTop + 18, {
        width: contentWidth - 140,
        align: "left",
      })
      .fontSize(10)
      .fillColor(textMuted)
      .text(
        `PO Number: ${purchaseOrder.poNumber}`,
        pageLeft + 130,
        headerTop + 52,
      )
      .text(
        `Date: ${new Date(purchaseOrder.createdAt).toLocaleDateString()}`,
        pageLeft + 130,
        headerTop + 66,
      );

    doc.y = headerTop + 105;

    // Summary panel
    doc
      .save()
      .fillColor("#FFFFFF")
      .roundedRect(pageLeft, doc.y, contentWidth, 64, 6)
      .lineWidth(1)
      .strokeColor("#D7DEE9")
      .fillAndStroke()
      .restore();

    const summaryY = doc.y + 10;
    doc
      .fontSize(9)
      .fillColor(textMuted)
      .text("TITLE", pageLeft + 12, summaryY)
      .fontSize(12)
      .fillColor("#111827")
      .text(purchaseOrder.title || "N/A", pageLeft + 12, summaryY + 12, {
        width: contentWidth - 210,
      })
      .fontSize(9)
      .fillColor(textMuted)
      .text("TOTAL", pageRight - 170, summaryY)
      .fontSize(14)
      .fillColor(brandPrimary)
      .text(
        `NGN ${currency(purchaseOrder.totalAmount)}`,
        pageRight - 170,
        summaryY + 12,
        {
          width: 158,
          align: "right",
        },
      );
    doc.y += 78;

    sectionHeading("Vendor Information");
    keyValue("Name", (purchaseOrder.vendor as any)?.name || "N/A");
    keyValue("Contact", (purchaseOrder.vendor as any)?.contactPerson || "N/A");
    keyValue("Email", (purchaseOrder.vendor as any)?.email || "N/A");
    keyValue("Phone", (purchaseOrder.vendor as any)?.phone || "N/A");
    keyValue("Address", (purchaseOrder.vendor as any)?.address || "N/A");

    doc.moveDown(0.5);
    sectionHeading("Requisition & Delivery");
    keyValue(
      "Requisition Number",
      (purchaseOrder.requisition as any)?.requisitionNumber || "N/A",
    );
    keyValue(
      "Requisition Title",
      (purchaseOrder.requisition as any)?.title || "N/A",
    );
    keyValue("RFQ Number", (purchaseOrder.rfq as any)?.rfqNumber || "N/A");
    keyValue(
      "Delivery Date",
      purchaseOrder.deliveryDate
        ? new Date(purchaseOrder.deliveryDate).toLocaleDateString()
        : "N/A",
    );
    keyValue(
      "Delivery Location",
      (purchaseOrder.deliveryLocation as any)?.name || "N/A",
    );
    keyValue(
      "Delivery Contact",
      `${(purchaseOrder.deliveryContact as any)?.firstName || ""} ${(purchaseOrder.deliveryContact as any)?.lastName || ""}`.trim() ||
        "N/A",
    );

    doc.moveDown(0.6);
    sectionHeading("Ordered Items");

    const table = {
      x: pageLeft,
      width: contentWidth,
      columns: {
        item: 140,
        description: 190,
        qty: 48,
        unit: 85,
        total: 85,
      },
      headerHeight: 22,
      rowPadding: 5,
      minRowHeight: 20,
    };

    const drawTableHeader = () => {
      ensureRoom(table.headerHeight + 6);
      const y = doc.y;
      doc
        .save()
        .fillColor(brandPrimary)
        .roundedRect(table.x, y, table.width, table.headerHeight, 4)
        .fill()
        .restore();

      let cursorX = table.x + 8;
      doc
        .fontSize(9)
        .fillColor("#FFFFFF")
        .text("Item", cursorX, y + 7, { width: table.columns.item - 12 });
      cursorX += table.columns.item;
      doc.text("Specification", cursorX, y + 7, {
        width: table.columns.description - 12,
      });
      cursorX += table.columns.description;
      doc.text("Qty", cursorX, y + 7, {
        width: table.columns.qty - 12,
        align: "right",
      });
      cursorX += table.columns.qty;
      doc.text("Unit Price", cursorX, y + 7, {
        width: table.columns.unit - 12,
        align: "right",
      });
      cursorX += table.columns.unit;
      doc.text("Total", cursorX, y + 7, {
        width: table.columns.total - 12,
        align: "right",
      });

      doc.y = y + table.headerHeight + 6;
    };

    drawTableHeader();

    purchaseOrder.items.forEach((item: any, index: number) => {
      const itemName = item.itemDescription || item.name || "N/A";
      const specification =
        item.detailsSpecification || item.description || "N/A";
      const qtyText = `${Number(item.quantity || 0)}`;
      const unitPriceText = currency(item.unitPrice || 0);
      const totalPriceText = currency(
        item.totalPrice ||
          Number(item.unitPrice || 0) * Number(item.quantity || 0),
      );

      const itemHeight = doc.heightOfString(itemName, {
        width: table.columns.item - 12,
        align: "left",
      });
      const specHeight = doc.heightOfString(specification, {
        width: table.columns.description - 12,
        align: "left",
      });

      const rowHeight = Math.max(
        table.minRowHeight,
        Math.max(itemHeight, specHeight) + table.rowPadding * 2,
      );

      if (doc.y + rowHeight > doc.page.height - footerReserved) {
        doc.addPage();
        doc.y = 70;
        sectionHeading("Ordered Items (Continued)");
        drawTableHeader();
      }

      const y = doc.y;
      if (index % 2 === 0) {
        doc
          .save()
          .fillColor(rowAlt)
          .rect(table.x, y, table.width, rowHeight)
          .fill()
          .restore();
      }

      let cursorX = table.x + 8;
      doc
        .fontSize(9)
        .fillColor("#111827")
        .text(itemName, cursorX, y + table.rowPadding, {
          width: table.columns.item - 12,
          align: "left",
        });
      cursorX += table.columns.item;
      doc.text(specification, cursorX, y + table.rowPadding, {
        width: table.columns.description - 12,
        align: "left",
      });
      cursorX += table.columns.description;
      doc.text(qtyText, cursorX, y + table.rowPadding, {
        width: table.columns.qty - 12,
        align: "right",
      });
      cursorX += table.columns.qty;
      doc.text(unitPriceText, cursorX, y + table.rowPadding, {
        width: table.columns.unit - 12,
        align: "right",
      });
      cursorX += table.columns.unit;
      doc.text(totalPriceText, cursorX, y + table.rowPadding, {
        width: table.columns.total - 12,
        align: "right",
      });

      doc
        .save()
        .strokeColor("#E5E7EB")
        .lineWidth(0.7)
        .moveTo(table.x, y + rowHeight)
        .lineTo(table.x + table.width, y + rowHeight)
        .stroke()
        .restore();

      doc.y = y + rowHeight;
    });

    doc.moveDown(0.8);
    ensureRoom(90);

    const totalsBoxY = doc.y;
    doc
      .save()
      .fillColor("#FFFFFF")
      .roundedRect(pageRight - 220, totalsBoxY, 220, 54, 6)
      .lineWidth(1)
      .strokeColor("#D7DEE9")
      .fillAndStroke()
      .restore();
    doc
      .fontSize(10)
      .fillColor(textMuted)
      .text("Grand Total", pageRight - 208, totalsBoxY + 10)
      .fontSize(14)
      .fillColor(brandPrimary)
      .text(
        `NGN ${currency(purchaseOrder.totalAmount)}`,
        pageRight - 208,
        totalsBoxY + 26,
        {
          width: 196,
          align: "right",
        },
      );
    doc.y = totalsBoxY + 68;

    sectionHeading("Terms & Notes");
    keyValue(
      "Payment Terms",
      purchaseOrder.paymentTerms || purchaseOrder.generalTerms || "N/A",
    );
    keyValue("Shipping", purchaseOrder.shipping || "N/A");
    if (purchaseOrder.notes) {
      keyValue("Notes", purchaseOrder.notes);
    }

    doc.moveDown(0.8);
    ensureRoom(70);
    sectionHeading("Authorization");
    ensureRoom(45);
    const signatureY = doc.y;
    doc
      .fontSize(10)
      .fillColor("#111827")
      .text("Issued By", pageLeft, signatureY)
      .text("Vendor Acceptance", pageLeft + 280, signatureY);
    doc
      .strokeColor("#9CA3AF")
      .lineWidth(1)
      .moveTo(pageLeft, signatureY + 34)
      .lineTo(pageLeft + 220, signatureY + 34)
      .stroke()
      .moveTo(pageLeft + 280, signatureY + 34)
      .lineTo(pageLeft + 500, signatureY + 34)
      .stroke();
    doc
      .fontSize(9)
      .fillColor(textMuted)
      .text(
        `${(purchaseOrder.createdBy as any)?.firstName || ""} ${(purchaseOrder.createdBy as any)?.lastName || ""}`.trim() ||
          "N/A",
        pageLeft,
        signatureY + 38,
      )
      .text("Name / Signature", pageLeft + 280, signatureY + 38);

    drawFooter();

    // Finalize the PDF
    doc.end();

    // Wait for the PDF to be written
    writeStream.on("finish", async () => {
      try {
        // Send the file directly to the authenticated caller
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=PO_${purchaseOrder.poNumber}.pdf`,
        );
        const readStream = fs.createReadStream(filePath);
        readStream.pipe(res);

        // Delete the temporary file after streaming completes
        readStream.on("end", () => {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
        readStream.on("error", () => {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
      } catch (error) {
        // Delete the temporary file if there's an error
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        next(error);
      }
    });

    writeStream.on("error", (error) => {
      // Delete the temporary file if there's an error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      next(error);
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get purchase orders by vendor
// @route   GET /api/vendors/:vendorId/purchase-orders
// @access  Private
export const getPurchaseOrdersByVendor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { vendorId } = req.params;

    // Note: Vendor system deprecated - this endpoint searches by vendor name
    // vendorId parameter now treated as vendor name search string

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startIndex = (page - 1) * limit;

    // Filtering
    const status = req.query.status as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const query: any = {
      "vendor.name": { $regex: vendorId, $options: "i" },
    };

    if (status) {
      query.status = status;
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
    const total = await PurchaseOrder.countDocuments(query);

    // Get purchase orders
    const purchaseOrders = await PurchaseOrder.find(query)
      .populate("requisition", "requisitionNumber title")
      .populate("issuedBy", "firstName lastName email")
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
      count: purchaseOrders.length,
      pagination,
      data: purchaseOrders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get purchase orders by requisition
// @route   GET /api/requisitions/:requisitionId/purchase-orders
// @access  Private
export const getPurchaseOrdersByRequisition = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { requisitionId } = req.params;

    // Verify requisition exists
    const requisition = await Requisition.findById(requisitionId);
    if (!requisition) {
      res
        .status(404)
        .json({ success: false, message: "Requisition not found" });
      return;
    }

    // DEPRECATED: Vendor role removed - Check permissions
    // if (req.user?.role === UserRole.VENDOR) {
    //   // Vendors can only see purchase orders assigned to them
    //   const purchaseOrders = await PurchaseOrder.find({
    //     requisition: requisitionId,
    //     vendor: req.user?.vendor,
    //   });

    //   if (purchaseOrders.length === 0) {
    //     res.status(403).json({
    //       success: false,
    //       message: "Not authorized to access these purchase orders",
    //     });
    //     return;
    //   }
    // } else
    if (req.user?.role === UserRole.STAFF) {
      // Staff can only see purchase orders for requisitions they created
      if (
        requisition.requester.toString() !== (req.user as any)._id.toString()
      ) {
        res.status(403).json({
          success: false,
          message: "Not authorized to access these purchase orders",
        });
        return;
      }
    } else if (req.user?.role === UserRole.DEPARTMENT_HEAD) {
      // Department heads can only see purchase orders for their department
      if (
        requisition.department.toString() !== req.user?.department?.toString()
      ) {
        res.status(403).json({
          success: false,
          message: "Not authorized to access these purchase orders",
        });
        return;
      }
    }

    // Get purchase orders
    const purchaseOrders = await PurchaseOrder.find({
      requisition: requisitionId,
    })
      .populate("vendor", "name contactPerson email")
      .populate("issuedBy", "firstName lastName email")
      .populate("acknowledgedBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    const plainOrders = purchaseOrders.map((po: any) => {
      const plain = po.toObject ? po.toObject() : { ...po };
      plain.title =
        plain.title ||
        (plain.requisition && plain.requisition.title) ||
        "Purchase Order";
      return plain;
    });

    res.status(200).json({
      success: true,
      count: plainOrders.length,
      data: plainOrders,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// PO SUBMISSION
// ============================================

// @desc    Submit purchase order for approval
// @route   PUT /api/purchase-orders/:id/submit
// @access  Private/PROCUREMENT_MANAGER
export const submitPurchaseOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req.user as any)?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user || user.role !== UserRole.PROCUREMENT_MANAGER) {
      res.status(403).json({
        success: false,
        message: "Only Procurement Manager can submit purchase orders",
      });
      return;
    }

    const purchaseOrder = await PurchaseOrder.findById(id)
      .populate("vendor", "name contactPerson email")
      .populate("requisition", "requisitionNumber title");

    if (!purchaseOrder) {
      res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
      return;
    }

    // Verify PO is in draft status
    if (purchaseOrder.status !== PurchaseOrderStatus.DRAFT) {
      res.status(400).json({
        success: false,
        message: `Purchase order must be in draft status to submit. Current status: ${purchaseOrder.status}`,
      });
      return;
    }

    // Validate that PO has required data
    if (!purchaseOrder.items || purchaseOrder.items.length === 0) {
      res.status(400).json({
        success: false,
        message: "Purchase order must have at least one item",
      });
      return;
    }

    if (!purchaseOrder.vendor) {
      res.status(400).json({
        success: false,
        message: "Purchase order must have a vendor",
      });
      return;
    }

    // Update PO status to SUBMITTED
    purchaseOrder.status = PurchaseOrderStatus.SUBMITTED;
    purchaseOrder.submittedBy = userId;
    purchaseOrder.submittedAt = new Date();

    await purchaseOrder.save();

    res.status(200).json({
      success: true,
      message: "Purchase order submitted successfully for approval",
      data: purchaseOrder,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// PO APPROVAL CHAIN ENFORCEMENT
// ============================================

// @desc    Head of Finance approve PO (First approval)
// @route   PUT /api/purchase-orders/:id/hof-approve
// @access  Private/HOF
export const hofApprovePO = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = String(req.params.id || "").trim();
    const { feedback } = req.body;
    const userId = (req.user as any)?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const user = await User.findById(userId).populate("department");
    const isFinanceHOD =
      user &&
      (user.role === UserRole.HEAD_OF_FINANCE ||
        (user.role === UserRole.DEPARTMENT_HEAD &&
          user.department &&
          ((user.department as any).code === "5" ||
            (user.department as any).code === "FIN" ||
            (user.department as any).name?.toLowerCase().includes("finance") ||
            (user.department as any).name?.toLowerCase().includes("accounts"))));

    if (!user || !isFinanceHOD) {
      res.status(403).json({
        success: false,
        message: "Only Head of Finance can approve purchase orders",
      });
      return;
    }

    const purchaseOrder = await PurchaseOrder.findById(id)
      .populate("vendor", "name contactPerson email")
      .populate("requisition", "requisitionNumber title");

    if (!purchaseOrder) {
      res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
      return;
    }

    // Verify PO is in submitted status
    if (purchaseOrder.status !== PurchaseOrderStatus.SUBMITTED) {
      res.status(400).json({
        success: false,
        message: `Purchase order must be in submitted status. Current status: ${purchaseOrder.status}`,
      });
      return;
    }

    // Check if HoF already approved
    const hofApproval = purchaseOrder.approvals.find(
      (approval: any) => approval.approverRole === "hof",
    );

    if (hofApproval?.approvedAt) {
      res.status(400).json({
        success: false,
        message: "Purchase order already approved by Head of Finance",
      });
      return;
    }

    // Add or update HoF approval
    if (hofApproval) {
      hofApproval.approver = userId;
      hofApproval.approvedAt = new Date();
      if (feedback) {
        hofApproval.feedback = feedback;
      }
    } else {
      purchaseOrder.approvals.push({
        approver: userId,
        approverRole: "hof",
        approvedAt: new Date(),
        feedback: feedback || "",
      } as any);
    }

    // Update PO status to HOF_APPROVED
    purchaseOrder.status = PurchaseOrderStatus.HOF_APPROVED;

    await purchaseOrder.save();

    res.status(200).json({
      success: true,
      message:
        "Purchase order approved by Head of Finance. Awaiting HHR approval.",
      data: purchaseOrder,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Head of HR approve PO (Second approval - requires HoF approval first)
// @route   PUT /api/purchase-orders/:id/hhr-approve
// @access  Private/HHR
export const hhrApprovePO = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = String(req.params.id || "").trim();
    const { feedback } = req.body;
    const userId = (req.user as any)?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const user = await User.findById(userId).populate("department");
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

    if (!user || !isHrHOD) {
      res.status(403).json({
        success: false,
        message: "Only Head of Human Resources can provide final approval",
      });
      return;
    }

    const purchaseOrder = await PurchaseOrder.findById(id)
      .populate("vendor", "name contactPerson email")
      .populate("requisition", "requisitionNumber title")
      .populate("approvals.approver", "firstName lastName email role");

    if (!purchaseOrder) {
      res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
      return;
    }

    // ENFORCE APPROVAL ORDER: HoF must approve first
    if (purchaseOrder.status !== PurchaseOrderStatus.HOF_APPROVED) {
      res.status(400).json({
        success: false,
        message:
          "Purchase order must be approved by Head of Finance before HHR approval",
        currentStatus: purchaseOrder.status,
      });
      return;
    }

    // Verify HoF approval exists and is completed
    const hofApproval = purchaseOrder.approvals.find(
      (approval: any) => approval.approverRole === "hof",
    );

    if (!hofApproval || !hofApproval.approvedAt) {
      res.status(400).json({
        success: false,
        message: "Head of Finance approval is required before HHR can approve",
      });
      return;
    }

    // Check if HHR already approved
    const hhrApproval = purchaseOrder.approvals.find(
      (approval: any) => approval.approverRole === "hhr",
    );

    if (hhrApproval?.approvedAt) {
      res.status(400).json({
        success: false,
        message: "Purchase order already approved by Head of Human Resources",
      });
      return;
    }

    // Add or update HHR approval
    if (hhrApproval) {
      hhrApproval.approver = userId;
      hhrApproval.approvedAt = new Date();
      if (feedback) {
        hhrApproval.feedback = feedback;
      }
    } else {
      purchaseOrder.approvals.push({
        approver: userId,
        approverRole: "hhr",
        approvedAt: new Date(),
        feedback: feedback || "",
      } as any);
    }

    // Update PO status to APPROVED (fully approved)
    purchaseOrder.status = PurchaseOrderStatus.APPROVED;

    await purchaseOrder.save();

    // Update Requisition status to PO_APPROVED and record poApprovedAt (Requirement B1, B2)
    if (purchaseOrder.requisition) {
      await Requisition.findByIdAndUpdate(purchaseOrder.requisition, {
        status: RequisitionStatus.PO_APPROVED,
        poApprovedAt: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      message: "Purchase order fully approved. Ready for processing.",
      data: purchaseOrder,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject PO (HoF or HHR)
// @route   PUT /api/purchase-orders/:id/reject
// @access  Private/HOF/HHR
type PurchaseOrderRejectStage = "hof" | "hhr";

const rejectPurchaseOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
  requiredStage?: PurchaseOrderRejectStage,
): Promise<void> => {
  try {
    const id = String(req.params.id || "").trim();
    const { reason, feedback } = req.body;
    const userId = (req.user as any)?._id;

    const rejectionReason =
      typeof reason === "string" && reason.trim()
        ? reason.trim()
        : typeof feedback === "string" && feedback.trim()
        ? feedback.trim()
        : "";

    if (!rejectionReason) {
      res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
      return;
    }

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const user = await User.findById(userId).populate("department");
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

    if (!user || (!isFinanceHOD && !isHrHOD)) {
      res.status(403).json({
        success: false,
        message:
          "Only Head of Finance or Head of HR can reject purchase orders",
      });
      return;
    }

    const purchaseOrder = await PurchaseOrder.findById(id)
      .populate("vendor", "name contactPerson email")
      .populate("requisition", "requisitionNumber title");

    if (!purchaseOrder) {
      res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
      return;
    }

    const approverRole: PurchaseOrderRejectStage = isFinanceHOD ? "hof" : "hhr";
    if (requiredStage && approverRole !== requiredStage) {
      res.status(403).json({
        success: false,
        message: "Only the " + (requiredStage === "hof" ? "Head of Finance" : "Head of HR") + " can use this endpoint",
      });
      return;
    }

    // HOF may decline a submitted PO; HHR may only decline after HOF approval.
    const expectedStatus =
      approverRole === "hof"
        ? PurchaseOrderStatus.SUBMITTED
        : PurchaseOrderStatus.HOF_APPROVED;
    if (purchaseOrder.status !== expectedStatus) {
      res.status(400).json({
        success: false,
        message: "Cannot reject purchase order with status: " + purchaseOrder.status,
      });
      return;
    }

    // Record the rejection in approvals
    const existingApproval = purchaseOrder.approvals.find(
      (approval: any) => approval.approverRole === approverRole,
    );

    if (existingApproval) {
      existingApproval.approver = userId;
      existingApproval.approvedAt = undefined;
      existingApproval.status = "rejected";
      existingApproval.rejectedAt = new Date();
      existingApproval.feedback = rejectionReason;
      existingApproval.reason = rejectionReason;
    } else {
      purchaseOrder.approvals.push({
        approver: userId,
        approverRole,
        status: "rejected",
        approvedAt: undefined,
        rejectedAt: new Date(),
        feedback: rejectionReason,
        reason: rejectionReason,
      } as any);
    }

    // Update PO status to REJECTED
    purchaseOrder.status = PurchaseOrderStatus.REJECTED;

    await purchaseOrder.save();

    res.status(200).json({
      success: true,
      message: "Purchase order rejected by " + (isFinanceHOD ? "Head of Finance" : "Head of HR"),
      data: purchaseOrder,
    });
  } catch (error) {
    next(error);
  }
};

// Backwards-compatible role-aware rejection endpoint.
export const rejectPO = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => rejectPurchaseOrder(req, res, next);

// Explicit endpoints used by current clients.
export const hofRejectPO = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => rejectPurchaseOrder(req, res, next, "hof");

export const hhrRejectPO = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => rejectPurchaseOrder(req, res, next, "hhr");
