import mongoose, { Document, Schema } from "mongoose";
import { PurchaseOrderStatus } from "../types/enums";
import { generateSequentialId } from "../utils/idGenerator";
import { syncPurchaseOrderToPostgres } from "../utils/pgSync";

export interface PurchaseOrderItem {
  itemId?: mongoose.Types.ObjectId; // Reference to item in requisition
  itemDescription: string; // Item Name + Brand
  detailsSpecification?: string;
  quantity: number;
  uom: string;
  brand?: string;
  unitPrice: number;
  totalPrice: number;
  lineType?: string;
}

export interface PurchaseOrderAttachment {
  name: string;
  url: string;
  uploadedAt: Date;
}

export interface PurchaseOrderApproval {
  approver: mongoose.Types.ObjectId;
  approverRole: "hof" | "hhr"; // Head of Finance or Head of HR
  status?: "pending" | "approved" | "rejected";
  approvedAt?: Date;
  rejectedAt?: Date;
  feedback?: string;
  reason?: string;
}

export interface PurchaseOrderQuote {
  vendor?: mongoose.Types.ObjectId;
  filename: string;
  url: string;
  mimeType?: string;
  size?: number;
  uploadedAt: Date;
  uploadedBy?: mongoose.Types.ObjectId;
}

export interface IPurchaseOrder extends Document {
  poNumber: string;
  title?: string;
  requisition: mongoose.Types.ObjectId;
  rfq: mongoose.Types.ObjectId; // New: links to RFQ
  vendor: mongoose.Types.ObjectId; // Reference to Vendor Master
  items: PurchaseOrderItem[];
  subtotal?: number;
  discount?: number;
  discountType?: "fixed" | "percentage";
  discountAmount?: number;
  vat?: number;
  vatRate?: number;
  vatAmount?: number;
  totalAmount: number;
  totalPrice?: number;
  deliveryLocation: mongoose.Types.ObjectId;
  deliveryDate: Date;
  deliveryContact: mongoose.Types.ObjectId; // Staff member
  deliveryAddressSnapshot?: {
    name: string;
    address?: string;
    contactPerson?: string;
    phoneNumber?: string;
    email?: string;
  };
  shipping: string; // Dropdown value
  generalTerms: string;
  evaluationCriteria?: string;
  termsOfService?: string;
  paymentTerms?: string;
  quoteUrl?: string; // Uploaded vendor quote
  vendorQuote?: string; // Uploaded vendor quote (alias)
  vendorQuotes?: PurchaseOrderQuote[];
  approvals: PurchaseOrderApproval[];
  status: PurchaseOrderStatus;
  createdBy: mongoose.Types.ObjectId; // PM who created it
  submittedBy?: mongoose.Types.ObjectId; // PM who submitted it for approval
  submittedAt?: Date;
  pdfUrl?: string; // Generated PO PDF
  serviceClassificationOverride?: string;
  serviceClassificationReason?: string;
  createdAt: Date;
  updatedAt: Date;
  // @deprecated fields - kept for backward compatibility
  bid?: mongoose.Types.ObjectId;
  notes?: string;
  issuedBy?: mongoose.Types.ObjectId;
  issuedAt?: Date;
  acknowledgedBy?: mongoose.Types.ObjectId | string;
  acknowledgedAt?: Date;
  attachments?: PurchaseOrderAttachment[];
}

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    poNumber: {
      type: String,
    },
    title: {
      type: String,
      trim: true,
    },
    requisition: {
      type: Schema.Types.ObjectId,
      ref: "Requisition",
      required: true,
    },
    rfq: {
      type: Schema.Types.ObjectId,
      ref: "RFQ",
      required: true,
    },
    vendor: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    items: [
      {
        itemId: {
          type: Schema.Types.ObjectId,
        },
        itemDescription: {
          type: String,
          required: true,
        },
        detailsSpecification: {
          type: String,
          default: "",
        },
        quantity: {
          type: Number,
          required: true,
          min: 0,
        },
        uom: {
          type: String,
          required: true,
        },
        brand: {
          type: String,
        },
        unitPrice: {
          type: Number,
          required: true,
          min: 0,
        },
        totalPrice: {
          type: Number,
          required: true,
          min: 0,
        },
        lineType: {
          type: String,
          default: "requisition",
        },
      },
    ],
    subtotal: {
      type: Number,
      min: 0,
    },
    discount: {
      type: Number,
      min: 0,
      default: 0,
    },
    discountType: {
      type: String,
      enum: ["fixed", "percentage"],
      default: "fixed",
    },
    discountAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    vat: {
      type: Number,
      min: 0,
      default: 0,
    },
    vatRate: {
      type: Number,
      min: 0,
      default: 0,
    },
    vatAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryLocation: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },
    deliveryDate: {
      type: Date,
      required: true,
    },
    deliveryContact: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deliveryAddressSnapshot: {
      name: { type: String },
      address: { type: String },
      contactPerson: { type: String },
      phoneNumber: { type: String },
      email: { type: String },
    },
    shipping: {
      type: String,
      required: true,
    },
    generalTerms: {
      type: String,
      default: "",
    },
    termsOfService: {
      type: String,
      default: "",
    },
    paymentTerms: {
      type: String,
      default: "",
    },
    quoteUrl: {
      type: String,
    },
    vendorQuote: {
      type: String,
    },
    vendorQuotes: [
      {
        vendor: {
          type: Schema.Types.ObjectId,
          ref: "Vendor",
        },
        filename: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        mimeType: {
          type: String,
        },
        size: {
          type: Number,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
        uploadedBy: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    approvals: [
      {
        approver: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        approverRole: {
          type: String,
          enum: ["hof", "hhr"],
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
        approvedAt: {
          type: Date,
        },
        rejectedAt: {
          type: Date,
        },
        feedback: {
          type: String,
        },
        reason: {
          type: String,
        },
      },
    ],
    serviceClassificationOverride: {
      type: String,
    },
    serviceClassificationReason: {
      type: String,
    },
    status: {
      type: String,
      enum: Object.values(PurchaseOrderStatus),
      default: PurchaseOrderStatus.DRAFT,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    submittedAt: {
      type: Date,
    },
    pdfUrl: {
      type: String,
    },
    // @deprecated fields - kept for backward compatibility
    bid: {
      type: Schema.Types.ObjectId,
      ref: "Bid",
    },
    notes: {
      type: String,
    },
    issuedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    issuedAt: {
      type: Date,
    },
    acknowledgedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    acknowledgedAt: {
      type: Date,
    },
    attachments: [
      {
        name: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Generate PO number before saving
PurchaseOrderSchema.pre("save", async function (next) {
  if (!this.poNumber) {
    const year = new Date().getFullYear().toString().substr(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, "0");
    this.poNumber = await generateSequentialId("PO", `${year}${month}`);
  }
  next();
});

// Add indexes for better query performance
PurchaseOrderSchema.index({ poNumber: 1 }, { unique: true });
PurchaseOrderSchema.index({ requisition: 1 });
PurchaseOrderSchema.index({ rfq: 1 });
PurchaseOrderSchema.index({ status: 1 });
PurchaseOrderSchema.index({ createdAt: 1 });

PurchaseOrderSchema.post("save", async function (doc, next) {
  try {
    await syncPurchaseOrderToPostgres(doc);
  } catch (err) {
    console.error("PG Sync error (PO save):", err);
  }
  next();
});

PurchaseOrderSchema.post("findOneAndUpdate", async function (doc, next) {
  if (doc) {
    try {
      await syncPurchaseOrderToPostgres(doc);
    } catch (err) {
      console.error("PG Sync error (PO findOneAndUpdate):", err);
    }
  }
  next();
});

export default mongoose.model<IPurchaseOrder>(
  "PurchaseOrder",
  PurchaseOrderSchema,
);
