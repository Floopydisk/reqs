import mongoose, { Document, Schema } from "mongoose";
import { RequisitionStatus } from "../types/enums";

// Requisition history interface
export interface IRequisitionHistory extends Document {
  requisition: mongoose.Types.ObjectId;
  action: string;
  status: RequisitionStatus;
  user: mongoose.Types.ObjectId;
  details?: string;
  createdAt: Date;
}

// Requisition history schema
const RequisitionHistorySchema = new Schema<IRequisitionHistory>(
  {
    requisition: {
      type: Schema.Types.ObjectId,
      ref: "Requisition",
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "created",
        "updated",
        "deleted",
        "submitted",
        "approved",
        "rejected",
        "bidding_initiated",
        "moved_to_hr",
        "hr_approved",
        "hr_rejected",
        "accounts_approved",
        "accounts_rejected",
        "cancelled",
        "attachment_added",
        "bid_selected",
        "po_generated",
        "delivered",
        "completed",
      ],
    },
    status: {
      type: String,
      enum: Object.values(RequisitionStatus),
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    details: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better query performance
RequisitionHistorySchema.index({ requisition: 1 });
RequisitionHistorySchema.index({ user: 1 });
RequisitionHistorySchema.index({ createdAt: 1 });

export default mongoose.model<IRequisitionHistory>(
  "RequisitionHistory",
  RequisitionHistorySchema
);