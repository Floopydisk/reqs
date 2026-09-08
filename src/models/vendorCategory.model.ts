import mongoose, { Schema } from "mongoose";
import { IVendorCategory } from "../types/interfaces";

const vendorCategorySchema = new Schema<IVendorCategory>(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IVendorCategory>(
  "VendorCategory",
  vendorCategorySchema
);
