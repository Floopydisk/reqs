import { Schema } from "mongoose";
import { IItem } from "../types/interfaces";
import { ItemStatus } from "../types/enums";

const itemSchema = new Schema<IItem>(
  {
    itemName: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },
    itemType: {
      type: String,
      enum: ["product", "service"],
      required: [true, "Item type is required"],
    },
    preferredBrand: {
      type: String,
      trim: true,
    },
    itemDescription: {
      type: String,
      required: [true, "Item description is required"],
      trim: true,
    },
    uploadImage: {
      type: String,
    },
    units: {
      type: Number,
      min: [1, "Units must be at least 1"],
    },
    UOM: {
      type: String,
    },
    recommendedVendor: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
    },
    isWorkTool: {
      type: Boolean,
      required: [true, "isWorkTool is required"],
      default: false,
    },
    // Item-level status tracking
    status: {
      type: String,
      enum: Object.values(ItemStatus),
      default: ItemStatus.PENDING,
    },
    // Approval/rejection tracking
    departmentApprovedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    departmentApprovedAt: {
      type: Date,
    },
    departmentRejectedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    departmentRejectedAt: {
      type: Date,
    },
    departmentComments: {
      type: String,
    },
    // HR approval tracking (for working tools only)
    hrApprovedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    hrApprovedAt: {
      type: Date,
    },
    hrRejectedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    hrRejectedAt: {
      type: Date,
    },
    hrComments: {
      type: String,
    },
    // HHRA fields kept for backward compatibility - deprecated
    hhraApprovedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    hhraApprovedAt: {
      type: Date,
    },
    hhraRejectedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    hhraRejectedAt: {
      type: Date,
    },
    hhraComments: {
      type: String,
    },
    procurementComments: {
      type: String,
    },
    // RFQ reference for this item (replaces bidding/vendor selection)
    rfq: {
      type: Schema.Types.ObjectId,
      ref: "RFQ",
    },
    // @deprecated - Bidding-specific fields - kept for backward compatibility
    // selectedVendorsForItem: [
    //   {
    //     type: Schema.Types.ObjectId,
    //     ref: "Vendor",
    //   },
    // ],
    // Purchase order reference for this item
    purchaseOrder: {
      type: Schema.Types.ObjectId,
      ref: "PurchaseOrder",
    },
  },
  {
    _id: true, // Enable _id for subdocuments so each item can be independently tracked
    timestamps: true,
  }
);

export default itemSchema;
