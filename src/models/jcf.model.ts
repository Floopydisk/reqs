import mongoose, { Schema, Document } from "mongoose";
import { JCFStatus } from "../types/enums";
import { generateSequentialId } from "../utils/idGenerator";

export interface IJCFApproval {
  approver: mongoose.Types.ObjectId;
  status: "pending" | "approved" | "rejected";
  comments?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
}

export interface IJCF extends Document {
  jcfNumber: string;
  purchaseOrder: mongoose.Types.ObjectId;
  requisition: mongoose.Types.ObjectId;
  vendor: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  approver: mongoose.Types.ObjectId;
  serviceDescription: string;
  completionEvidence?: string;
  rating?: number;
  status: JCFStatus;
  approval?: IJCFApproval;
  attachments?: {
    name: string;
    url: string;
    uploadedAt: Date;
  }[];
  pdfUrl?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const jcfApprovalSchema = new Schema<IJCFApproval>(
  {
    approver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    comments: {
      type: String,
      trim: true,
    },
    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
  },
  { _id: false }
);

const jcfSchema = new Schema<IJCF>(
  {
    jcfNumber: {
      type: String,
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
    vendor: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    serviceDescription: {
      type: String,
      required: [true, "Service description is required"],
      trim: true,
    },
    completionEvidence: {
      type: String,
      trim: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    status: {
      type: String,
      enum: Object.values(JCFStatus),
      default: JCFStatus.DRAFT,
    },
    approval: {
      type: jcfApprovalSchema,
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
    pdfUrl: {
      type: String,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

jcfSchema.pre("save", async function (next) {
  if (!this.jcfNumber) {
    const year = new Date().getFullYear().toString().substr(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, "0");
    this.jcfNumber = await generateSequentialId("JCF", `${year}${month}`);
  }
  next();
});

jcfSchema.index({ purchaseOrder: 1 });
jcfSchema.index({ status: 1 });
jcfSchema.index({ requisition: 1 });

const JCF = mongoose.model<IJCF>("JCF", jcfSchema);

export default JCF;
