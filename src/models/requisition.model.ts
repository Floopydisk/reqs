import { syncRequisitionToPostgres } from "../utils/pgSync";
import mongoose, { Schema } from "mongoose";
import { IRequisition } from "../types/interfaces";
import {
  RequisitionStatus,
  RequisitionUrgency,
  // RequisitionPriority,
} from "../types/enums";
import itemSchema from "./item.model";

const requisitionSchema = new Schema<IRequisition>(
  {
    requisitionNumber: {
      type: String,
      required: [true, "Requisition number is required"],
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    urgency: {
      type: String,
      enum: Object.values(RequisitionUrgency),
      required: false,
    },
    justification: {
      type: String,
      required: [true, "Justification is required"],
      trim: true,
    },
    deliveryLocation: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      required: [true, "Delivery location is required"],
    },
    deliveryDate: {
      type: Date,
      required: [true, "Delivery date is required"],
    },
    items: {
      type: [itemSchema],
      required: true,
    },
    requester: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Requester is required"],
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department is required"],
    },
    assignedApprover: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: Object.values(RequisitionStatus),
      default: RequisitionStatus.DRAFT,
    },
    requestApprovedAt: {
      type: Date,
    },
    poApprovedAt: {
      type: Date,
    },
    // @deprecated - vendorCategory removed in new workflow
    // Vendor categories no longer used; vendors selected during RFQ generation
    // vendorCategory: {
    //   type: Schema.Types.ObjectId,
    //   ref: "VendorCategory",
    //   required: false,
    // },
    additionalInfo: {
      type: String,
      required: false,
    },
    // Payment tracking fields
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partially_paid", "fully_paid"],
      default: "unpaid",
    },
    paymentAmount: {
      type: Number,
      default: 0,
    },
    paymentDate: {
      type: Date,
    },
    paymentReference: {
      type: String,
    },
    paymentNotes: {
      type: String,
    },
    paymentBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvals: [
      {
        stage: {
          type: String,
          required: true,
        },
        approver: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        status: {
          type: String,
          enum: ["approved", "rejected", "pending"],
          required: true,
        },
        comments: {
          type: String,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    relatedRfqs: [
      {
        type: Schema.Types.ObjectId,
        ref: "RFQ",
      },
    ],
    relatedPos: [
      {
        type: Schema.Types.ObjectId,
        ref: "PurchaseOrder",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Generate requisition number before saving
requisitionSchema.pre("validate", async function (this: IRequisition, next) {
  if (this.isNew && !this.requisitionNumber) {
    const count = await mongoose.model("Requisition").countDocuments();
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    this.requisitionNumber = `REQ-${year}${month}-${(count + 1)
      .toString()
      .padStart(4, "0")}`;
  }
  next();
});





// Sync to Postgres on save
requisitionSchema.post("save", async function (doc, next) {
  try {
    await syncRequisitionToPostgres(doc);
  } catch (err) {
    console.error("PG Sync error (save):", err);
  }
  next();
});

// Sync to Postgres on findOneAndUpdate
requisitionSchema.post("findOneAndUpdate", async function (doc, next) {
  if (doc) {
    try {
      await syncRequisitionToPostgres(doc);
    } catch (err) {
      console.error("PG Sync error (findOneAndUpdate):", err);
    }
  }
  next();
});

export default mongoose.model<IRequisition>("Requisition", requisitionSchema);
