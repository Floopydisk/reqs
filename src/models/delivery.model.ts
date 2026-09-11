import mongoose, { Schema, Document } from "mongoose";
import { DeliveryStatus } from "../types/enums";
import {
  IInventoryConfirmation,
  IDepartmentConfirmation,
} from "../types/deliveryExtensions";
import { syncDeliveryToPostgres } from "../utils/pgSync";

export interface IDeliveryItem {
  _id: any;
  poItem: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  deliveredQuantity: number;
  condition: string;
  notes: string;
}

export interface IAttachment {
  name: string;
  url: string;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
}

export interface IConfirmation {
  confirmedBy: mongoose.Types.ObjectId;
  confirmedAt: Date;
  notes: string;
}

export interface IVerification {
  verifiedBy: mongoose.Types.ObjectId;
  verifiedAt: Date;
  notes: string;
}

export interface IDelivery extends Document {
  deliveryNumber: string;
  purchaseOrder: mongoose.Types.ObjectId;
  requisition: mongoose.Types.ObjectId;
  vendor: mongoose.Types.ObjectId;
  items: IDeliveryItem[];
  status: DeliveryStatus;
  scheduledDate: Date;
  deliveryDate: Date;
  receivedBy?: mongoose.Types.ObjectId;
  receivedAt?: Date;
  notes?: string;
  trackingNumber?: string;
  carrier?: string;
  attachments: IAttachment[];
  requesterVerification?: IVerification & {
    quantityCorrect: boolean;
    qualityMeetingRequirements: boolean;
    images?: IAttachment[];
  };
  hodApproval?: IVerification & {
    approved: boolean;
  };
  pmNotification?: {
    notifiedBy: mongoose.Types.ObjectId;
    notifiedAt: Date;
    message: string;
    expectedDeliveryDate: Date;
  };
  inventoryVerification?: IVerification;
  departmentVerification?: IVerification;
  inventoryConfirmation?: IInventoryConfirmation;
  departmentConfirmation?: IDepartmentConfirmation;
  createdAt: Date;
  updatedAt: Date;
}

const DeliverySchema: Schema = new Schema(
  {
    deliveryNumber: {
      type: String,
      required: true,
      unique: true,
    },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
    },
    requisition: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Requisition",
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(DeliveryStatus),
      default: DeliveryStatus.PENDING,
    },
    items: [
      {
        poItem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "PurchaseOrderItem",
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        deliveredQuantity: {
          type: Number,
          default: 0,
        },
        condition: {
          type: String,
          enum: ["excellent", "good", "fair", "damaged", "missing"],
          default: "good",
        },
        notes: {
          type: String,
          default: "",
        },
      },
    ],
    // Removed duplicate status field
    scheduledDate: {
      type: Date,
      required: true,
    },
    deliveryDate: {
      type: Date,
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    receivedAt: {
      type: Date,
    },
    notes: {
      type: String,
    },
    trackingNumber: {
      type: String,
    },
    carrier: {
      type: String,
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
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    inventoryVerification: {
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      verifiedAt: {
        type: Date,
      },
      notes: {
        type: String,
      },
    },
    departmentVerification: {
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      verifiedAt: {
        type: Date,
      },
      notes: {
        type: String,
      },
    },
    requesterVerification: {
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      verifiedAt: {
        type: Date,
      },
      notes: {
        type: String,
      },
      quantityCorrect: {
        type: Boolean,
      },
      qualityMeetingRequirements: {
        type: Boolean,
      },
      images: [
        {
          name: {
            type: String,
            required: true,
          },
          url: {
            type: String,
            required: true,
          },
          uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          uploadedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
    hodApproval: {
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      verifiedAt: {
        type: Date,
      },
      notes: {
        type: String,
      },
      approved: {
        type: Boolean,
      },
    },
    pmNotification: {
      notifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      notifiedAt: {
        type: Date,
      },
      message: {
        type: String,
      },
      expectedDeliveryDate: {
        type: Date,
      },
    },
    inventoryConfirmation: {
      confirmedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      confirmedAt: {
        type: Date,
      },
      notes: {
        type: String,
      },
    },
    departmentConfirmation: {
      confirmedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      confirmedAt: {
        type: Date,
      },
      notes: {
        type: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Generate delivery number before saving
DeliverySchema.pre("save", async function (next) {
  if (!this.isNew) {
    return next();
  }

  try {
    // Generate a unique delivery number (e.g., DEL-YYYY-XXXX)
    const year = new Date().getFullYear();
    const count = await mongoose.model("Delivery").countDocuments();
    const sequenceNumber = (count + 1).toString().padStart(4, "0");
    this.deliveryNumber = `DEL-${year}-${sequenceNumber}`;
    next();
  } catch (error) {
    next(error as Error);
  }
});

DeliverySchema.post("save", async function (doc, next) {
  try {
    await syncDeliveryToPostgres(doc);
  } catch (err) {
    console.error("PG Sync error (delivery save):", err);
  }
  next();
});

DeliverySchema.post("findOneAndUpdate", async function (doc, next) {
  if (doc) {
    try {
      await syncDeliveryToPostgres(doc);
    } catch (err) {
      console.error("PG Sync error (delivery findOneAndUpdate):", err);
    }
  }
  next();
});

export default mongoose.model<IDelivery>("Delivery", DeliverySchema);
