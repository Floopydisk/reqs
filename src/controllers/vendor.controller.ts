import { Request, Response, NextFunction } from "express";
import Vendor from "../models/vendor.model";
import RFQ from "../models/rfq.model";
import PurchaseOrder from "../models/purchaseOrder.model";
import Delivery from "../models/delivery.model";
import { deleteFileByUrl, uploadToS3 } from "../utils/fileUpload";
import { UserRole } from "../types/enums";

// @desc    Get all vendors
// @route   GET /api/vendors
// @access  Private (All authenticated users can read)
export const getVendors = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startIndex = (page - 1) * limit;

    // Filtering
    const search = req.query.search as string;
    const category = req.query.category as string;
    const isVerified = req.query.verified === "true";
    const isActive = req.query.active === "true";

    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      query.categories = category;
    }

    if (req.query.verified !== undefined) {
      query.isVerified = isVerified;
    }

    if (req.query.active !== undefined) {
      query.isActive = isActive;
    }

    // Get total count
    const total = await Vendor.countDocuments(query);

    // Get vendors
    const vendors = await Vendor.find(query)
      .populate("categories", "name")
      .sort({ name: 1 })
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
      count: vendors.length,
      pagination,
      data: vendors,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single vendor by ID
// @route   GET /api/vendors/:id
// @access  Private (All authenticated users can read)
export const getVendor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const vendor = await Vendor.findById(req.params.id).populate(
      "categories",
      "name description",
    );

    if (!vendor) {
      res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create vendor
// @route   POST /api/vendors
// @access  Private (PROCUREMENT_MANAGER, ADMIN, SUPER_ADMIN)
export const createVendor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const isAllowed =
      req.user?.role === UserRole.PROCUREMENT_MANAGER ||
      req.user?.role === UserRole.ADMIN ||
      req.user?.role === UserRole.SUPER_ADMIN;

    if (!isAllowed) {
      res.status(403).json({
        success: false,
        message: "Only Procurement Managers and Admins can create vendors",
      });
      return;
    }

    // Optional dateOfIncorporation validation (Requirement F1)
    if (req.body.dateOfIncorporation !== undefined && req.body.dateOfIncorporation !== null) {
      if (req.body.dateOfIncorporation === "") {
        req.body.dateOfIncorporation = undefined;
      } else if (isNaN(Date.parse(req.body.dateOfIncorporation))) {
        res.status(400).json({
          success: false,
          message: "Invalid date format for dateOfIncorporation",
        });
        return;
      }
    }

    // Check if vendor with same email already exists
    const existingVendor = await Vendor.findOne({ email: req.body.email });

    if (existingVendor) {
      res.status(400).json({
        success: false,
        message: "Vendor with this email already exists",
      });
      return;
    }

    // Create vendor
    const vendor = await Vendor.create(req.body);

    // Populate categories
    await vendor.populate("categories", "name");

    res.status(201).json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update vendor
// @route   PUT /api/vendors/:id
// @access  Private (PROCUREMENT_MANAGER, ADMIN)
export const updateVendor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    let vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
      return;
    }

    // Check if email is being updated and already exists
    if (req.body.email && req.body.email !== vendor.email) {
      const existingVendor = await Vendor.findOne({ email: req.body.email });
      if (existingVendor) {
        res.status(400).json({
          success: false,
          message: "Vendor with this email already exists",
        });
        return;
      }
    }

    // Update vendor
    vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("categories", "name");

    res.status(200).json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete vendor
// @route   DELETE /api/vendors/:id
// @access  Private (ADMIN only)
export const deleteVendor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
      return;
    }

    // Check if vendor has any bids or purchase orders
    const rfqCount = await RFQ.countDocuments({
      "bids.vendor": req.params.id,
    });

    const purchaseOrderCount = await PurchaseOrder.countDocuments({
      vendor: req.params.id,
    });

    if (rfqCount > 0 || purchaseOrderCount > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete vendor with ${rfqCount} bids and ${purchaseOrderCount} purchase orders. Consider deactivating instead.`,
      });
      return;
    }

    // Delete vendor documents from S3 if they exist
    if (vendor.cacDocument?.url) {
      const deleted = await deleteFileByUrl(vendor.cacDocument.url);
      if (!deleted) {
        console.error("Error deleting CAC document from S3");
      }
    }

    if (vendor.documents && vendor.documents.length > 0) {
      for (const doc of vendor.documents) {
        const deleted = await deleteFileByUrl(doc.url);
        if (!deleted) {
          console.error("Error deleting document from S3");
        }
      }
    }

    await vendor.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload CAC document for vendor
// @route   POST /api/vendors/:id/cac-document
// @access  Private (PROCUREMENT_MANAGER, ADMIN)
export const uploadCACDocument = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "Please upload a CAC document file",
      });
      return;
    }

    // Delete old CAC document if exists
    if (vendor.cacDocument?.url) {
      const deleted = await deleteFileByUrl(vendor.cacDocument.url);
      if (!deleted) {
        console.error("Error deleting old CAC document from S3");
      }
    }

    const uploadedDocument = await uploadToS3(req.file, "vendor-cac-documents");

    // Save new CAC document info
    vendor.cacDocument = {
      name: uploadedDocument.name,
      url: uploadedDocument.url,
      uploadedAt: uploadedDocument.uploadedAt,
    };

    await vendor.save();

    res.status(200).json({
      success: true,
      message: "CAC document uploaded successfully",
      data: vendor.cacDocument,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete CAC document for vendor
// @route   DELETE /api/vendors/:id/cac-document
// @access  Private (PROCUREMENT_MANAGER, ADMIN)
export const deleteCACDocument = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
      return;
    }

    if (!vendor.cacDocument?.url) {
      res.status(404).json({
        success: false,
        message: "CAC document not found",
      });
      return;
    }

    const deleted = await deleteFileByUrl(vendor.cacDocument.url);
    if (!deleted) {
      console.error("Error deleting CAC document from S3");
    }

    // Remove from vendor
    vendor.cacDocument = undefined;
    await vendor.save();

    res.status(200).json({
      success: true,
      message: "CAC document deleted successfully",
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve and verify vendor
// @route   PUT /api/vendors/:id/approve
// @access  Private (HEAD_OF_HR, ADMIN, SUPER_ADMIN)
export const approveAndVerifyVendor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const isAuthorized =
      req.user?.role === UserRole.HEAD_OF_HR ||
      req.user?.role === UserRole.HHRA ||
      req.user?.role === UserRole.ADMIN ||
      req.user?.role === UserRole.SUPER_ADMIN;

    if (!isAuthorized) {
      res.status(403).json({
        success: false,
        message: "Only Head of HR or Admin can approve vendors",
      });
      return;
    }

    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
      return;
    }

    vendor.status = "approved";
    vendor.isVerified = true;
    vendor.isActive = true;

    await vendor.save();

    res.status(200).json({
      success: true,
      message: "Vendor approved and verified successfully",
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject vendor
// @route   PUT /api/vendors/:id/reject
// @access  Private (HEAD_OF_HR, ADMIN, SUPER_ADMIN)
export const rejectVendor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const isAuthorized =
      req.user?.role === UserRole.HEAD_OF_HR ||
      req.user?.role === UserRole.HHRA ||
      req.user?.role === UserRole.ADMIN ||
      req.user?.role === UserRole.SUPER_ADMIN;

    if (!isAuthorized) {
      res.status(403).json({
        success: false,
        message: "Only Head of HR or Admin can reject vendors",
      });
      return;
    }

    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
      return;
    }

    if (vendor.status !== "pending") {
      res.status(400).json({
        success: false,
        message: "Vendor has already been processed",
      });
      return;
    }

    vendor.status = "rejected";
    vendor.isActive = false;

    await vendor.save();

    res.status(200).json({
      success: true,
      message: "Vendor rejected successfully",
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deactivate vendor
// @route   PUT /api/vendors/:id/deactivate
// @access  Private (HEAD_OF_HR, ADMIN, SUPER_ADMIN)
export const deactivateVendor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const isAuthorized =
      req.user?.role === UserRole.HEAD_OF_HR ||
      req.user?.role === UserRole.HHRA ||
      req.user?.role === UserRole.ADMIN ||
      req.user?.role === UserRole.SUPER_ADMIN;

    if (!isAuthorized) {
      res.status(403).json({
        success: false,
        message: "Only Head of HR or Admin can deactivate vendors",
      });
      return;
    }

    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
      return;
    }

    vendor.isActive = false;
    await vendor.save();

    res.status(200).json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Activate vendor
// @route   PUT /api/vendors/:id/activate
// @access  Private (HEAD_OF_HR, ADMIN, SUPER_ADMIN)
export const activateVendor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const isAuthorized =
      req.user?.role === UserRole.HEAD_OF_HR ||
      req.user?.role === UserRole.HHRA ||
      req.user?.role === UserRole.ADMIN ||
      req.user?.role === UserRole.SUPER_ADMIN;

    if (!isAuthorized) {
      res.status(403).json({
        success: false,
        message: "Only Head of HR or Admin can activate vendors",
      });
      return;
    }

    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
      return;
    }

    vendor.isActive = true;
    await vendor.save();

    res.status(200).json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get vendor performance metrics
// @route   GET /api/vendors/:id/performance
// @access  Private (PROCUREMENT_MANAGER, ADMIN)
export const getVendorPerformance = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
      return;
    }

    // Date range filter (default: last 12 months)
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();

    // Get RFQ/bid performance
    const rfqs = await RFQ.find({
      vendor: req.params.id,
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const bidPerformance = {
      total: rfqs.length,
      selected: rfqs.filter((rfq) => rfq.status === "completed").length,
      shortlisted: rfqs.filter(
        (rfq) => rfq.status === "issued" || rfq.status === "quoteReceived",
      ).length,
      rejected: rfqs.filter((rfq) => rfq.status === "cancelled").length,
      winRate: 0,
    };

    bidPerformance.winRate =
      bidPerformance.total > 0
        ? (bidPerformance.selected / bidPerformance.total) * 100
        : 0;

    // Get purchase order performance
    const purchaseOrders = await PurchaseOrder.find({
      vendor: req.params.id,
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const purchaseOrderPerformance = {
      total: purchaseOrders.length,
      fulfilled: purchaseOrders.filter((po) => po.status === "fulfilled")
        .length,
      cancelled: purchaseOrders.filter((po) => po.status === "cancelled")
        .length,
      fulfillmentRate: 0,
    };

    purchaseOrderPerformance.fulfillmentRate =
      purchaseOrderPerformance.total > 0
        ? (purchaseOrderPerformance.fulfilled /
            purchaseOrderPerformance.total) *
          100
        : 0;

    // Get delivery performance
    const deliveries = await Delivery.find({
      vendor: req.params.id,
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const deliveryPerformance = {
      total: deliveries.length,
      onTime: deliveries.filter(
        (d) =>
          d.status === "completed" ||
          d.status === "inventoryVerified" ||
          d.status === "departmentVerified",
      ).length,
      onTimeRate: 0,
      qualityRating: 0,
    };

    deliveryPerformance.onTimeRate =
      deliveryPerformance.total > 0
        ? (deliveryPerformance.onTime / deliveryPerformance.total) * 100
        : 0;

    // Business metrics
    const totalValue = purchaseOrders.reduce(
      (sum, po) => sum + (po.totalAmount || 0),
      0,
    );

    const businessMetrics = {
      totalValue,
      averageOrderValue:
        purchaseOrderPerformance.total > 0
          ? totalValue / purchaseOrderPerformance.total
          : 0,
    };

    res.status(200).json({
      success: true,
      data: {
        bidPerformance,
        purchaseOrderPerformance,
        deliveryPerformance,
        businessMetrics,
        dateRange: {
          start: startDate,
          end: endDate,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

