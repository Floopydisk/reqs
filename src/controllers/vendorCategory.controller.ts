import { Request, Response, NextFunction } from "express";
import VendorCategory from "../models/vendorCategory.model";
import Vendor from "../models/vendor.model";
import { UserRole } from "../types/enums";

// @desc    Get all vendor categories
// @route   GET /api/vendor-categories
// @access  Private
export const getVendorCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startIndex = (page - 1) * limit;

    // Filtering
    const search = req.query.search as string;
    let query = {};

    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ],
      };
    }

    // Get total count
    const total = await VendorCategory.countDocuments(query);

    // Get vendor categories
    const vendorCategories = await VendorCategory.find(query)
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
      count: vendorCategories.length,
      pagination,
      data: vendorCategories,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single vendor category
// @route   GET /api/vendor-categories/:id
// @access  Private
export const getVendorCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const vendorCategory = await VendorCategory.findById(req.params.id);

    if (!vendorCategory) {
      res.status(404).json({
        success: false,
        message: "Vendor category not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: vendorCategory,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create vendor category
// @route   POST /api/vendor-categories
// @access  Private/Admin/ProcurementManager
export const createVendorCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawName =
      typeof req.body.name === "string" ? req.body.name.trim() : "";

    if (!rawName) {
      res.status(400).json({
        success: false,
        message: "Category name is required",
      });
      return;
    }

    // Case-insensitive check with trimmed name (Requirement F2)
    const escapedName = rawName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const existingCategory = await VendorCategory.findOne({
      name: { $regex: new RegExp(`^${escapedName}$`, "i") },
    });

    if (existingCategory) {
      res.status(400).json({
        success: false,
        message: "Vendor category with this name already exists",
      });
      return;
    }

    // Create vendor category
    const vendorCategory = await VendorCategory.create({
      ...req.body,
      name: rawName,
      createdBy: req.user?._id,
    });

    res.status(201).json({
      success: true,
      data: vendorCategory,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update vendor category
// @route   PUT /api/vendor-categories/:id
// @access  Private/Admin/ProcurementManager
export const updateVendorCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if category exists
    let vendorCategory = await VendorCategory.findById(req.params.id);

    if (!vendorCategory) {
      res.status(404).json({
        success: false,
        message: "Vendor category not found",
      });
      return;
    }

    // Check if another category with the same name already exists
    if (req.body.name) {
      const existingCategory = await VendorCategory.findOne({
        name: req.body.name,
        _id: { $ne: req.params.id },
      });

      if (existingCategory) {
        res.status(400).json({
          success: false,
          message: "Vendor category with this name already exists",
        });
        return;
      }
    }

    // Update vendor category
    vendorCategory = await VendorCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      data: vendorCategory,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete vendor category
// @route   DELETE /api/vendor-categories/:id
// @access  Private/Admin/ProcurementManager
export const deleteVendorCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if category exists
    const vendorCategory = await VendorCategory.findById(req.params.id);

    if (!vendorCategory) {
      res.status(404).json({
        success: false,
        message: "Vendor category not found",
      });
      return;
    }

    // Check if category is being used by vendors
    const vendorsUsingCategory = await Vendor.countDocuments({
      categories: req.params.id,
    });

    if (vendorsUsingCategory > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete category that is being used by ${vendorsUsingCategory} vendors`,
      });
      return;
    }

    // Check if category is being used in requisitions
    // This would require checking the Requisition model, but I'll assume it's similar to the Vendor check
    // const requisitionsUsingCategory = await Requisition.countDocuments({
    //   vendorCategory: req.params.id,
    // });
    //
    // if (requisitionsUsingCategory > 0) {
    //   res.status(400).json({
    //     success: false,
    //     message: `Cannot delete category that is being used by ${requisitionsUsingCategory} requisitions`,
    //   });
    //   return;
    // }

    // Delete vendor category
    await vendorCategory.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get vendors by category
// @route   GET /api/vendor-categories/:id/vendors
// @access  Private
export const getVendorsByCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if category exists
    const vendorCategory = await VendorCategory.findById(req.params.id);

    if (!vendorCategory) {
      res.status(404).json({
        success: false,
        message: "Vendor category not found",
      });
      return;
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startIndex = (page - 1) * limit;

    // Filtering
    const search = req.query.search as string;
    const isVerified = req.query.isVerified === "true";
    const isActive = req.query.isActive === "true";

    const query: any = { categories: req.params.id };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (req.query.isVerified !== undefined) {
      query.isVerified = isVerified;
    }

    if (req.query.isActive !== undefined) {
      query.isActive = isActive;
    }

    // Get total count
    const total = await Vendor.countDocuments(query);

    // Get vendors
    const vendors = await Vendor.find(query)
      .select("-password")
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

    // Restrict sensitive information for non-admin users
    let vendorData = vendors;
    if (
      req.user!.role !== UserRole.ADMIN &&
      req.user!.role !== UserRole.PROCUREMENT_MANAGER
    ) {
      vendorData = vendors.map((vendor) => ({
        _id: vendor._id,
        name: vendor.name,
        contactPerson: vendor.contactPerson,
        email: vendor.email,
        phone: vendor.phone,
        isVerified: vendor.isVerified,
        isActive: vendor.isActive,
      })) as typeof vendors;
    }

    res.status(200).json({
      success: true,
      count: vendors.length,
      pagination,
      data: vendorData,
    });
  } catch (error) {
    next(error);
  }
};
