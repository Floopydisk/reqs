import mongoose, { Schema } from "mongoose";
import { IItemHistory } from "../types/interfaces";

const itemHistorySchema = new Schema<IItemHistory>(
  {
    requisitionId: {
      type: Schema.Types.ObjectId,
      ref: "Requisition",
      required: true,
    },
    itemId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "created",
        "updated",
        "department_approved",
        "department_rejected",
        "hhra_approved",
        "hhra_rejected",
        "vendor_selected",
        "po_generated",
        "delivered",
        "completed",
        "cancelled",
      ],
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    previousStatus: {
      type: String,
    },
    newStatus: {
      type: String,
    },
    comments: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
itemHistorySchema.index({ requisitionId: 1, itemId: 1, createdAt: -1 });

const ItemHistory = mongoose.model<IItemHistory>(
  "ItemHistory",
  itemHistorySchema
);

export default ItemHistory;
