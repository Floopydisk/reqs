import mongoose, { Schema } from "mongoose";
import { IVendorCategory } from "../types/interfaces";
import { syncVendorCategoryToPostgres } from "../utils/pgSync";

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

vendorCategorySchema.post("save", async function (doc, next) {
  try {
    await syncVendorCategoryToPostgres(doc);
  } catch (err) {
    console.error("PG Sync error (vendorCategory save):", err);
  }
  next();
});

vendorCategorySchema.post("findOneAndUpdate", async function (doc, next) {
  if (doc) {
    try {
      await syncVendorCategoryToPostgres(doc);
    } catch (err) {
      console.error("PG Sync error (vendorCategory findOneAndUpdate):", err);
    }
  }
  next();
});

export default mongoose.model<IVendorCategory>(
  "VendorCategory",
  vendorCategorySchema
);
