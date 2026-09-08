import { Request, Response, NextFunction } from "express";
import Vendor from "../models/vendor.model";
import VendorCategory from "../models/vendorCategory.model";

/**
 * Check vendor category assignments
 * @param req Request
 * @param res Response
 * @param next NextFunction
 */
export const checkVendorCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categoryId = req.query.categoryId as string;

    if (categoryId) {
      // Check if category exists
      const category = await VendorCategory.findById(categoryId);
      if (!category) {
        res.status(404).json({
          success: false,
          message: "Category not found",
        });
        return;
      }

      // Get vendors in this category
      const vendors = await Vendor.find({
        categories: categoryId,
        isVerified: true,
        isActive: true,
      }).select("name email");

      // Get all vendors in this category regardless of verification status
      const allVendors = await Vendor.find({
        categories: categoryId,
      }).select("name email isVerified isActive");

      res.status(200).json({
        success: true,
        data: {
          category: category,
          activeVerifiedVendors: vendors,
          allVendorsInCategory: allVendors,
          count: {
            total: allVendors.length,
            verified: vendors.length,
          },
        },
      });
    } else {
      // Get all categories with vendor counts
      const categories = await VendorCategory.find();
      const result = [];

      for (const category of categories) {
        const vendorCount = await Vendor.countDocuments({
          categories: category._id,
        });

        const verifiedCount = await Vendor.countDocuments({
          categories: category._id,
          isVerified: true,
          isActive: true,
        });

        result.push({
          category: category,
          totalVendors: vendorCount,
          verifiedVendors: verifiedCount,
        });
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    }
  } catch (error) {
    next(error);
  }
};

export default {
  checkVendorCategories,
};
