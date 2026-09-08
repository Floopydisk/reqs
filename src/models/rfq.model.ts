import mongoose, { Schema, Document } from "mongoose";
import { RFQStatus } from "../types/enums";

export interface IRFQItem {
  itemId: mongoose.Types.ObjectId; // Reference to item in requisition
  itemDescription: string; // Item Name + Brand
  detailedSpecification: string; // From item description
  uom: string;
  quantity: number;
  expectedDeliveryDate: Date;
  // Quote fields (filled by vendor/PM after quote received)
  quotedUnitPrice?: number;
  quotedTotalPrice?: number;
  vendorComments?: string;
}

export interface IRFQ extends Document {
  rfqNumber: string;
  title: string;
  requisition: mongoose.Types.ObjectId;
  vendors: mongoose.Types.ObjectId[]; // RFQ tied to one or many vendors
  vendor: mongoose.Types.ObjectId; // Backward compatibility (primary vendor)
  relatedPos?: mongoose.Types.ObjectId[];
  items: IRFQItem[];
  evaluationCriteria: string;
  termsAndConditions: string;
  deliveryLocation: mongoose.Types.ObjectId;
  expectedDeliveryDate?: Date;
  status: RFQStatus;
  createdBy: mongoose.Types.ObjectId;
  issuedAt?: Date;
  // Quote tracking fields
  quoteReceivedAt?: Date;
  quoteDocument?: string; // S3 URL for uploaded quote
  quoteTotalAmount?: number; // Total quoted price across all items
  quoteValidUntil?: Date; // Quote validity/expiry date
  quoteNotes?: string; // General notes about the quote
  createdAt: Date;
  updatedAt: Date;
}

const rfqItemSchema = new Schema<IRFQItem>(
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
    detailedSpecification: {
      type: String,
      required: true,
      trim: true,
    },
    uom: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    expectedDeliveryDate: {
      type: Date,
      required: true,
    },
    // Quote fields
    quotedUnitPrice: {
      type: Number,
      min: 0,
    },
    quotedTotalPrice: {
      type: Number,
      min: 0,
    },
    vendorComments: {
      type: String,
      trim: true,
    },
  },
  { _id: false },
);

const rfqSchema = new Schema<IRFQ>(
  {
    rfqNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    requisition: {
      type: Schema.Types.ObjectId,
      ref: "Requisition",
      required: true,
    },
    vendors: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "Vendor",
          required: true,
        },
      ],
      required: false, // Will be populated during RFQ creation
      default: [],
    },
    vendor: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: false, // Optional - will be set to first vendor from vendors array
    },
    relatedPos: [
      {
        type: Schema.Types.ObjectId,
        ref: "PurchaseOrder",
      },
    ],
    items: {
      type: [rfqItemSchema],
      required: true,
      validate: {
        validator: function (v: IRFQItem[]) {
          return v && v.length > 0;
        },
        message: "At least one item is required for an RFQ",
      },
    },
    evaluationCriteria: {
      type: String,
      trim: true,
      default: "",
    },
    termsAndConditions: {
      type: String,
      trim: true,
      default: "",
    },
    deliveryLocation: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },
    expectedDeliveryDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(RFQStatus),
      default: RFQStatus.DRAFT,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    issuedAt: {
      type: Date,
    },
    // Quote tracking fields
    quoteReceivedAt: {
      type: Date,
    },
    quoteDocument: {
      type: String, // S3 URL
      trim: true,
    },
    quoteTotalAmount: {
      type: Number,
      min: 0,
    },
    quoteValidUntil: {
      type: Date,
    },
    quoteNotes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for faster queries
// Note: rfqNumber already has unique index from schema definition
rfqSchema.index({ requisition: 1, vendors: 1 });
rfqSchema.index({ requisition: 1, vendor: 1 });
rfqSchema.index({ status: 1 });

// Pre-save hook to auto-populate vendor field from vendors array if not set
rfqSchema.pre("save", function (next) {
  if (this.rfqNumber) {
    this.rfqNumber = this.rfqNumber.trim();
  }

  if (!this.vendor && this.vendors && this.vendors.length > 0) {
    this.vendor = this.vendors[0];
  }
  next();
});

const RFQ = mongoose.model<IRFQ>("RFQ", rfqSchema);

export default RFQ;
