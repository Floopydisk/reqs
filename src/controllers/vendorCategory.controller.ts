import { Request, Response, NextFunction } from "express";
import VendorCategory from "../models/vendorCategory.model";
import Vendor from "../models/vendor.model";
import { UserRole } from "../types/enums";
import { db } from "../db";
import { vendorCategories } from "../db/schema";
import { eq, ilike, or } from "drizzle-orm";
import mongoose from "mongoose";

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

    try {
      let query = {};
      if (search) {
        query = {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ],
        };
      }

      const total = await VendorCategory.countDocuments(query);
      const categories = await VendorCategory.find(query)
        .sort({ name: 1 })
        .skip(startIndex)
        .limit(limit);

      if (categories && categories.length > 0) {
        res.status(200).json({
          success: true,
          count: categories.length,
          pagination: {
            total,
            page,
            pages: Math.ceil(total / limit),
            limit,
          },
          data: categories,
        });
        return;
      }
    } catch (e) {
      // Fallback to PostgreSQL
    }

    // PostgreSQL fallback
    let pgCats = await db.query.vendorCategories.findMany();
    if (search) {
      const lower = search.toLowerCase();
      pgCats = pgCats.filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          (c.description && c.description.toLowerCase().includes(lower))
      );
    }

    const total = pgCats.length;
    const paginated = pgCats.slice(startIndex, startIndex + limit).map((c) => ({
      _id: c.id,
      ...c,
    }));

    res.status(200).json({
      success: true,
      count: paginated.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
        limit,
      },
      data: paginated,
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
    const id = String(req.params.id);
    try {
      const vendorCategory = await VendorCategory.findById(id);
      if (vendorCategory) {
        res.status(200).json({
          success: true,
          data: vendorCategory,
        });
        return;
      }
    } catch (e) {
      // Fallback to PostgreSQL
    }

    const pgCat = await db.query.vendorCategories.findFirst({
      where: eq(vendorCategories.id, id),
    });

    if (!pgCat) {
      res.status(404).json({
        success: false,
        message: "Vendor category not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { _id: pgCat.id, ...pgCat },
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

    try {
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

      // Create vendor category in MongoDB
      const vendorCategory = await VendorCategory.create({
        ...req.body,
        name: rawName,
        createdBy: req.user?._id,
      });

      res.status(201).json({
        success: true,
        data: vendorCategory,
      });
      return;
    } catch (e) {
      // Fallback to PostgreSQL
    }

    // Check existing in PostgreSQL
    const existingPg = await db.query.vendorCategories.findFirst({
      where: ilike(vendorCategories.name, rawName),
    });

    if (existingPg) {
      res.status(400).json({
        success: false,
        message: "Vendor category with this name already exists",
      });
      return;
    }

    const id = new mongoose.Types.ObjectId().toString();
    const newCat = {
      id,
      name: rawName,
      description: req.body.description || null,
      createdById: req.user?.id?.toString() || req.user?._id?.toString() || null,
    };

    await db.insert(vendorCategories).values(newCat);

    res.status(201).json({
      success: true,
      data: { _id: id, ...newCat },
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
    const id = String(req.params.id);
    try {
      // Check if category exists
      let vendorCategory = await VendorCategory.findById(id);
      if (vendorCategory) {
        if (req.body.name) {
          const existingCategory = await VendorCategory.findOne({
            name: req.body.name,
            _id: { $ne: id },
          });

          if (existingCategory) {
            res.status(400).json({
              success: false,
              message: "Vendor category with this name already exists",
            });
            return;
          }
        }

        vendorCategory = await VendorCategory.findByIdAndUpdate(
          id,
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
        return;
      }
    } catch (e) {
      // Fallback to PostgreSQL
    }

    // PostgreSQL fallback
    const existingPg = await db.query.vendorCategories.findFirst({
      where: eq(vendorCategories.id, id),
    });

    if (!existingPg) {
      res.status(404).json({
        success: false,
        message: "Vendor category not found",
      });
      return;
    }

    const updates: Partial<{ name: string; description: string }> = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.description !== undefined) updates.description = req.body.description;

    await db
      .update(vendorCategories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(vendorCategories.id, id));

    const updated = await db.query.vendorCategories.findFirst({
      where: eq(vendorCategories.id, id),
    });

    res.status(200).json({
      success: true,
      data: { _id: id, ...updated },
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
    const id = String(req.params.id);
    try {
      const vendorCategory = await VendorCategory.findById(id);
      if (vendorCategory) {
        const vendorsUsingCategory = await Vendor.countDocuments({
          categories: id,
        });

        if (vendorsUsingCategory > 0) {
          res.status(400).json({
            success: false,
            message: `Cannot delete category that is being used by ${vendorsUsingCategory} vendors`,
          });
          return;
        }

        await vendorCategory.deleteOne();
        res.status(200).json({
          success: true,
          data: {},
        });
        return;
      }
    } catch (e) {
      // Fallback to PostgreSQL
    }

    const existingPg = await db.query.vendorCategories.findFirst({
      where: eq(vendorCategories.id, id),
    });

    if (!existingPg) {
      res.status(404).json({
        success: false,
        message: "Vendor category not found",
      });
      return;
    }

    await db
      .delete(vendorCategories)
      .where(eq(vendorCategories.id, id));

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
