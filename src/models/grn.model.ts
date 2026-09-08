import mongoose, { Schema, Document } from "mongoose";
import { GRNStatus } from "../types/enums";

export interface IGRNItem {
  itemId: mongoose.Types.ObjectId; // Reference to item in PO
  itemDescription: string;
  quantityOrdered: number;
  quantityReceived: number;
  uom: string;
  condition: string; // Good, Damaged, etc.
  remarks?: string;
  // Validation fields
  unitPriceFromPO?: number; // Expected unit price from PO
  totalPriceFromPO?: number; // Expected total price from PO
  quantityVariance?: number; // Difference between ordered and received
  hasQuantityDiscrepancy?: boolean; // Flag for quantity mismatch
}

export interface IGRNApproval {
  approver: mongoose.Types.ObjectId;
  approverRole: string; // "receiver" | "pm"
  status: "pending" | "approved" | "rejected";
  approvedAt?: Date;
  comments?: string;
}

export interface IGRN extends Document {
  grnNumber: string;
  purchaseOrder: mongoose.Types.ObjectId;
  requisition: mongoose.Types.ObjectId;
  items: IGRNItem[];
  generalRemarks?: string;
  // Approval chain: Store Manager creates -> Receiver confirms -> PM final confirmation
  createdBy: mongoose.Types.ObjectId; // Store Manager
  receiver: mongoose.Types.ObjectId; // Defaults to requester, can be edited
  approvals: IGRNApproval[];
  status: GRNStatus;
  deliveredAt?: Date; // Final confirmation timestamp
  createdAt: Date;
  updatedAt: Date;
}

const grnItemSchema = new Schema<IGRNItem>(
  {
    itemId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    itemDescription: {
      type: String,
      required: true,
      trim: true,
    },
    quantityOrdered: {
      type: Number,
      required: true,
      min: 0,
    },
    quantityReceived: {
      type: Number,
      required: true,
      min: 0,
    },
    uom: {
      type: String,
      required: true,
    },
    condition: {
      type: String,
      required: true,
      enum: ["Good", "Damaged", "Partial", "Other"],
      default: "Good",
    },
    remarks: {
      type: String,
      trim: true,
    },
    // Validation fields
    unitPriceFromPO: {
      type: Number,
      min: 0,
    },
    totalPriceFromPO: {
      type: Number,
      min: 0,
    },
    quantityVariance: {
      type: Number,
    },
    hasQuantityDiscrepancy: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const grnApprovalSchema = new Schema<IGRNApproval>(
  {
    approver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approverRole: {
      type: String,
      required: true,
      enum: ["receiver", "pm"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedAt: {
      type: Date,
    },
    comments: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const grnSchema = new Schema<IGRN>(
  {
    grnNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    purchaseOrder: {
      type: Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
    },
    requisition: {
      type: Schema.Types.ObjectId,
      ref: "Requisition",
      required: true,
    },
    items: {
      type: [grnItemSchema],
      required: true,
      validate: {
        validator: function (v: IGRNItem[]) {
          return v && v.length > 0;
        },
        message: "At least one item is required for a GRN",
      },
    },
    generalRemarks: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvals: {
      type: [grnApprovalSchema],
      default: [],
    },
    status: {
      type: String,
      enum: Object.values(GRNStatus),
      default: GRNStatus.DRAFT,
    },
    deliveredAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Generate GRN number before saving
grnSchema.pre("save", async function (next) {
  if (this.isNew && !this.grnNumber) {
    const count = await mongoose.model("GRN").countDocuments();
    this.grnNumber = `GRN-${String(count + 1).padStart(6, "0")}`;
  }
  next();
});

// Indexes for faster queries
// Note: grnNumber already has unique index from schema definition
grnSchema.index({ purchaseOrder: 1 });
grnSchema.index({ status: 1 });
grnSchema.index({ requisition: 1 });

const GRN = mongoose.model<IGRN>("GRN", grnSchema);

export default GRN;
