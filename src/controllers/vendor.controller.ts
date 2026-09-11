import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Vendor from "../models/vendor.model";
import RFQ from "../models/rfq.model";
import PurchaseOrder from "../models/purchaseOrder.model";
import Delivery from "../models/delivery.model";
import { deleteFileByUrl, uploadToS3 } from "../utils/fileUpload";
import { UserRole } from "../types/enums";
import { db } from "../db";
import { vendors } from "../db/schema";
import { eq } from "drizzle-orm";

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

    // Try MongoDB first
    try {
      const total = await Vendor.countDocuments(query);
      const vendorsList = await Vendor.find(query)
        .populate("categories", "name")
        .sort({ name: 1 })
        .skip(startIndex)
        .limit(limit);

      const pagination = {
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
        limit,
      };

      res.status(200).json({
        success: true,
        count: vendorsList.length,
        pagination,
        data: vendorsList,
      });
      return;
    } catch (e) {
      // Fallback to PostgreSQL
    }

    // PostgreSQL fallback
    let allVendors = await db.query.vendors.findMany();
    if (search) {
      const s = search.toLowerCase();
      allVendors = allVendors.filter(
        (v) =>
          v.name?.toLowerCase().includes(s) ||
          v.contactPerson?.toLowerCase().includes(s) ||
          v.email?.toLowerCase().includes(s),
      );
    }
    if (category) {
      allVendors = allVendors.filter(
        (v) =>
          Array.isArray(v.categories) &&
          (v.categories as any[]).includes(category),
      );
    }
    if (req.query.verified !== undefined) {
      allVendors = allVendors.filter((v) => v.isVerified === isVerified);
    }
    if (req.query.active !== undefined) {
      allVendors = allVendors.filter((v) => v.isActive === isActive);
    }

    const totalPg = allVendors.length;
    allVendors.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    const paginated = allVendors.slice(startIndex, startIndex + limit);

    const data = paginated.map((v) => ({
      _id: v.id,
      ...v,
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

// @desc    Get single vendor by ID
// @route   GET /api/vendors/:id
// @access  Private (All authenticated users can read)
export const getVendor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = String(req.params.id);
    try {
      const vendor = await Vendor.findById(id).populate(
        "categories",
        "name description",
      );

      if (vendor) {
        res.status(200).json({
          success: true,
          data: vendor,
        });
        return;
      }
    } catch (error) {
      // Fallback to PostgreSQL
    }

    const pgVendor = await db.query.vendors.findFirst({
      where: eq(vendors.id, id),
    });

    if (!pgVendor) {
      res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        _id: pgVendor.id,
        ...pgVendor,
      },
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
    const id = new mongoose.Types.ObjectId().toString();
    try {
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
      return;
    } catch (error) {
      // Fallback to PostgreSQL
    }

    const existingPg = await db.query.vendors.findFirst({
      where: eq(vendors.email, req.body.email),
    });
    if (existingPg) {
      res.status(400).json({
        success: false,
        message: "Vendor with this email already exists",
      });
      return;
    }

    const newVendor = {
      id,
      name: req.body.name,
      contactPerson: req.body.contactPerson,
      contactPersonDesignation: req.body.contactPersonDesignation || null,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address,
      website: req.body.website || null,
      dateOfIncorporation: req.body.dateOfIncorporation
        ? new Date(req.body.dateOfIncorporation)
        : null,
      categories: req.body.categories || [],
      documents: req.body.documents || [],
      cacDocument: req.body.cacDocument || null,
      rating: req.body.rating ? String(req.body.rating) : null,
      isVerified: Boolean(req.body.isVerified),
      isActive: req.body.isActive !== false,
      status: req.body.status || "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(vendors).values(newVendor);
    res.status(201).json({
      success: true,
      data: { _id: id, ...newVendor },
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
    const id = String(req.params.id);
    try {
      let vendor = await Vendor.findById(id);

      if (vendor) {
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
        vendor = await Vendor.findByIdAndUpdate(id, req.body, {
          new: true,
          runValidators: true,
        }).populate("categories", "name");

        res.status(200).json({
          success: true,
          data: vendor,
        });
        return;
      }
    } catch (error) {
      // Fallback to PostgreSQL
    }

    const existingPg = await db.query.vendors.findFirst({
      where: eq(vendors.id, id),
    });

    if (!existingPg) {
      res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
      return;
    }

    if (req.body.email && req.body.email !== existingPg.email) {
      const duplicate = await db.query.vendors.findFirst({
        where: eq(vendors.email, req.body.email),
      });
      if (duplicate) {
        res.status(400).json({
          success: false,
          message: "Vendor with this email already exists",
        });
        return;
      }
    }

    const updates: any = { updatedAt: new Date() };
    if (req.body.name) updates.name = req.body.name;
    if (req.body.contactPerson) updates.contactPerson = req.body.contactPerson;
    if (req.body.contactPersonDesignation !== undefined)
      updates.contactPersonDesignation = req.body.contactPersonDesignation;
    if (req.body.email) updates.email = req.body.email;
    if (req.body.phone) updates.phone = req.body.phone;
    if (req.body.address) updates.address = req.body.address;
    if (req.body.website !== undefined) updates.website = req.body.website;
    if (req.body.dateOfIncorporation !== undefined)
      updates.dateOfIncorporation = req.body.dateOfIncorporation
        ? new Date(req.body.dateOfIncorporation)
        : null;
    if (req.body.categories) updates.categories = req.body.categories;
    if (req.body.isVerified !== undefined)
      updates.isVerified = Boolean(req.body.isVerified);
    if (req.body.isActive !== undefined)
      updates.isActive = Boolean(req.body.isActive);
    if (req.body.status) updates.status = req.body.status;

    await db.update(vendors).set(updates).where(eq(vendors.id, id));

    const updatedPg = await db.query.vendors.findFirst({
      where: eq(vendors.id, id),
    });

    res.status(200).json({
      success: true,
      data: { _id: id, ...updatedPg },
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
    const id = String(req.params.id);
    try {
      const vendor = await Vendor.findById(id);

      if (vendor) {
        // Check if vendor has any bids or purchase orders
        const rfqCount = await RFQ.countDocuments({
          "bids.vendor": id,
        });

        const purchaseOrderCount = await PurchaseOrder.countDocuments({
          vendor: id,
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
        return;
      }
    } catch (error) {
      // Fallback to PostgreSQL
    }

    const existingPg = await db.query.vendors.findFirst({
      where: eq(vendors.id, id),
    });

    if (!existingPg) {
      res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
      return;
    }

    await db.delete(vendors).where(eq(vendors.id, id));

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

